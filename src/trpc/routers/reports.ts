import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { reports, users } from "@/db/schema";
import { rateLimit, REPORT_RATE_LIMIT } from "@/lib/rate-limit";
import { TRPCError } from "@trpc/server";

export const reportsRouter = createTRPCRouter({
  // Create a report
  create: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(["video", "comment", "user"]),
        targetId: z.string().uuid(),
        reason: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rl = rateLimit(ctx.user.id, "report", REPORT_RATE_LIMIT);
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many reports. Try again in ${Math.ceil(rl.resetInSeconds / 60)} min.`,
        });
      }

      // Check if user already reported this target
      const existing = await ctx.db
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.reporterId, ctx.user.id),
            eq(reports.targetId, input.targetId),
            eq(reports.targetType, input.targetType)
          )
        )
        .limit(1);

      if (existing[0]) {
        throw new Error("You have already reported this content");
      }

      const newReport = await ctx.db
        .insert(reports)
        .values({
          reporterId: ctx.user.id,
          ...input,
        })
        .returning();

      return newReport[0];
    }),

  // Get all reports (admin)
  getAll: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().default(0),
        status: z
          .enum(["all", "pending", "reviewed", "resolved", "dismissed"])
          .default("pending"),
        targetType: z.enum(["all", "video", "comment", "user"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(reports.status, input.status));
      }
      if (input.targetType !== "all") {
        conditions.push(eq(reports.targetType, input.targetType));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const allReports = await ctx.db
        .select({
          id: reports.id,
          targetType: reports.targetType,
          targetId: reports.targetId,
          reason: reports.reason,
          description: reports.description,
          status: reports.status,
          createdAt: reports.createdAt,
          resolvedAt: reports.resolvedAt,
          resolvedNote: reports.resolvedNote,
          reporter: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(reports)
        .innerJoin(users, eq(reports.reporterId, users.id))
        .where(whereClause)
        .orderBy(desc(reports.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(whereClause);

      return {
        reports: allReports,
        total: Number(total?.count ?? 0),
      };
    }),

  // Resolve report (admin)
  resolve: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["resolved", "dismissed"]),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(reports)
        .set({
          status: input.status,
          resolvedBy: ctx.user.id,
          resolvedAt: new Date(),
          resolvedNote: input.note,
        })
        .where(eq(reports.id, input.id))
        .returning();

      return updated[0];
    }),

  // Get pending report count (admin)
  getPendingCount: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(eq(reports.status, "pending"));

    return Number(result[0]?.count ?? 0);
  }),
});
