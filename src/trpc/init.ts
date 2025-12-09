import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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