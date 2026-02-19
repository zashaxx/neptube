import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { watchHistory, videos, users } from "@/db/schema";

export const historyRouter = createTRPCRouter({
  // Get watch history for current user
  getMyHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const history = await ctx.db
        .select({
          id: watchHistory.id,
          watchedAt: watchHistory.watchedAt,
          watchDuration: watchHistory.watchDuration,
          video: {
            id: videos.id,
            title: videos.title,
            thumbnailURL: videos.thumbnailURL,
            duration: videos.duration,
            viewCount: videos.viewCount,
            createdAt: videos.createdAt,
          },
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(watchHistory)
        .innerJoin(videos, eq(watchHistory.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(watchHistory.userId, ctx.user.id))
        .orderBy(desc(watchHistory.watchedAt))
        .limit(input.limit)
        .offset(input.offset);

      return history;
    }),

  // Add to watch history (upsert - update if already exists)
  addToHistory: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        watchDuration: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if this video is already in history recently (last 5 minutes)
      const existing = await ctx.db
        .select()
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.userId, ctx.user.id),
            eq(watchHistory.videoId, input.videoId)
          )
        )
        .orderBy(desc(watchHistory.watchedAt))
        .limit(1);

      if (
        existing[0] &&
        Date.now() - new Date(existing[0].watchedAt).getTime() < 5 * 60 * 1000
      ) {
        // Update existing entry
        await ctx.db
          .update(watchHistory)
          .set({
            watchedAt: new Date(),
            watchDuration: input.watchDuration ?? existing[0].watchDuration,
          })
          .where(eq(watchHistory.id, existing[0].id));
        return { updated: true };
      }

      // Create new entry
      await ctx.db.insert(watchHistory).values({
        userId: ctx.user.id,
        videoId: input.videoId,
        watchDuration: input.watchDuration ?? 0,
      });

      return { added: true };
    }),

  // Clear watch history
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(watchHistory)
      .where(eq(watchHistory.userId, ctx.user.id));
    return { success: true };
  }),

  // Remove single item
  removeFromHistory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(watchHistory)
        .where(
          and(
            eq(watchHistory.id, input.id),
            eq(watchHistory.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // Get watch progress for a specific video (for resume)
  getWatchProgress: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db
        .select({
          watchDuration: watchHistory.watchDuration,
          watchedAt: watchHistory.watchedAt,
        })
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.userId, ctx.user.id),
            eq(watchHistory.videoId, input.videoId)
          )
        )
        .orderBy(desc(watchHistory.watchedAt))
        .limit(1);

      return entry[0] ?? null;
    }),

  // Update watch progress (lightweight, called periodically)
  updateProgress: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        watchDuration: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: watchHistory.id })
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.userId, ctx.user.id),
            eq(watchHistory.videoId, input.videoId)
          )
        )
        .orderBy(desc(watchHistory.watchedAt))
        .limit(1);

      if (existing[0]) {
        await ctx.db
          .update(watchHistory)
          .set({
            watchDuration: input.watchDuration,
            watchedAt: new Date(),
          })
          .where(eq(watchHistory.id, existing[0].id));
      } else {
        await ctx.db.insert(watchHistory).values({
          userId: ctx.user.id,
          videoId: input.videoId,
          watchDuration: input.watchDuration,
        });
      }

      return { success: true };
    }),
});
