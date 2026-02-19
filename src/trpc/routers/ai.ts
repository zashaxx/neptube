import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "../init";
import {
  videos,
  thumbnailScores,
  scriptAnalysis,
  recommendationScores,
  shortClips,
  viralSimulations,
} from "@/db/schema";
import {
  analyzeThumbnailCTR,
  generateThumbnailVariants as genThumbnailVariants,
  analyzeScript as analyzeScriptAI,
  predictRetention as predictRetentionAI,
  computeRecommendationScore,
  computeTrendingScore,
  analyzeContentDNA as analyzeContentDNAAI,
  scanPublishRisks,
  generateAutoClips as generateAutoClipsAI,
  simulateViralReach,
  predictRevenue as predictRevenueAI,
  analyzeSentiment,
} from "@/lib/ai";
import { TRPCError } from "@trpc/server";

export const aiRouter = createTRPCRouter({
  // ─── 1. AI Thumbnail Scoring ───────────────────────────────────────────────
  analyzeThumbnail: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const score = await analyzeThumbnailCTR(
        video.thumbnailURL ?? "",
        video.title
      );

      const [row] = await ctx.db
        .insert(thumbnailScores)
        .values({
          videoId: input.videoId,
          attentionScore: score.attentionScore,
          ctrPrediction: score.ctrPrediction,
          emotionDetected: score.emotionDetected,
          suggestions: score.suggestions,
        })
        .returning();

      return row;
    }),

  getThumbnailScore: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(thumbnailScores)
        .where(eq(thumbnailScores.videoId, input.videoId))
        .orderBy(desc(thumbnailScores.createdAt))
        .limit(1);
      return row ?? null;
    }),

  generateThumbnailVariants: protectedProcedure
    .input(z.object({ title: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const variants = await genThumbnailVariants(input.title, input.description);
      return variants;
    }),

  // ─── 2. AI Script Coach ────────────────────────────────────────────────────
  analyzeScript: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(10),
        videoId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await analyzeScriptAI(input.transcript);

      const [row] = await ctx.db
        .insert(scriptAnalysis)
        .values({
          videoId: input.videoId ?? null,
          userId: ctx.user.id,
          hookStrength: result.hookStrength,
          retentionPrediction: result.retentionPrediction,
          engagementPrediction: result.engagementPrediction,
          weakSegments: result.weakSegments,
          suggestions: result.suggestions,
          rawTranscript: input.transcript.slice(0, 10000),
        })
        .returning();

      return row;
    }),

  getScriptAnalysis: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(scriptAnalysis)
        .where(eq(scriptAnalysis.videoId, input.videoId))
        .orderBy(desc(scriptAnalysis.createdAt))
        .limit(1);
      return row ?? null;
    }),

  // ─── 3. Retention & Drop-off Prediction ───────────────────────────────────
  predictRetention: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const result = await predictRetentionAI(
        video.title,
        video.transcript,
        video.duration
      );

      await ctx.db
        .update(videos)
        .set({
          predictedRetentionCurve: result.retentionCurve,
          predictedDropPoints: result.dropPoints,
          rewatchProbability: result.rewatchProbability,
        })
        .where(eq(videos.id, input.videoId));

      return result;
    }),

  getRetention: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select({
          predictedRetentionCurve: videos.predictedRetentionCurve,
          predictedDropPoints: videos.predictedDropPoints,
          rewatchProbability: videos.rewatchProbability,
        })
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);
      return video ?? null;
    }),

  // ─── 4. Transparent Recommendation Engine ─────────────────────────────────
  getRecommendationBreakdown: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        sourceVideoId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if we have a cached score
      const [cached] = await ctx.db
        .select()
        .from(recommendationScores)
        .where(eq(recommendationScores.videoId, input.videoId))
        .orderBy(desc(recommendationScores.computedAt))
        .limit(1);

      if (cached) return cached;

      // Compute live if source video provided
      if (input.sourceVideoId) {
        const [source] = await ctx.db
          .select()
          .from(videos)
          .where(eq(videos.id, input.sourceVideoId))
          .limit(1);
        const [candidate] = await ctx.db
          .select()
          .from(videos)
          .where(eq(videos.id, input.videoId))
          .limit(1);

        if (source && candidate) {
          const breakdown = computeRecommendationScore(
            { title: source.title, tags: source.tags, category: source.category },
            {
              title: candidate.title,
              tags: candidate.tags,
              category: candidate.category,
              viewCount: candidate.viewCount,
              likeCount: candidate.likeCount,
              commentCount: candidate.commentCount,
            }
          );

          const [row] = await ctx.db
            .insert(recommendationScores)
            .values({
              videoId: input.videoId,
              titleMatchScore: breakdown.titleMatchScore,
              tagScore: breakdown.tagScore,
              categoryScore: breakdown.categoryScore,
              engagementWeight: breakdown.engagementWeight,
              finalScore: breakdown.finalScore,
            })
            .returning();

          return row;
        }
      }

      return null;
    }),

  // ─── 5. Open Trending Algorithm ───────────────────────────────────────────
  recalcTrending: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });

      const score = computeTrendingScore(
        video.viewCount,
        video.likeCount,
        video.commentCount,
        video.createdAt
      );

      await ctx.db
        .update(videos)
        .set({ trendingScore: score })
        .where(eq(videos.id, input.videoId));

      return {
        trendingScore: score,
        formula: "((views×0.6)+(likes×1.2)+(comments×1.5)) / hours^1.2",
        inputs: {
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          hoursSinceUpload: Math.max(
            1,
            (Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60)
          ),
        },
      };
    }),

  getTrending: baseProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          thumbnailURL: videos.thumbnailURL,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          commentCount: videos.commentCount,
          trendingScore: videos.trendingScore,
          createdAt: videos.createdAt,
          userId: videos.userId,
        })
        .from(videos)
        .where(eq(videos.visibility, "public"))
        .orderBy(desc(videos.trendingScore))
        .limit(input.limit);
      return rows;
    }),

  // ─── 6. AI Comment Sentiment (batch) ──────────────────────────────────────
  batchSentiment: protectedProcedure
    .input(
      z.object({
        texts: z.array(z.string()).min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      const results = await Promise.all(
        input.texts.map((t) => analyzeSentiment(t))
      );
      return results;
    }),

  // ─── 7. Content DNA Profile ───────────────────────────────────────────────
  analyzeContentDNA: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const dna = await analyzeContentDNAAI(
        video.title,
        video.description,
        video.transcript,
        video.tags
      );

      await ctx.db
        .update(videos)
        .set({ contentDNA: dna })
        .where(eq(videos.id, input.videoId));

      return dna;
    }),

  getContentDNA: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select({ contentDNA: videos.contentDNA })
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);
      return video?.contentDNA ?? null;
    }),

  // ─── 8. Pre-Publish Risk Scanner ─────────────────────────────────────────
  scanRisks: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const result = await scanPublishRisks(
        video.title,
        video.description,
        video.transcript,
        video.tags
      );

      await ctx.db
        .update(videos)
        .set({
          copyrightProbability: result.copyrightProbability,
          controversyScore: result.controversyScore,
          brandSafetyScore: result.brandSafetyScore,
          nsfwScore: result.nsfwScore,
        })
        .where(eq(videos.id, input.videoId));

      return result;
    }),

  // ─── 9. AI Auto-Clip Generator ───────────────────────────────────────────
  generateClips: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const clips = await generateAutoClipsAI(
        video.title,
        video.transcript,
        video.duration
      );

      if (clips.length > 0) {
        await ctx.db.insert(shortClips).values(
          clips.map((c) => ({
            parentVideoId: input.videoId,
            startTime: c.startTime,
            endTime: c.endTime,
            hookStrength: c.hookStrength,
            caption: c.caption,
            verticalOptimized: c.verticalOptimized,
          }))
        );
      }

      return clips;
    }),

  getClips: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(shortClips)
        .where(eq(shortClips.parentVideoId, input.videoId))
        .orderBy(desc(shortClips.hookStrength));
      return rows;
    }),

  // ─── 10. Viral Simulation ────────────────────────────────────────────────
  simulateViral: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        publishTime: z.string().default("now"),
        niche: z.string().default("general"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const result = await simulateViralReach(
        video.title,
        input.publishTime,
        input.niche,
        video.duration ?? 0,
        video.category,
        video.tags
      );

      const [row] = await ctx.db
        .insert(viralSimulations)
        .values({
          videoId: input.videoId,
          publishTime: input.publishTime,
          niche: input.niche,
          reach24h: result.reach24h,
          reach48h: result.reach48h,
          confidenceScore: result.confidenceScore,
        })
        .returning();

      return { ...result, id: row.id };
    }),

  getViralSimulations: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(viralSimulations)
        .where(eq(viralSimulations.videoId, input.videoId))
        .orderBy(desc(viralSimulations.createdAt));
      return rows;
    }),

  // ─── 11. Revenue Predictor ───────────────────────────────────────────────
  predictRevenue: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      const result = await predictRevenueAI(
        video.title,
        video.category,
        video.tags,
        video.brandSafetyScore,
        video.qualityScore
      );

      await ctx.db
        .update(videos)
        .set({
          estimatedCPM: result.estimatedCPM,
          estimatedRevenuePer1k: result.estimatedRevenuePer1k,
          monetizationScore: result.monetizationScore,
        })
        .where(eq(videos.id, input.videoId));

      return result;
    }),

  // ─── 12. Creator Insights (Dashboard aggregation) ────────────────────────
  getCreatorInsights: protectedProcedure.query(async ({ ctx }) => {
    // Aggregate stats for the logged-in creator
    const userVideos = await ctx.db
      .select()
      .from(videos)
      .where(eq(videos.userId, ctx.user.id));

    const totalViews = userVideos.reduce((s, v) => s + v.viewCount, 0);
    const totalLikes = userVideos.reduce((s, v) => s + v.likeCount, 0);
    const totalComments = userVideos.reduce((s, v) => s + v.commentCount, 0);
    const avgQuality =
      userVideos.filter((v) => v.qualityScore != null).length > 0
        ? Math.round(
            userVideos
              .filter((v) => v.qualityScore != null)
              .reduce((s, v) => s + (v.qualityScore ?? 0), 0) /
              userVideos.filter((v) => v.qualityScore != null).length
          )
        : null;

    const avgTrending =
      userVideos.length > 0
        ? Math.round(
            (userVideos.reduce((s, v) => s + (v.trendingScore ?? 0), 0) /
              userVideos.length) *
              100
          ) / 100
        : 0;

    // Best & worst performing
    const sorted = [...userVideos].sort((a, b) => b.viewCount - a.viewCount);
    const bestVideo = sorted[0] ?? null;
    const worstVideo = sorted[sorted.length - 1] ?? null;

    // Content DNA distribution
    const dnaDistribution = userVideos
      .filter((v) => v.contentDNA != null)
      .map((v) => v.contentDNA!);

    // Revenue summary
    const revenueVideos = userVideos.filter((v) => v.estimatedCPM != null);
    const avgCPM =
      revenueVideos.length > 0
        ? Math.round(
            (revenueVideos.reduce((s, v) => s + (v.estimatedCPM ?? 0), 0) /
              revenueVideos.length) *
              100
          ) / 100
        : null;

    return {
      videoCount: userVideos.length,
      totalViews,
      totalLikes,
      totalComments,
      avgQualityScore: avgQuality,
      avgTrendingScore: avgTrending,
      avgCPM,
      bestVideo: bestVideo
        ? { id: bestVideo.id, title: bestVideo.title, viewCount: bestVideo.viewCount }
        : null,
      worstVideo: worstVideo
        ? { id: worstVideo.id, title: worstVideo.title, viewCount: worstVideo.viewCount }
        : null,
      contentDNA: dnaDistribution,
    };
  }),

  // ─── Full AI analysis (run all at once) ───────────────────────────────────
  runFullAnalysis: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [video] = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });

      // Run analyses in parallel
      const [retention, dna, risks, revenue, thumbnailScore] = await Promise.all([
        predictRetentionAI(video.title, video.transcript, video.duration),
        analyzeContentDNAAI(video.title, video.description, video.transcript, video.tags),
        scanPublishRisks(video.title, video.description, video.transcript, video.tags),
        predictRevenueAI(video.title, video.category, video.tags, video.brandSafetyScore, video.qualityScore),
        analyzeThumbnailCTR(video.thumbnailURL ?? "", video.title),
      ]);

      const trendingScore = computeTrendingScore(
        video.viewCount,
        video.likeCount,
        video.commentCount,
        video.createdAt
      );

      // Persist everything
      await ctx.db
        .update(videos)
        .set({
          predictedRetentionCurve: retention.retentionCurve,
          predictedDropPoints: retention.dropPoints,
          rewatchProbability: retention.rewatchProbability,
          contentDNA: dna,
          copyrightProbability: risks.copyrightProbability,
          controversyScore: risks.controversyScore,
          brandSafetyScore: risks.brandSafetyScore,
          nsfwScore: risks.nsfwScore,
          estimatedCPM: revenue.estimatedCPM,
          estimatedRevenuePer1k: revenue.estimatedRevenuePer1k,
          monetizationScore: revenue.monetizationScore,
          trendingScore,
        })
        .where(eq(videos.id, input.videoId));

      await ctx.db.insert(thumbnailScores).values({
        videoId: input.videoId,
        attentionScore: thumbnailScore.attentionScore,
        ctrPrediction: thumbnailScore.ctrPrediction,
        emotionDetected: thumbnailScore.emotionDetected,
        suggestions: thumbnailScore.suggestions,
      });

      return {
        retention,
        contentDNA: dna,
        risks,
        revenue,
        thumbnailScore,
        trendingScore,
      };
    }),
});
