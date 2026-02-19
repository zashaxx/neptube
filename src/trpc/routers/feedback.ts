import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { videoFeedback } from "@/db/schema";

export const feedbackRouter = createTRPCRouter({
  // Mark a video as "not interested"
  notInterested: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        type: z.enum(["not_interested", "dont_recommend_channel"]).default("not_interested"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert — if already exists, ignore
      const existing = await ctx.db
        .select({ id: videoFeedback.id })
        .from(videoFeedback)
        .where(
          and(
            eq(videoFeedback.userId, ctx.user.id),
            eq(videoFeedback.videoId, input.videoId)
          )
        )
        .limit(1);

      if (existing[0]) {
        return { success: true, existing: true };
      }

      await ctx.db.insert(videoFeedback).values({
        userId: ctx.user.id,
        videoId: input.videoId,
        type: input.type,
      });

      return { success: true, existing: false };
    }),

  // Undo "not interested"
  undoNotInterested: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(videoFeedback)
        .where(
          and(
            eq(videoFeedback.userId, ctx.user.id),
            eq(videoFeedback.videoId, input.videoId)
          )
        );
      return { success: true };
    }),

  // Get all dismissed video IDs for current user
  getDismissedVideoIds: protectedProcedure.query(async ({ ctx }) => {
    const dismissed = await ctx.db
      .select({ videoId: videoFeedback.videoId, type: videoFeedback.type })
      .from(videoFeedback)
      .where(eq(videoFeedback.userId, ctx.user.id));

    return dismissed;
  }),
});
