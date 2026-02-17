import { z } from "zod";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { comments, users, videos, notifications } from "@/db/schema";
import { analyzeSentiment, analyzeToxicity } from "@/lib/ai";
import { rateLimit, COMMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { TRPCError } from "@trpc/server";

export const commentsRouter = createTRPCRouter({
  // Get comments for a video
  getByVideo: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const videoComments = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          likeCount: comments.likeCount,
          createdAt: comments.createdAt,
          parentId: comments.parentId,
          // ML fields
          sentiment: comments.sentiment,
          sentimentScore: comments.sentimentScore,
          isToxic: comments.isToxic,
          isHidden: comments.isHidden,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(
          and(
            eq(comments.videoId, input.videoId),
            isNull(comments.parentId),
            eq(comments.isHidden, false)
          )
        )
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);

      return videoComments;
    }),

  // Get replies for a comment
  getReplies: baseProcedure
    .input(
      z.object({
        parentId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const replies = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          likeCount: comments.likeCount,
          createdAt: comments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.parentId, input.parentId))
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);

      return replies;
    }),

  // Create comment
  create: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        content: z.string().min(1).max(2000),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rl = rateLimit(ctx.user.id, "comment", COMMENT_RATE_LIMIT);
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many comments. Try again in ${rl.resetInSeconds}s.`,
        });
      }

      // Run sentiment and toxicity analysis in parallel
      const [sentimentResult, toxicityResult] = await Promise.all([
        analyzeSentiment(input.content),
        analyzeToxicity(input.content),
      ]);

      const newComment = await ctx.db
        .insert(comments)
        .values({
          content: input.content,
          videoId: input.videoId,
          userId: ctx.user.id,
          parentId: input.parentId,
          // ML fields
          sentiment: sentimentResult.sentiment,
          sentimentScore: sentimentResult.score,
          isToxic: toxicityResult.isToxic,
          toxicityScore: toxicityResult.score,
          isHidden: toxicityResult.isToxic, // Auto-hide toxic comments
        })
        .returning();

      // Increment comment count on video
      await ctx.db
        .update(videos)
        .set({ commentCount: sql`${videos.commentCount} + 1` })
        .where(eq(videos.id, input.videoId));

      // Send notification to video owner (fire-and-forget)
      (async () => {
        try {
          const video = await ctx.db
            .select({ userId: videos.userId, title: videos.title })
            .from(videos)
            .where(eq(videos.id, input.videoId))
            .limit(1);

          if (video[0] && video[0].userId !== ctx.user.id) {
            if (input.parentId) {
              // Reply notification - notify the parent comment author
              const parentComment = await ctx.db
                .select({ userId: comments.userId })
                .from(comments)
                .where(eq(comments.id, input.parentId))
                .limit(1);

              if (parentComment[0] && parentComment[0].userId !== ctx.user.id) {
                await ctx.db.insert(notifications).values({
                  userId: parentComment[0].userId,
                  type: "reply",
                  title: "New reply",
                  message: `${ctx.user.name} replied to your comment`,
                  link: `/feed/${input.videoId}`,
                  fromUserId: ctx.user.id,
                  videoId: input.videoId,
                });
              }
            } else {
              // Comment notification to video owner
              await ctx.db.insert(notifications).values({
                userId: video[0].userId,
                type: "comment",
                title: "New comment",
                message: `${ctx.user.name} commented on "${video[0].title}"`,
                link: `/feed/${input.videoId}`,
                fromUserId: ctx.user.id,
                videoId: input.videoId,
              });
            }
          }
        } catch (err) {
          console.error("Failed to send comment notification:", err);
        }
      })();

      return newComment[0];
    }),

  // Update comment
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(comments)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(and(eq(comments.id, input.id), eq(comments.userId, ctx.user.id)))
        .returning();

      return updated[0];
    }),

  // Delete comment
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(comments)
        .where(and(eq(comments.id, input.id), eq(comments.userId, ctx.user.id)));

      return { success: true };
    }),

  // Like comment
  like: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(comments)
        .set({
          likeCount: sql`${comments.likeCount} + 1`,
        })
        .where(eq(comments.id, input.id));

      return { success: true };
    }),
});
