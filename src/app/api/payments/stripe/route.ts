import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, premiumSubscriptions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Stripe Webhook Handler
 * Receives Stripe webhook events for payment confirmation.
 * In production, verify the webhook signature using Stripe's signing secret.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body;

    // In production, verify webhook signature:
    // const sig = req.headers.get("stripe-signature");
    // const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const paymentId = session.metadata?.paymentId;

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
            gatewayTransactionId: session.payment_intent || session.id,
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

        break;
      }

      case "invoice.payment_failed": {
        // Handle failed recurring payments
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        // Could send notification to user about failed payment
        console.warn(`Payment failed for customer: ${customerEmail}`);
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
