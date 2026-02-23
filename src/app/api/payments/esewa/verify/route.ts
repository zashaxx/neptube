import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, premiumSubscriptions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * eSewa Payment Verification Callback
 * 
 * After successful payment, eSewa redirects the user here (GET) with
 * a base64-encoded `data` query parameter containing payment details.
 * 
 * We decode it, verify the HMAC signature, confirm the payment,
 * activate the subscription, and redirect to the success page.
 */

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

// eSewa transaction status lookup URL
const ESEWA_STATUS_URL = process.env.ESEWA_ENVIRONMENT === "production"
  ? "https://epay.esewa.com.np/api/epay/transaction/status/"
  : "https://rc-epay.esewa.com.np/api/epay/transaction/status/";

function verifySignature(message: string, receivedSignature: string): boolean {
  const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
  hmac.update(message);
  const expectedSignature = hmac.digest("base64");
  return expectedSignature === receivedSignature;
}

interface EsewaResponseData {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // eSewa sends back a base64-encoded `data` parameter
    const dataParam = req.nextUrl.searchParams.get("data");

    if (!dataParam) {
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=no_data`);
    }

    // Decode the base64 response
    let responseData: EsewaResponseData;
    try {
      const decoded = Buffer.from(dataParam, "base64").toString("utf-8");
      responseData = JSON.parse(decoded);
    } catch {
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=invalid_data`);
    }

    const {
      transaction_code,
      status,
      total_amount,
      transaction_uuid,
      product_code,
      signed_field_names,
      signature,
    } = responseData;

    // 1. Verify the status
    if (status !== "COMPLETE") {
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=not_complete`);
    }

    // 2. Verify product code
    if (product_code !== ESEWA_PRODUCT_CODE) {
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=invalid_product`);
    }

    // 3. Verify HMAC signature
    const signedFields = signed_field_names.split(",");
    const fieldValues: Record<string, string> = {
      total_amount,
      transaction_uuid,
      product_code,
    };
    const signatureMessage = signedFields
      .map((field) => `${field}=${fieldValues[field]}`)
      .join(",");

    if (!verifySignature(signatureMessage, signature)) {
      console.error("eSewa signature verification failed");
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=signature_mismatch`);
    }

    // 4. Double-verify with eSewa's transaction status API
    try {
      const statusCheckUrl = `${ESEWA_STATUS_URL}?product_code=${ESEWA_PRODUCT_CODE}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`;
      const statusRes = await fetch(statusCheckUrl);
      const statusData = await statusRes.json();

      if (statusData.status !== "COMPLETE") {
        console.error("eSewa status check failed:", statusData);
        return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=status_check_failed`);
      }
    } catch (statusErr) {
      // Log but don't block — the HMAC signature already verified
      console.warn("eSewa status API check failed (non-blocking):", statusErr);
    }

    // 5. Find the payment record (transaction_uuid = paymentId)
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, transaction_uuid));

    if (!payment) {
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=payment_not_found`);
    }

    // 6. Verify amount matches
    const expectedAmount = payment.amount / 100; // paisa → rupees
    const receivedAmount = parseFloat(total_amount);
    if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
      console.error(`Amount mismatch: expected ${expectedAmount}, got ${receivedAmount}`);
      return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=amount_mismatch`);
    }

    // 7. Skip if already processed
    if (payment.status === "completed") {
      return NextResponse.redirect(`${baseUrl}/premium?payment=success&tier=${payment.tier}`);
    }

    // 8. Mark payment as completed
    await db
      .update(payments)
      .set({
        status: "completed",
        gatewayTransactionId: transaction_code,
        metadata: {
          esewa_status: status,
          esewa_total_amount: total_amount,
          esewa_transaction_code: transaction_code,
          verified_at: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // 9. Activate subscription
    if (payment.subscriptionId) {
      // Deactivate all existing active subscriptions
      await db
        .update(premiumSubscriptions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(premiumSubscriptions.userId, payment.userId),
            eq(premiumSubscriptions.isActive, true)
          )
        );

      // Activate the new subscription
      await db
        .update(premiumSubscriptions)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(premiumSubscriptions.id, payment.subscriptionId));
    }

    // 10. Update user's subscription tier
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await db
      .update(users)
      .set({
        subscriptionTier: payment.tier,
        subscriptionExpiry: endDate,
        lastPaymentAt: new Date(),
        premiumBadge: payment.tier !== "free",
        updatedAt: new Date(),
      })
      .where(eq(users.id, payment.userId));

    // 11. Redirect to success page
    return NextResponse.redirect(
      `${baseUrl}/premium?payment=success&tier=${payment.tier}&ref=${transaction_code}`
    );
  } catch (error) {
    console.error("eSewa verification error:", error);
    return NextResponse.redirect(`${baseUrl}/premium?payment=failed&reason=server_error`);
  }
}
