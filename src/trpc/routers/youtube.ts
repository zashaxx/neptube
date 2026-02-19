import { z } from "zod";
import { eq, and, desc, isNull, sql, count } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import {
  searchYouTube,
  getTrendingYouTube,
  getYouTubeVideoById,
  isYouTubeConfigured,
} from "@/lib/youtube";
import {
  youtubeComments,
  youtubeVideoLikes,
  youtubeSubscriptions,
  users,
} from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { analyzeToxicity, containsProfanity } from "@/lib/ai";

export const youtubeRouter = createTRPCRouter({
  /**
   * Check if YouTube API is configured
   */
  isConfigured: baseProcedure.query(() => {
    return { configured: isYouTubeConfigured() };
  }),

  /**
   * Search YouTube videos
   */
  search: baseProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        maxResults: z.number().min(1).max(50).default(12),
        pageToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!isYouTubeConfigured()) {
        return { videos: [], nextPageToken: undefined };
      }
      return searchYouTube(input.query, input.maxResults, input.pageToken);
    }),

  /**
   * Get trending YouTube videos
   */
  trending: baseProcedure
    .input(
      z.object({
        maxResults: z.number().min(1).max(50).default(20),
        regionCode: z.string().length(2).default("US"),
        pageToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!isYouTubeConfigured()) {
        return { videos: [], nextPageToken: undefined };
      }
      return getTrendingYouTube(input.maxResults, input.regionCode, input.pageToken);
    }),

  /**
   * Get a single YouTube video by ID
   */
  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (!isYouTubeConfigured()) return null;
      return getYouTubeVideoById(input.id);
    }),

  // ─── NepTube-native interactions for YouTube videos ─────────────────────

  /**
   * Get NepTube comments for a YouTube video
   */
  getComments: baseProcedure
    .input(
      z.object({
        youtubeVideoId: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          id: youtubeComments.id,
          content: youtubeComments.content,
          likeCount: youtubeComments.likeCount,
          parentId: youtubeComments.parentId,
          createdAt: youtubeComments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(youtubeComments)
        .innerJoin(users, eq(youtubeComments.userId, users.id))
        .where(
          and(
            eq(youtubeComments.youtubeVideoId, input.youtubeVideoId),
            isNull(youtubeComments.parentId),
            eq(youtubeComments.isHidden, false)
          )
        )
        .orderBy(desc(youtubeComments.createdAt))
        .limit(input.limit);

      return result;
    }),

  /**
   * Get replies for a YouTube comment
   */
  getCommentReplies: baseProcedure
    .input(
      z.object({
        parentId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const replies = await ctx.db
        .select({
          id: youtubeComments.id,
          content: youtubeComments.content,
          likeCount: youtubeComments.likeCount,
          createdAt: youtubeComments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(youtubeComments)
        .innerJoin(users, eq(youtubeComments.userId, users.id))
        .where(eq(youtubeComments.parentId, input.parentId))
        .orderBy(desc(youtubeComments.createdAt))
        .limit(input.limit);

      return replies;
    }),

  /**
   * Add a comment on a YouTube video (NepTube-native)
   * Includes instant profanity filter + AI toxicity analysis
   */
  addComment: protectedProcedure
    .input(
      z.object({
        youtubeVideoId: z.string().min(1),
        content: z.string().min(1).max(2000),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ── Step 1: Instant local profanity check (zero latency) ──
      if (containsProfanity(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Your comment contains inappropriate language and has been blocked. Please keep the conversation respectful.",
        });
      }

      // ── Step 2: AI toxicity analysis ──
      let isToxic = false;
      let toxicityScore = 0;
      try {
        const toxResult = await analyzeToxicity(input.content);
        isToxic = toxResult.isToxic;
        toxicityScore = toxResult.score;
      } catch (err) {
        console.error("Toxicity analysis failed, allowing comment:", err);
      }

      // Block severely toxic comments outright
      if (toxicityScore >= 0.8) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Your comment was blocked because it contains toxic or hateful content. Please be respectful.",
        });
      }

      // Auto-hide moderately toxic comments (reviewable by admin later)
      const shouldHide = isToxic;

      const [newComment] = await ctx.db
        .insert(youtubeComments)
        .values({
          youtubeVideoId: input.youtubeVideoId,
          userId: ctx.user.id,
          content: input.content,
          parentId: input.parentId || null,
          isToxic,
          toxicityScore,
          isHidden: shouldHide,
        })
        .returning();

      return newComment;
    }),

  /**
   * Delete own comment
   */
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .select()
        .from(youtubeComments)
        .where(eq(youtubeComments.id, input.commentId))
        .limit(1);

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      if (comment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your comment" });
      }

      await ctx.db.delete(youtubeComments).where(eq(youtubeComments.id, input.commentId));
      return { success: true };
    }),

  /**
   * Toggle like/dislike on a YouTube video (NepTube-native)
   */
  toggleLike: protectedProcedure
    .input(
      z.object({
        youtubeVideoId: z.string().min(1),
        isLike: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(youtubeVideoLikes)
        .where(
          and(
            eq(youtubeVideoLikes.youtubeVideoId, input.youtubeVideoId),
            eq(youtubeVideoLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing[0]) {
        if (existing[0].isLike === input.isLike) {
          // Remove like/dislike (toggle off)
          await ctx.db
            .delete(youtubeVideoLikes)
            .where(eq(youtubeVideoLikes.id, existing[0].id));
          return { action: "removed" as const };
        } else {
          // Switch like <-> dislike
          await ctx.db
            .update(youtubeVideoLikes)
            .set({ isLike: input.isLike })
            .where(eq(youtubeVideoLikes.id, existing[0].id));
          return { action: "switched" as const };
        }
      } else {
        // Add new like/dislike
        await ctx.db.insert(youtubeVideoLikes).values({
          youtubeVideoId: input.youtubeVideoId,
          userId: ctx.user.id,
          isLike: input.isLike,
        });
        return { action: "added" as const };
      }
    }),

  /**
   * Get current user's like status for a YouTube video
   */
  getLikeStatus: protectedProcedure
    .input(z.object({ youtubeVideoId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(youtubeVideoLikes)
        .where(
          and(
            eq(youtubeVideoLikes.youtubeVideoId, input.youtubeVideoId),
            eq(youtubeVideoLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      return {
        isLiked: existing[0]?.isLike === true,
        isDisliked: existing[0]?.isLike === false,
      };
    }),

  /**
   * Get NepTube like/dislike counts for a YouTube video
   */
  getLikeCounts: baseProcedure
    .input(z.object({ youtubeVideoId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db
        .select({ count: count() })
        .from(youtubeVideoLikes)
        .where(
          and(
            eq(youtubeVideoLikes.youtubeVideoId, input.youtubeVideoId),
            eq(youtubeVideoLikes.isLike, true)
          )
        );

      const dislikes = await ctx.db
        .select({ count: count() })
        .from(youtubeVideoLikes)
        .where(
          and(
            eq(youtubeVideoLikes.youtubeVideoId, input.youtubeVideoId),
            eq(youtubeVideoLikes.isLike, false)
          )
        );

      return {
        likeCount: likes[0]?.count ?? 0,
        dislikeCount: dislikes[0]?.count ?? 0,
      };
    }),

  /**
   * Toggle subscribe to a YouTube channel (NepTube-native)
   */
  toggleSubscribe: protectedProcedure
    .input(
      z.object({
        youtubeChannelId: z.string().min(1),
        youtubeChannelTitle: z.string().min(1),
        youtubeChannelThumbnail: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(youtubeSubscriptions)
        .where(
          and(
            eq(youtubeSubscriptions.youtubeChannelId, input.youtubeChannelId),
            eq(youtubeSubscriptions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing[0]) {
        // Unsubscribe
        await ctx.db
          .delete(youtubeSubscriptions)
          .where(eq(youtubeSubscriptions.id, existing[0].id));
        return { subscribed: false };
      } else {
        // Subscribe
        await ctx.db.insert(youtubeSubscriptions).values({
          userId: ctx.user.id,
          youtubeChannelId: input.youtubeChannelId,
          youtubeChannelTitle: input.youtubeChannelTitle,
          youtubeChannelThumbnail: input.youtubeChannelThumbnail || null,
        });
        return { subscribed: true };
      }
    }),

  /**
   * Get subscription status for a YouTube channel
   */
  getSubscriptionStatus: protectedProcedure
    .input(z.object({ youtubeChannelId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(youtubeSubscriptions)
        .where(
          and(
            eq(youtubeSubscriptions.youtubeChannelId, input.youtubeChannelId),
            eq(youtubeSubscriptions.userId, ctx.user.id)
          )
        )
        .limit(1);

      return { subscribed: !!existing[0] };
    }),

  /**
   * Get comment count for a YouTube video (NepTube-native)
   */
  getCommentCount: baseProcedure
    .input(z.object({ youtubeVideoId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({ count: count() })
        .from(youtubeComments)
        .where(eq(youtubeComments.youtubeVideoId, input.youtubeVideoId));

      return { count: result[0]?.count ?? 0 };
    }),
});
