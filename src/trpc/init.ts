import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasMinTier, type SubscriptionTier } from "@/lib/premium";

export const createTRPCContext = cache(async () => {
  const { userId: clerkId } = await auth();

  // Get user from database if authenticated
  let user = null;
  if (clerkId) {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    user = dbUser[0] || null;
  }

  return {
    clerkId,
    user,
    db,
  };
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// Protected procedure - requires authentication and checks if banned
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clerkId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  // Check if user is banned
  if (ctx.user.isBanned) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account has been suspended. Please contact support for more information.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      clerkId: ctx.clerkId,
      user: ctx.user,
    },
  });
});

// Admin procedure - requires admin or moderator role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clerkId || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  if (ctx.user.role !== "admin" && ctx.user.role !== "moderator") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      clerkId: ctx.clerkId,
      user: ctx.user,
    },
  });
});

/**
 * Premium procedure factory - creates a procedure that requires a minimum subscription tier.
 * Usage: premiumProcedure("premium") or premiumProcedure("vip")
 */
export const createPremiumProcedure = (minTier: SubscriptionTier) =>
  t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.clerkId || !ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action",
      });
    }

    if (ctx.user.isBanned) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account has been suspended.",
      });
    }

    const isAdmin = ctx.user.role === "admin";
    const userTier: SubscriptionTier = isAdmin ? "vip" : ((ctx.user.subscriptionTier as SubscriptionTier) || "free");

    // Check if subscription has expired (admins never expire)
    if (!isAdmin && userTier !== "free" && ctx.user.subscriptionExpiry) {
      if (new Date() > ctx.user.subscriptionExpiry) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your subscription has expired. Please renew to access premium features.",
        });
      }
    }

    if (!hasMinTier(userTier, minTier)) {
      const tierNames: Record<string, string> = {
        lite: "Lite",
        premium: "Premium",
        vip: "VIP",
      };
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This feature requires a ${tierNames[minTier] || minTier} subscription or above.`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        clerkId: ctx.clerkId,
        user: ctx.user,
        subscriptionTier: userTier,
      },
    });
  });