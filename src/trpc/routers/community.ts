import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "../init";
import { communityPosts, pollOptions, pollVotes, communityPostLikes, communityPostComments, users, notifications, subscriptions } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { analyzeToxicity, detectNsfw, detectSpam } from "@/lib/ai";

export const communityRouter = createTRPCRouter({
  // Get posts for a channel (public)
  getByChannel: baseProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db
        .select({
          id: communityPosts.id,
          type: communityPosts.type,
          content: communityPosts.content,
          imageURL: communityPosts.imageURL,
          likeCount: communityPosts.likeCount,
          commentCount: communityPosts.commentCount,
          createdAt: communityPosts.createdAt,
          user: {
            id: users.id,
            clerkId: users.clerkId,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(communityPosts)
        .innerJoin(users, eq(communityPosts.userId, users.id))
        .where(eq(communityPosts.userId, input.userId))
        .orderBy(desc(communityPosts.createdAt))
        .limit(input.limit);

      // Fetch poll options for poll-type posts
      const postIds = posts.filter(p => p.type === "poll").map(p => p.id);
      const pollOptionsMap: Record<string, { id: string; text: string; voteCount: number }[]> = {};

      if (postIds.length > 0) {
        for (const postId of postIds) {
          const options = await ctx.db
            .select({
              id: pollOptions.id,
              text: pollOptions.text,
              voteCount: pollOptions.voteCount,
            })
            .from(pollOptions)
            .where(eq(pollOptions.postId, postId));
          pollOptionsMap[postId] = options;
        }
      }

      return posts.map(post => ({
        ...post,
        pollOptions: pollOptionsMap[post.id] || [],
      }));
    }),

  // Get community feed (own posts + posts from subscribed channels)
  getFeed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      // Always include the current user's own posts
      const ownPosts = await ctx.db
        .select({
          id: communityPosts.id,
          type: communityPosts.type,
          content: communityPosts.content,
          imageURL: communityPosts.imageURL,
          likeCount: communityPosts.likeCount,
          commentCount: communityPosts.commentCount,
          createdAt: communityPosts.createdAt,
          user: {
            id: users.id,
            clerkId: users.clerkId,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(communityPosts)
        .innerJoin(users, eq(communityPosts.userId, users.id))
        .where(eq(communityPosts.userId, ctx.user.id))
        .orderBy(desc(communityPosts.createdAt))
        .limit(input.limit);

      // Also get posts from subscribed channels
      const subs = await ctx.db
        .select({ channelId: subscriptions.channelId })
        .from(subscriptions)
        .where(eq(subscriptions.subscriberId, ctx.user.id));

      const channelIds = subs.map(s => s.channelId).filter(id => id !== ctx.user.id);

      const subPosts = [];
      for (const channelId of channelIds) {
        const posts = await ctx.db
          .select({
            id: communityPosts.id,
            type: communityPosts.type,
            content: communityPosts.content,
            imageURL: communityPosts.imageURL,
            likeCount: communityPosts.likeCount,
            commentCount: communityPosts.commentCount,
            createdAt: communityPosts.createdAt,
            user: {
              id: users.id,
              clerkId: users.clerkId,
              name: users.name,
              imageURL: users.imageURL,
            },
          })
          .from(communityPosts)
          .innerJoin(users, eq(communityPosts.userId, users.id))
          .where(eq(communityPosts.userId, channelId))
          .orderBy(desc(communityPosts.createdAt))
          .limit(10);
        subPosts.push(...posts);
      }

      // Merge own posts + subscribed posts, deduplicate by id
      const seenIds = new Set<string>();
      const allPosts = [...ownPosts, ...subPosts].filter(p => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      // Sort by date and limit
      allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const limited = allPosts.slice(0, input.limit);

      // Fetch poll options
      const pollPostIds = limited.filter(p => p.type === "poll").map(p => p.id);
      const pollOptionsMap: Record<string, { id: string; text: string; voteCount: number }[]> = {};

      for (const postId of pollPostIds) {
        const options = await ctx.db
          .select({ id: pollOptions.id, text: pollOptions.text, voteCount: pollOptions.voteCount })
          .from(pollOptions)
          .where(eq(pollOptions.postId, postId));
        pollOptionsMap[postId] = options;
      }

      return limited.map(post => ({
        ...post,
        pollOptions: pollOptionsMap[post.id] || [],
      }));
    }),

  // Get all community posts (public explore feed)
  getAll: baseProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30) }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db
        .select({
          id: communityPosts.id,
          type: communityPosts.type,
          content: communityPosts.content,
          imageURL: communityPosts.imageURL,
          likeCount: communityPosts.likeCount,
          commentCount: communityPosts.commentCount,
          createdAt: communityPosts.createdAt,
          user: {
            id: users.id,
            clerkId: users.clerkId,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(communityPosts)
        .innerJoin(users, eq(communityPosts.userId, users.id))
        .orderBy(desc(communityPosts.createdAt))
        .limit(input.limit);

      // Fetch poll options for poll-type posts
      const pollPostIds = posts.filter(p => p.type === "poll").map(p => p.id);
      const pollOptionsMap: Record<string, { id: string; text: string; voteCount: number }[]> = {};

      for (const postId of pollPostIds) {
        const options = await ctx.db
          .select({ id: pollOptions.id, text: pollOptions.text, voteCount: pollOptions.voteCount })
          .from(pollOptions)
          .where(eq(pollOptions.postId, postId));
        pollOptionsMap[postId] = options;
      }

      return posts.map(post => ({
        ...post,
        pollOptions: pollOptionsMap[post.id] || [],
      }));
    }),

  // Create a community post
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(3000),
        type: z.enum(["text", "image", "poll"]).default("text"),
        imageURL: z.string().url().optional(),
        pollOptions: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // AI moderation: check text content for toxicity/NSFW
      try {
        const toxicity = await analyzeToxicity(input.content);
        if (toxicity.isToxic && toxicity.score > 0.7) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your post was flagged by AI moderation for containing inappropriate content. Please revise and try again.",
          });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("Toxicity check failed, allowing post:", err);
      }

      // AI moderation: check image for NSFW content
      if (input.imageURL) {
        try {
          const nsfwResult = await detectNsfw(input.imageURL);
          if (nsfwResult.isNsfw) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "The image was flagged as NSFW by AI moderation. Please use a different image.",
            });
          }
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.error("NSFW image check failed, allowing post:", err);
        }
      }

      const newPost = await ctx.db
        .insert(communityPosts)
        .values({
          userId: ctx.user.id,
          type: input.type,
          content: input.content,
          imageURL: input.imageURL,
        })
        .returning();

      const postId = newPost[0].id;

      // Create poll options if type is poll
      if (input.type === "poll" && input.pollOptions) {
        for (const optionText of input.pollOptions) {
          await ctx.db.insert(pollOptions).values({
            postId,
            text: optionText,
          });
        }
      }

      // Notify subscribers
      (async () => {
        try {
          const subs = await ctx.db
            .select({ subscriberId: subscriptions.subscriberId })
            .from(subscriptions)
            .where(eq(subscriptions.channelId, ctx.user.id));

          if (subs.length > 0) {
            await ctx.db.insert(notifications).values(
              subs.map(sub => ({
                userId: sub.subscriberId,
                type: "community_post" as const,
                title: "New community post",
                message: `${ctx.user.name} posted: "${input.content.slice(0, 80)}${input.content.length > 80 ? "..." : ""}"`,
                link: `/community`,
                fromUserId: ctx.user.id,
              }))
            );
          }
        } catch (err) {
          console.error("Failed to send community post notifications:", err);
        }
      })();

      return newPost[0];
    }),

  // Delete a community post
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(communityPosts)
        .where(and(eq(communityPosts.id, input.id), eq(communityPosts.userId, ctx.user.id)));
      return { success: true };
    }),

  // Toggle like on a post
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(communityPostLikes)
        .where(and(eq(communityPostLikes.postId, input.postId), eq(communityPostLikes.userId, ctx.user.id)))
        .limit(1);

      if (existing[0]) {
        await ctx.db.delete(communityPostLikes).where(eq(communityPostLikes.id, existing[0].id));
        await ctx.db
          .update(communityPosts)
          .set({ likeCount: sql`${communityPosts.likeCount} - 1` })
          .where(eq(communityPosts.id, input.postId));
        return { liked: false };
      } else {
        await ctx.db.insert(communityPostLikes).values({ userId: ctx.user.id, postId: input.postId });
        await ctx.db
          .update(communityPosts)
          .set({ likeCount: sql`${communityPosts.likeCount} + 1` })
          .where(eq(communityPosts.id, input.postId));
        return { liked: true };
      }
    }),

  // Vote on a poll
  vote: protectedProcedure
    .input(z.object({ postId: z.string().uuid(), optionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already voted
      const existing = await ctx.db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.postId, input.postId), eq(pollVotes.userId, ctx.user.id)))
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already voted on this poll" });
      }

      await ctx.db.insert(pollVotes).values({
        userId: ctx.user.id,
        optionId: input.optionId,
        postId: input.postId,
      });

      await ctx.db
        .update(pollOptions)
        .set({ voteCount: sql`${pollOptions.voteCount} + 1` })
        .where(eq(pollOptions.id, input.optionId));

      return { success: true };
    }),

  // Check if user has voted on a poll
  hasVoted: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vote = await ctx.db
        .select({ optionId: pollVotes.optionId })
        .from(pollVotes)
        .where(and(eq(pollVotes.postId, input.postId), eq(pollVotes.userId, ctx.user.id)))
        .limit(1);

      return vote[0] || null;
    }),

  // Check if user has liked a post
  hasLiked: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const like = await ctx.db
        .select({ id: communityPostLikes.id })
        .from(communityPostLikes)
        .where(
          and(
            eq(communityPostLikes.postId, input.postId),
            eq(communityPostLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      return !!like[0];
    }),

  // Add a comment to a community post
  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        content: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // AI moderation: check comment for toxicity
      try {
        const toxicity = await analyzeToxicity(input.content);
        if (toxicity.isToxic && toxicity.score > 0.7) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Your comment was flagged by AI moderation for containing inappropriate content. Please revise and try again.",
          });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("Toxicity check failed, allowing comment:", err);
      }

      // AI moderation: check for spam
      try {
        const spamResult = await detectSpam(input.content);
        if (spamResult.isSpam) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Your comment was flagged as spam by AI moderation. Please revise and try again.",
          });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("Spam check failed, allowing comment:", err);
      }

      // Check that the post exists
      const post = await ctx.db
        .select({ id: communityPosts.id, userId: communityPosts.userId })
        .from(communityPosts)
        .where(eq(communityPosts.id, input.postId))
        .limit(1);

      if (!post[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }

      const newComment = await ctx.db
        .insert(communityPostComments)
        .values({
          postId: input.postId,
          userId: ctx.user.id,
          content: input.content,
        })
        .returning();

      // Increment comment count
      await ctx.db
        .update(communityPosts)
        .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
        .where(eq(communityPosts.id, input.postId));

      // Notify post owner (if commenter is not the post owner)
      if (post[0].userId !== ctx.user.id) {
        try {
          await ctx.db.insert(notifications).values({
            userId: post[0].userId,
            type: "comment" as const,
            title: "New comment on your post",
            message: `${ctx.user.name} commented: "${input.content.slice(0, 80)}${input.content.length > 80 ? "..." : ""}"`,
            link: `/community`,
            fromUserId: ctx.user.id,
          });
        } catch (err) {
          console.error("Failed to send comment notification:", err);
        }
      }

      return newComment[0];
    }),

  // Get comments for a community post
  getComments: baseProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db
        .select({
          id: communityPostComments.id,
          content: communityPostComments.content,
          likeCount: communityPostComments.likeCount,
          isHidden: communityPostComments.isHidden,
          createdAt: communityPostComments.createdAt,
          userId: communityPostComments.userId,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(communityPostComments)
        .innerJoin(users, eq(communityPostComments.userId, users.id))
        .where(
          and(
            eq(communityPostComments.postId, input.postId),
            eq(communityPostComments.isHidden, false)
          )
        )
        .orderBy(desc(communityPostComments.createdAt))
        .limit(input.limit);

      return comments;
    }),

  // Delete a comment (by comment owner or post owner)
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the comment and associated post
      const comment = await ctx.db
        .select({
          id: communityPostComments.id,
          userId: communityPostComments.userId,
          postId: communityPostComments.postId,
        })
        .from(communityPostComments)
        .where(eq(communityPostComments.id, input.commentId))
        .limit(1);

      if (!comment[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }

      // Check if user is the comment owner or the post owner
      const post = await ctx.db
        .select({ userId: communityPosts.userId })
        .from(communityPosts)
        .where(eq(communityPosts.id, comment[0].postId))
        .limit(1);

      if (comment[0].userId !== ctx.user.id && post[0]?.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this comment",
        });
      }

      await ctx.db
        .delete(communityPostComments)
        .where(eq(communityPostComments.id, input.commentId));

      // Decrement comment count
      await ctx.db
        .update(communityPosts)
        .set({ commentCount: sql`GREATEST(${communityPosts.commentCount} - 1, 0)` })
        .where(eq(communityPosts.id, comment[0].postId));

      return { success: true };
    }),
});
