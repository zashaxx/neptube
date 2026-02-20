import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, premiumSubscriptions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * PayPal Webhook Handler
 * Receives PayPal IPN or webhook events for payment confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, resource } = body;

    // In production, verify webhook signature with PayPal's verification API
    // https://developer.paypal.com/docs/api-basics/notifications/webhooks/

    if (event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const paymentId = resource.custom_id || resource.invoice_id;

      if (!paymentId) {
        return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
      }

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId));

      if (!payment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      await db
        .update(payments)
        .set({
          status: "completed",
          gatewayTransactionId: resource.id,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      if (payment.subscriptionId) {
        await db
          .update(premiumSubscriptions)
          .set({ isActive: false, updatedAt: new Date() })
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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
