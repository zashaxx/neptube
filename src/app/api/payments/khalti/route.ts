import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, premiumSubscriptions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Khalti Payment Verification Callback
 * After user completes payment on Khalti, we verify with Khalti API and activate subscription.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pidx, purchase_order_id, status } = body;

    if (status !== "Completed") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Verify with Khalti API
    const verifyResponse = await fetch("https://khalti.com/api/v2/epayment/lookup/", {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.status !== "Completed") {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // purchase_order_id is our paymentId
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, purchase_order_id));

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment
    await db
      .update(payments)
      .set({
        status: "completed",
        gatewayTransactionId: pidx,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Activate subscription
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Khalti webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
