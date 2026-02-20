import { z } from "zod";
import { eq, and, sql, desc, gte, count } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import {
  users,
  premiumSubscriptions,
  payments,
  offlineDownloads,
  superChats,
  creatorEarnings,
  videos,
} from "@/db/schema";
import {
  TIER_CONFIG,
  hasMinTier,
  canAccessQuality,
  canAccessContent,
  getDownloadQuota,
  shouldShowAds,
  type SubscriptionTier,
} from "@/lib/premium";
import { TRPCError } from "@trpc/server";

export const premiumRouter = createTRPCRouter({
  // ─── Subscription Info ──────────────────────────────────────────

  /** Get the current user's subscription details */
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await ctx.db
      .select()
      .from(premiumSubscriptions)
      .where(
        and(
          eq(premiumSubscriptions.userId, ctx.user.id),
          eq(premiumSubscriptions.isActive, true)
        )
      )
      .orderBy(desc(premiumSubscriptions.endDate))
      .limit(1);

    const activeSub = sub[0] || null;
    const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";
    const tierConfig = TIER_CONFIG[tier];
    const adConfig = shouldShowAds(tier);
    const downloadQuota = getDownloadQuota(tier);

    // Count current month downloads
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const downloadCount = await ctx.db
      .select({ count: count() })
      .from(offlineDownloads)
      .where(
        and(
          eq(offlineDownloads.userId, ctx.user.id),
          gte(offlineDownloads.downloadedAt, firstOfMonth)
        )
      );

    return {
      tier,
      tierConfig,
      subscription: activeSub,
      adConfig,
      downloadQuota,
      downloadsThisMonth: downloadCount[0]?.count ?? 0,
      isExpired: ctx.user.subscriptionExpiry
        ? new Date() > ctx.user.subscriptionExpiry
        : tier === "free",
    };
  }),

  /** Get all available plans */
  getPlans: baseProcedure.query(() => {
    return Object.entries(TIER_CONFIG).map(([key, config]) => ({
      tier: key as SubscriptionTier,
      ...config,
    }));
  }),

  /** Check if user can access a specific video */
  checkVideoAccess: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";
      const accessResult = canAccessContent(tier, video[0]);

      return {
        ...accessResult,
        maxQuality: TIER_CONFIG[tier].maxQuality,
        canDownload: getDownloadQuota(tier).allowed,
      };
    }),

  // ─── Subscribe / Manage ─────────────────────────────────────────

  /** Initiate a subscription (creates pending payment) */
  subscribe: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["lite", "premium", "vip"]),
        gateway: z.enum(["esewa", "khalti", "stripe", "paypal"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tierConfig = TIER_CONFIG[input.tier];

      // Create premium subscription record
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month

      const [subscription] = await ctx.db
        .insert(premiumSubscriptions)
        .values({
          userId: ctx.user.id,
          tier: input.tier,
          endDate,
          isActive: false, // Activated after payment confirmation
        })
        .returning();

      // Create pending payment
      const [payment] = await ctx.db
        .insert(payments)
        .values({
          userId: ctx.user.id,
          subscriptionId: subscription.id,
          amount: tierConfig.priceInPaisa,
          gateway: input.gateway,
          status: "pending",
          tier: input.tier,
        })
        .returning();

      return {
        paymentId: payment.id,
        subscriptionId: subscription.id,
        amount: tierConfig.priceInPaisa,
        currency: "NPR",
        gateway: input.gateway,
        tier: input.tier,
      };
    }),

  /** Confirm payment (called after gateway callback) */
  confirmPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
        gatewayTransactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the payment
      const [payment] = await ctx.db
        .select()
        .from(payments)
        .where(
          and(eq(payments.id, input.paymentId), eq(payments.userId, ctx.user.id))
        );

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      if (payment.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has already been processed",
        });
      }

      // Update payment status
      await ctx.db
        .update(payments)
        .set({
          status: "completed",
          gatewayTransactionId: input.gatewayTransactionId,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      // Activate subscription
      if (payment.subscriptionId) {
        // Deactivate any existing active subscriptions
        await ctx.db
          .update(premiumSubscriptions)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(premiumSubscriptions.userId, ctx.user.id),
              eq(premiumSubscriptions.isActive, true)
            )
          );

        // Activate the new subscription
        await ctx.db
          .update(premiumSubscriptions)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(premiumSubscriptions.id, payment.subscriptionId));
      }

      // Update user's subscription tier
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await ctx.db
        .update(users)
        .set({
          subscriptionTier: payment.tier,
          subscriptionExpiry: endDate,
          lastPaymentAt: new Date(),
          premiumBadge: payment.tier !== "free",
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true, tier: payment.tier };
    }),

  /** Cancel subscription */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const [activeSub] = await ctx.db
      .select()
      .from(premiumSubscriptions)
      .where(
        and(
          eq(premiumSubscriptions.userId, ctx.user.id),
          eq(premiumSubscriptions.isActive, true)
        )
      );

    if (!activeSub) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription to cancel",
      });
    }

    // Mark as cancelled but keep active until end date
    await ctx.db
      .update(premiumSubscriptions)
      .set({
        autoRenew: false,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(premiumSubscriptions.id, activeSub.id));

    return { success: true, activeUntil: activeSub.endDate };
  }),

  /** Toggle auto-renewal */
  toggleAutoRenew: protectedProcedure.mutation(async ({ ctx }) => {
    const [activeSub] = await ctx.db
      .select()
      .from(premiumSubscriptions)
      .where(
        and(
          eq(premiumSubscriptions.userId, ctx.user.id),
          eq(premiumSubscriptions.isActive, true)
        )
      );

    if (!activeSub) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      });
    }

    await ctx.db
      .update(premiumSubscriptions)
      .set({
        autoRenew: !activeSub.autoRenew,
        updatedAt: new Date(),
      })
      .where(eq(premiumSubscriptions.id, activeSub.id));

    return { autoRenew: !activeSub.autoRenew };
  }),

  // ─── Payment History ────────────────────────────────────────────

  /** Get user's payment history */
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.userId, ctx.user.id))
        .orderBy(desc(payments.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const extra = items.pop();
        nextCursor = extra?.id;
      }

      return { items, nextCursor };
    }),

  // ─── Offline Downloads ──────────────────────────────────────────

  /** Request an offline download */
  requestDownload: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        quality: z.enum(["360p", "480p", "720p", "1080p", "4k"]).default("720p"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";
      const quota = getDownloadQuota(tier);

      if (!quota.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your subscription tier does not support offline downloads. Upgrade to Lite or above.",
        });
      }

      // Check quality access
      if (!canAccessQuality(tier, input.quality)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your subscription tier only supports up to ${TIER_CONFIG[tier].maxQuality} quality.`,
        });
      }

      // Check monthly quota for non-unlimited tiers
      if (quota.maxPerMonth > 0) {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const downloadCount = await ctx.db
          .select({ count: count() })
          .from(offlineDownloads)
          .where(
            and(
              eq(offlineDownloads.userId, ctx.user.id),
              gte(offlineDownloads.downloadedAt, firstOfMonth)
            )
          );

        if ((downloadCount[0]?.count ?? 0) >= quota.maxPerMonth) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You've reached your monthly download limit of ${quota.maxPerMonth}. Upgrade for unlimited downloads.`,
          });
        }
      }

      // Calculate expiry (30 days from download)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [download] = await ctx.db
        .insert(offlineDownloads)
        .values({
          userId: ctx.user.id,
          videoId: input.videoId,
          quality: input.quality,
          status: "ready",
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [offlineDownloads.userId, offlineDownloads.videoId],
          set: {
            quality: input.quality,
            status: "ready",
            expiresAt,
            downloadedAt: new Date(),
          },
        })
        .returning();

      return download;
    }),

  /** Get user's offline downloads */
  getMyDownloads: protectedProcedure.query(async ({ ctx }) => {
    const downloads = await ctx.db
      .select({
        id: offlineDownloads.id,
        quality: offlineDownloads.quality,
        status: offlineDownloads.status,
        expiresAt: offlineDownloads.expiresAt,
        downloadedAt: offlineDownloads.downloadedAt,
        video: {
          id: videos.id,
          title: videos.title,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
        },
      })
      .from(offlineDownloads)
      .innerJoin(videos, eq(offlineDownloads.videoId, videos.id))
      .where(eq(offlineDownloads.userId, ctx.user.id))
      .orderBy(desc(offlineDownloads.downloadedAt));

    return downloads;
  }),

  /** Remove an offline download */
  removeDownload: protectedProcedure
    .input(z.object({ downloadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(offlineDownloads)
        .where(
          and(
            eq(offlineDownloads.id, input.downloadId),
            eq(offlineDownloads.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // ─── Super Chat / Tipping ──────────────────────────────────────

  /** Send a super chat */
  sendSuperChat: protectedProcedure
    .input(
      z.object({
        receiverId: z.string().uuid(),
        videoId: z.string().uuid().optional(),
        amount: z.number().min(100).max(10000000), // 1 NPR to 100,000 NPR (in paisa)
        message: z.string().max(200).optional(),
        gateway: z.enum(["esewa", "khalti", "stripe", "paypal"]),
        gatewayTransactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";

      if (!hasMinTier(tier, "vip")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super Chat is available for VIP members only.",
        });
      }

      if (input.receiverId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot send a super chat to yourself.",
        });
      }

      // Determine color based on amount
      let color = "#1E90FF"; // Blue - small
      if (input.amount >= 500000) color = "#FFD700"; // Gold - large
      else if (input.amount >= 100000) color = "#FF6B6B"; // Red - medium

      // Create super chat
      const [superChat] = await ctx.db
        .insert(superChats)
        .values({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          videoId: input.videoId,
          amount: input.amount,
          message: input.message,
          color,
          gateway: input.gateway,
          gatewayTransactionId: input.gatewayTransactionId,
        })
        .returning();

      // Record creator earnings (platform takes 30% cut)
      const creatorAmount = Math.floor(input.amount * 0.7);
      await ctx.db.insert(creatorEarnings).values({
        userId: input.receiverId,
        amount: creatorAmount,
        source: "super_chat",
        referenceId: superChat.id,
      });

      return superChat;
    }),

  /** Send a tip to a creator */
  sendTip: protectedProcedure
    .input(
      z.object({
        receiverId: z.string().uuid(),
        amount: z.number().min(100).max(10000000),
        message: z.string().max(500).optional(),
        gateway: z.enum(["esewa", "khalti", "stripe", "paypal"]),
        gatewayTransactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";

      if (!hasMinTier(tier, "vip")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tipping is available for VIP members only.",
        });
      }

      // Record payment
      const [payment] = await ctx.db
        .insert(payments)
        .values({
          userId: ctx.user.id,
          amount: input.amount,
          gateway: input.gateway,
          gatewayTransactionId: input.gatewayTransactionId,
          status: "completed",
          tier: "vip",
          metadata: { type: "tip", receiverId: input.receiverId, message: input.message },
        })
        .returning();

      // Creator gets 85% of tips
      const creatorAmount = Math.floor(input.amount * 0.85);
      await ctx.db.insert(creatorEarnings).values({
        userId: input.receiverId,
        amount: creatorAmount,
        source: "tip",
        referenceId: payment.id,
      });

      return { success: true, paymentId: payment.id };
    }),

  /** Get super chats for a video (live chat) */
  getSuperChats: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const chats = await ctx.db
        .select({
          id: superChats.id,
          amount: superChats.amount,
          currency: superChats.currency,
          message: superChats.message,
          color: superChats.color,
          createdAt: superChats.createdAt,
          sender: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(superChats)
        .innerJoin(users, eq(superChats.senderId, users.id))
        .where(eq(superChats.videoId, input.videoId))
        .orderBy(desc(superChats.createdAt))
        .limit(input.limit);

      return chats;
    }),

  // ─── Creator Earnings & Analytics ──────────────────────────────

  /** Get creator earnings summary */
  getCreatorEarnings: protectedProcedure.query(async ({ ctx }) => {
    const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";

    if (!hasMinTier(tier, "vip")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Creator analytics is available for VIP members only.",
      });
    }

    const [totalEarnings] = await ctx.db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
        unpaid: sql<number>`COALESCE(SUM(CASE WHEN is_paid_out = false THEN amount ELSE 0 END), 0)`,
        paidOut: sql<number>`COALESCE(SUM(CASE WHEN is_paid_out = true THEN amount ELSE 0 END), 0)`,
      })
      .from(creatorEarnings)
      .where(eq(creatorEarnings.userId, ctx.user.id));

    // Get earnings by source
    const earningsBySource = await ctx.db
      .select({
        source: creatorEarnings.source,
        total: sql<number>`COALESCE(SUM(amount), 0)`,
        count: count(),
      })
      .from(creatorEarnings)
      .where(eq(creatorEarnings.userId, ctx.user.id))
      .groupBy(creatorEarnings.source);

    // Get recent earnings
    const recentEarnings = await ctx.db
      .select()
      .from(creatorEarnings)
      .where(eq(creatorEarnings.userId, ctx.user.id))
      .orderBy(desc(creatorEarnings.createdAt))
      .limit(20);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await ctx.db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        total: sql<number>`COALESCE(SUM(amount), 0)`,
        count: count(),
      })
      .from(creatorEarnings)
      .where(
        and(
          eq(creatorEarnings.userId, ctx.user.id),
          gte(creatorEarnings.createdAt, sixMonthsAgo)
        )
      )
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    return {
      totalEarnings: totalEarnings.total,
      unpaidEarnings: totalEarnings.unpaid,
      paidOutEarnings: totalEarnings.paidOut,
      earningsBySource,
      recentEarnings,
      monthlyTrend,
    };
  }),

  /** Get watch-time analytics (VIP only) */
  getWatchTimeAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const tier = (ctx.user.subscriptionTier as SubscriptionTier) || "free";

    if (!hasMinTier(tier, "vip")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Watch-time analytics is available for VIP members only.",
      });
    }

    // Get total watch time stats for user's videos
    const stats = await ctx.db.execute(sql`
      SELECT 
        COUNT(DISTINCT wh.user_id) as unique_viewers,
        COALESCE(SUM(wh.watch_duration), 0) as total_watch_time,
        COALESCE(AVG(wh.watch_duration), 0) as avg_watch_duration,
        COUNT(*) as total_views
      FROM watch_history wh
      INNER JOIN videos v ON wh.video_id = v.id
      WHERE v.user_id = ${ctx.user.id}
    `);

    // Get top videos by watch time
    const topVideos = await ctx.db.execute(sql`
      SELECT 
        v.id,
        v.title,
        v.thumbnail_url,
        COUNT(DISTINCT wh.user_id) as unique_viewers,
        COALESCE(SUM(wh.watch_duration), 0) as total_watch_time,
        COALESCE(AVG(wh.watch_duration), 0) as avg_watch_duration,
        v.view_count
      FROM videos v
      LEFT JOIN watch_history wh ON v.id = wh.video_id
      WHERE v.user_id = ${ctx.user.id}
      GROUP BY v.id, v.title, v.thumbnail_url, v.view_count
      ORDER BY total_watch_time DESC
      LIMIT 10
    `);

    return {
      overview: stats.rows[0],
      topVideos: topVideos.rows,
    };
  }),

  // ─── Admin ─────────────────────────────────────────────────────

  /** Admin: Get subscription stats */
  getSubscriptionStats: adminProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db
      .select({
        tier: users.subscriptionTier,
        count: count(),
      })
      .from(users)
      .groupBy(users.subscriptionTier);

    const revenueStats = await ctx.db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(amount), 0)`,
        completedPayments: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
        pendingPayments: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
        failedPayments: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')`,
      })
      .from(payments);

    return {
      tierDistribution: stats,
      revenue: revenueStats[0],
    };
  }),

  /** Admin: Get all payments with filtering */
  getAdminPayments: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          gateway: payments.gateway,
          status: payments.status,
          tier: payments.tier,
          createdAt: payments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(payments)
        .innerJoin(users, eq(payments.userId, users.id))
        .orderBy(desc(payments.createdAt))
        .limit(input.limit);

      if (input.status) {
        query = query.where(eq(payments.status, input.status)) as typeof query;
      }

      return query;
    }),
});
