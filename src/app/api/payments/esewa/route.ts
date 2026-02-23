import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, premiumSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * eSewa ePay v2 Payment Integration
 * 
 * POST: Initiates payment — generates HMAC signature and returns form data
 *       for the client to POST to eSewa's payment page.
 * 
 * eSewa ePay v2 docs: https://developer.esewa.com.np/pages/Epay
 * 
 * ──────────────────────────────────────────────────────────
 * Test (Sandbox) Credentials:
 *   ESEWA_MERCHANT_CODE=EPAYTEST
 *   ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
 * 
 * Test eSewa Login:
 *   eSewa ID:  9806800001 (or 9806800002-5)
 *   Password:  Nepal@123
 *   MPIN:      1122
 *   OTP:       123456
 * ──────────────────────────────────────────────────────────
 */

const ESEWA_PAYMENT_URL = process.env.ESEWA_ENVIRONMENT === "production"
  ? "https://epay.esewa.com.np/api/epay/main/v2/form"
  : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

/**
 * Generate HMAC-SHA256 signature for eSewa ePay v2
 */
function generateSignature(message: string): string {
  const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
  hmac.update(message);
  return hmac.digest("base64");
}

/**
 * POST /api/payments/esewa
 * 
 * Accepts { paymentId } and returns the eSewa ePay v2 form data + payment URL.
 * The client creates a hidden form and submits it to redirect to eSewa.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    // Get the payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId));

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    // Get tier name from subscription
    let tierName = payment.tier || "premium";
    if (payment.subscriptionId) {
      const [sub] = await db
        .select()
        .from(premiumSubscriptions)
        .where(eq(premiumSubscriptions.id, payment.subscriptionId));
      if (sub) tierName = sub.tier;
    }

    // Amount in rupees (payment.amount is stored in paisa)
    const totalAmount = (payment.amount / 100).toString();
    const transactionUuid = payment.id; // Use paymentId as unique transaction ID

    // eSewa ePay v2 HMAC signature
    // Message format: total_amount=X,transaction_uuid=Y,product_code=Z
    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = generateSignature(signatureMessage);

    // Callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${baseUrl}/api/payments/esewa/verify`;
    const failureUrl = `${baseUrl}/premium?payment=failed&tier=${tierName}`;

    // Form data that will be POSTed to eSewa
    const formData = {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: signature,
    };

    return NextResponse.json({
      formData,
      paymentUrl: ESEWA_PAYMENT_URL,
      tier: tierName,
    });
  } catch (error) {
    console.error("eSewa initiation error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
