import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, premiumSubscriptions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * eSewa Payment Verification Callback
 * eSewa redirects here after payment. We verify and activate the subscription.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, total_amount, transaction_uuid, status } = body;

    if (status !== "COMPLETE") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // product_id is the paymentId we passed to eSewa
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, product_id));

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify amount matches
    if (payment.amount !== Math.round(total_amount * 100)) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Update payment
    await db
      .update(payments)
      .set({
        status: "completed",
        gatewayTransactionId: transaction_uuid,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Activate subscription
    if (payment.subscriptionId) {
      await db
        .update(premiumSubscriptions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(premiumSubscriptions.userId, payment.userId),
            eq(premiumSubscriptions.isActive, true)
          )
        );

      await db
        .update(premiumSubscriptions)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(premiumSubscriptions.id, payment.subscriptionId));
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("eSewa webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
