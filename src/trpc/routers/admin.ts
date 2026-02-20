import { z } from "zod";
import { eq, desc, sql, and, like, or } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { users, videos, comments } from "@/db/schema";

export const adminRouter = createTRPCRouter({
  // Get dashboard statistics
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [userCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [videoCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(videos);

    const [commentCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(comments);

    const [totalViews] = await ctx.db
      .select({ sum: sql<number>`coalesce(sum(${videos.viewCount}), 0)` })
      .from(videos);

    const [bannedUsers] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isBanned, true));

    const [pendingVideos] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(eq(videos.status, "pending"));

    const [nsfwVideos] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(eq(videos.isNsfw, true));

    const [toxicComments] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.isToxic, true));

    const [hiddenComments] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.isHidden, true));

    return {
      totalUsers: Number(userCount?.count ?? 0),
      totalVideos: Number(videoCount?.count ?? 0),
      totalComments: Number(commentCount?.count ?? 0),
      totalViews: Number(totalViews?.sum ?? 0),
      bannedUsers: Number(bannedUsers?.count ?? 0),
      pendingVideos: Number(pendingVideos?.count ?? 0),
      nsfwVideos: Number(nsfwVideos?.count ?? 0),
      toxicComments: Number(toxicComments?.count ?? 0),
      hiddenComments: Number(hiddenComments?.count ?? 0),
    };
  }),

  // Get all users with pagination
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().default(0),
        search: z.string().optional(),
        role: z.enum(["all", "user", "admin", "moderator"]).default("all"),
        banned: z.enum(["all", "banned", "active"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.search) {
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.clerkId, `%${input.search}%`)
          )
        );
      }

      if (input.role !== "all") {
        conditions.push(eq(users.role, input.role));
      }

      if (input.banned === "banned") {
        conditions.push(eq(users.isBanned, true));
      } else if (input.banned === "active") {
        conditions.push(eq(users.isBanned, false));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allUsers = await ctx.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

      return {
        users: allUsers,
        total: Number(total?.count ?? 0),
      };
    }),

  // Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["user", "admin", "moderator"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning();

      return updated[0];
    }),

  // Ban user (accepts either UUID or Clerk ID)
  banUser: adminProcedure
    .input(
      z.object({
        userId: z.string(), // Can be UUID or Clerk ID
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if it's a UUID or Clerk ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId);
      
      const updated = await ctx.db
        .update(users)
        .set({
          isBanned: true,
          banReason: input.reason,
          updatedAt: new Date(),
        })
        .where(isUUID ? eq(users.id, input.userId) : eq(users.clerkId, input.userId))
        .returning();

      return updated[0];
    }),

  // Unban user (accepts either UUID or Clerk ID)
  unbanUser: adminProcedure
    .input(z.object({ userId: z.string() })) // Can be UUID or Clerk ID
    .mutation(async ({ ctx, input }) => {
      // Check if it's a UUID or Clerk ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId);
      
      const updated = await ctx.db
        .update(users)
        .set({
          isBanned: false,
          banReason: null,
          updatedAt: new Date(),
        })
        .where(isUUID ? eq(users.id, input.userId) : eq(users.clerkId, input.userId))
        .returning();

      return updated[0];
    }),

  // Get all videos with pagination
  getVideos: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().default(0),
        status: z.enum(["all", "draft", "pending", "published", "rejected"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(videos.status, input.status));
      }

      if (input.search) {
        conditions.push(like(videos.title, `%${input.search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allVideos = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          status: videos.status,
          visibility: videos.visibility,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(whereClause)
        .orderBy(desc(videos.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(whereClause);

      return {
        videos: allVideos,
        total: Number(total?.count ?? 0),
      };
    }),

  // Update video status (approve/reject)
  updateVideoStatus: adminProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        status: z.enum(["draft", "pending", "published", "rejected"]),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const setFields: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
        rejectionReason: input.rejectionReason,
      };
      const updated = await ctx.db
        .update(videos)
        .set(setFields)
        .where(eq(videos.id, input.videoId))
        .returning();

      return updated[0];
    }),

  // Delete video
  deleteVideo: adminProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(videos).where(eq(videos.id, input.videoId));
      return { success: true };
    }),

  // Delete user (and all their content)
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(users).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Get toxic comments for admin
  getToxicComments: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          toxicityScore: comments.toxicityScore,
          user: {
            id: users.id,
            name: users.name,
          },
          video: {
            id: videos.id,
            title: videos.title,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(videos, eq(comments.videoId, videos.id))
        .where(eq(comments.isToxic, true))
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);
      return { comments: rows };
    }),

  // Delete a comment by id
  deleteComment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(comments).where(eq(comments.id, input.id));
      return { success: true };
    }),

  // Unmark a comment as toxic
  unmarkToxicComment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(comments)
        .set({ isToxic: false, toxicityScore: 0 })
        .where(eq(comments.id, input.id));
      return { success: true };
    }),
});
