import { z } from "zod";
import { eq, desc, and, sql, ilike, or, ne, inArray, lt } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { videos, users, videoLikes, subscriptions, notifications, comments, watchHistory } from "@/db/schema";
import {
  generateTags,
  generateSummary,
  transcribeVideo,
  transcribeVideoWithTimestamps,
  generateWebVTT,
  detectNsfw,
  getRecommendationScores,
  generateChapters,
  autoCategorizVideo,
  computeTrendingScore,
  summarizeComments,
  detectLanguage,
  extractKeywords,
  scoreContentQuality,
  expandSearchQuery,
  personalizedFeedScore,
} from "@/lib/ai";
import { rateLimit, UPLOAD_RATE_LIMIT, LIKE_RATE_LIMIT, AI_RATE_LIMIT } from "@/lib/rate-limit";
import { TRPCError } from "@trpc/server";

export const videosRouter = createTRPCRouter({
  // Get all public videos (feed) with optional search
  getFeed: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(videos.visibility, "public")];

      // Exclude videos explicitly marked as shorts — they have their own shelf
      conditions.push(
        or(
          eq(videos.isShort, false),
          sql`${videos.isShort} IS NULL`
        )!
      );
      
      // Add cursor condition for pagination
      if (input.cursor) {
        // Get the createdAt of the cursor video
        const cursorVideo = await ctx.db
          .select({ createdAt: videos.createdAt })
          .from(videos)
          .where(eq(videos.id, input.cursor))
          .limit(1);
        if (cursorVideo[0]) {
          conditions.push(lt(videos.createdAt, cursorVideo[0].createdAt));
        }
      }
      
      // Add search conditions if search query provided
      const searchTerm = input.search?.trim() || "";
      if (searchTerm) {
        const likeTerm = `%${searchTerm}%`;
        conditions.push(
          or(
            ilike(videos.title, likeTerm),
            ilike(videos.description, likeTerm),
            ilike(users.name, likeTerm),
            ilike(videos.category, likeTerm),
            sql`${videos.tags}::text ILIKE ${likeTerm}`,
            ilike(videos.aiSummary, likeTerm)
          )!
        );
      }

      // Build a relevance score so exact/title matches rank first
      const relevanceScore = searchTerm
        ? sql<number>`(
            CASE WHEN LOWER(${videos.title}) = LOWER(${searchTerm}) THEN 100 ELSE 0 END
            + CASE WHEN LOWER(${videos.title}) LIKE LOWER(${searchTerm}) || '%' THEN 50 ELSE 0 END
            + CASE WHEN LOWER(${videos.title}) LIKE '%' || LOWER(${searchTerm}) || '%' THEN 25 ELSE 0 END
            + CASE WHEN LOWER(${videos.category}) = LOWER(${searchTerm}) THEN 20 ELSE 0 END
            + CASE WHEN ${videos.tags}::text ILIKE '%' || ${searchTerm} || '%' THEN 15 ELSE 0 END
            + CASE WHEN LOWER(${videos.description}) LIKE '%' || LOWER(${searchTerm}) || '%' THEN 10 ELSE 0 END
            + CASE WHEN LOWER(${users.name}) LIKE '%' || LOWER(${searchTerm}) || '%' THEN 5 ELSE 0 END
          )`
        : sql<number>`0`;

      const items = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          videoURL: videos.videoURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          dislikeCount: videos.dislikeCount,
          commentCount: videos.commentCount,
          createdAt: videos.createdAt,
          tags: videos.tags,
          isNsfw: videos.isNsfw,
          isShort: videos.isShort,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(...conditions))
        .orderBy(
          ...(searchTerm
            ? [desc(relevanceScore), desc(videos.viewCount), desc(videos.createdAt)]
            : [desc(videos.createdAt)])
        )
        .limit(input.limit + 1);

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get short videos only (isShort or duration <= 60s)
  getShorts: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(videos.visibility, "public"),
        or(
          eq(videos.isShort, true),
          and(
            sql`${videos.duration} IS NOT NULL`,
            sql`${videos.duration} > 0`,
            sql`${videos.duration} <= 60`
          )
        )!,
      ];

      if (input.cursor) {
        const cursorVideo = await ctx.db
          .select({ createdAt: videos.createdAt })
          .from(videos)
          .where(eq(videos.id, input.cursor))
          .limit(1);
        if (cursorVideo[0]) {
          conditions.push(lt(videos.createdAt, cursorVideo[0].createdAt));
        }
      }

      const items = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          videoURL: videos.videoURL,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          dislikeCount: videos.dislikeCount,
          commentCount: videos.commentCount,
          createdAt: videos.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  // Get video by ID
  getById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          category: videos.category,
          thumbnailURL: videos.thumbnailURL,
          videoURL: videos.videoURL,
          visibility: videos.visibility,
          duration: videos.duration,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          dislikeCount: videos.dislikeCount,
          createdAt: videos.createdAt,
          // ML fields
          tags: videos.tags,
          aiSummary: videos.aiSummary,
          transcript: videos.transcript,
          chapters: videos.chapters,
          subtitlesVTT: videos.subtitlesVTT,
          keywords: videos.keywords,
          language: videos.language,
          languageName: videos.languageName,
          qualityScore: videos.qualityScore,
          nsfwScore: videos.nsfwScore,
          isNsfw: videos.isNsfw,
          commentCount: videos.commentCount,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(videos.id, input.id))
        .limit(1);

      return video[0] || null;
    }),

  // Get videos by user (channel)
  getByUser: baseProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userVideos = await ctx.db
        .select()
        .from(videos)
        .where(
          and(eq(videos.userId, input.userId), eq(videos.visibility, "public"))
        )
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return userVideos;
    }),

  // Get channel profile with user info and videos
  getChannelProfile: baseProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          imageURL: users.imageURL,
          bannerURL: users.bannerURL,
          description: users.description,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user[0]) return null;

      const channelVideos = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
        })
        .from(videos)
        .where(
          and(eq(videos.userId, input.userId), eq(videos.visibility, "public"))
        )
        .orderBy(desc(videos.createdAt));

      return { ...user[0], videos: channelVideos };
    }),

  // Get current user's videos (including private)
  getMyVideos: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const myVideos = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.userId, ctx.user.id))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return myVideos;
    }),

  // Create video
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(5000).optional(),
        category: z.string().max(50).optional(),
        thumbnailURL: z.string().url().optional(),
        videoURL: z.string().url().optional(),
        visibility: z.enum(["public", "private", "unlisted"]).default("public"),
        duration: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rl = rateLimit(ctx.user.id, "upload", UPLOAD_RATE_LIMIT);
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Upload limit reached. Try again in ${Math.ceil(rl.resetInSeconds / 60)} min.`,
        });
      }

      const newVideo = await ctx.db
        .insert(videos)
        .values({
          ...input,
          userId: ctx.user.id,
          status: "published", // Auto-publish for demo
        })
        .returning();

      const videoId = newVideo[0].id;

      // Run ML processing asynchronously (fire-and-forget)
      (async () => {
        try {
          // 1. Auto-generate tags
          const tags = await generateTags(
            input.title,
            input.description,
            input.category
          );

          // 2. Generate AI summary
          const aiSummary = await generateSummary(
            input.title,
            input.description
          );

          // 3. NSFW detection on thumbnail
          let nsfwScore = 0;
          let isNsfw = false;
          if (input.thumbnailURL) {
            const nsfw = await detectNsfw(input.thumbnailURL);
            nsfwScore = nsfw.score;
            isNsfw = nsfw.isNsfw;
          }

          // 4. Auto-categorize if no category provided
          let autoCategory = input.category;
          if (!autoCategory) {
            autoCategory = await autoCategorizVideo(input.title, input.description, tags);
          }

          // Update video with ML results
          await ctx.db
            .update(videos)
            .set({
              tags: tags.length > 0 ? tags : undefined,
              aiSummary: aiSummary || undefined,
              category: autoCategory || undefined,
              nsfwScore,
              isNsfw,
            })
            .where(eq(videos.id, videoId));

          // 5. Language detection + Keywords + Quality score (parallel)
          const [langResult, keywords, qualityResult] = await Promise.all([
            detectLanguage(input.title + " " + (input.description || "")),
            extractKeywords(input.title, input.description),
            scoreContentQuality(
              input.title,
              input.description,
              null, // no transcript yet
              tags.length > 0 ? tags : null,
              input.duration
            ),
          ]);

          await ctx.db
            .update(videos)
            .set({
              language: langResult.language,
              languageName: langResult.languageName,
              keywords: keywords.length > 0 ? keywords : undefined,
              qualityScore: qualityResult.overall,
            })
            .where(eq(videos.id, videoId));

          // 6. Transcription (longer running, separate update)
          if (input.videoURL) {
            const transcript = await transcribeVideo(input.videoURL);
            if (transcript) {
              // Re-generate summary with transcript for better quality
              const betterSummary = await generateSummary(
                input.title,
                input.description,
                transcript
              );

              // 6b. Generate chapters from transcript
              const chapters = await generateChapters(
                input.title,
                input.description,
                transcript,
                input.duration
              );

              // 6c. Re-extract keywords with transcript for better quality
              const betterKeywords = await extractKeywords(
                input.title,
                input.description,
                transcript
              );

              // 6d. Re-score quality with transcript
              const betterQuality = await scoreContentQuality(
                input.title,
                input.description,
                transcript,
                tags.length > 0 ? tags : null,
                input.duration
              );

              await ctx.db
                .update(videos)
                .set({
                  transcript,
                  aiSummary: betterSummary || aiSummary || undefined,
                  chapters: chapters.length > 0 ? chapters : undefined,
                  keywords: betterKeywords.length > 0 ? betterKeywords : undefined,
                  qualityScore: betterQuality.overall,
                })
                .where(eq(videos.id, videoId));
            }
          }

          // 7. Send notification to subscribers
          if (input.visibility === "public") {
            const subs = await ctx.db
              .select({ subscriberId: subscriptions.subscriberId })
              .from(subscriptions)
              .where(eq(subscriptions.channelId, ctx.user.id));

            if (subs.length > 0) {
              await ctx.db.insert(notifications).values(
                subs.map((sub) => ({
                  userId: sub.subscriberId,
                  type: "new_video" as const,
                  title: "New video",
                  message: `${ctx.user.name} uploaded "${input.title}"`,
                  link: `/feed/${videoId}`,
                  fromUserId: ctx.user.id,
                  videoId,
                }))
              );
            }
          }
        } catch (err) {
          console.error("ML processing failed for video:", videoId, err);
        }
      })();

      return newVideo[0];
    }),

  // Update video
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(5000).optional(),
        category: z.string().max(50).optional(),
        thumbnailURL: z.string().url().optional(),
        videoURL: z.string().url().optional(),
        visibility: z.enum(["public", "private", "unlisted"]).optional(),
        publishAt: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, publishAt, ...data } = input;

      const updated = await ctx.db
        .update(videos)
        .set({
          ...data,
          ...(publishAt !== undefined
            ? { publishAt: publishAt ? new Date(publishAt) : null }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(videos.id, id), eq(videos.userId, ctx.user.id)))
        .returning();

      return updated[0];
    }),

  // Delete video
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(videos)
        .where(and(eq(videos.id, input.id), eq(videos.userId, ctx.user.id)));

      return { success: true };
    }),

  // Increment view count
  incrementViews: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(videos)
        .set({
          viewCount: sql`${videos.viewCount} + 1`,
        })
        .where(eq(videos.id, input.id));

      return { success: true };
    }),

  // Like or dislike video
  toggleLike: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        isLike: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rl = rateLimit(ctx.user.id, "like", LIKE_RATE_LIMIT);
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Slow down. Try again in ${rl.resetInSeconds}s.`,
        });
      }

      // Check if already liked/disliked
      const existing = await ctx.db
        .select()
        .from(videoLikes)
        .where(
          and(
            eq(videoLikes.videoId, input.videoId),
            eq(videoLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing[0]) {
        if (existing[0].isLike === input.isLike) {
          // Remove like/dislike
          await ctx.db
            .delete(videoLikes)
            .where(eq(videoLikes.id, existing[0].id));

          // Update video counts
          await ctx.db
            .update(videos)
            .set({
              likeCount: input.isLike
                ? sql`${videos.likeCount} - 1`
                : videos.likeCount,
              dislikeCount: !input.isLike
                ? sql`${videos.dislikeCount} - 1`
                : videos.dislikeCount,
            })
            .where(eq(videos.id, input.videoId));

          return { action: "removed" };
        } else {
          // Switch like/dislike
          await ctx.db
            .update(videoLikes)
            .set({ isLike: input.isLike })
            .where(eq(videoLikes.id, existing[0].id));

          // Update video counts
          await ctx.db
            .update(videos)
            .set({
              likeCount: input.isLike
                ? sql`${videos.likeCount} + 1`
                : sql`${videos.likeCount} - 1`,
              dislikeCount: input.isLike
                ? sql`${videos.dislikeCount} - 1`
                : sql`${videos.dislikeCount} + 1`,
            })
            .where(eq(videos.id, input.videoId));

          return { action: "switched" };
        }
      } else {
        // Add new like/dislike
        await ctx.db.insert(videoLikes).values({
          videoId: input.videoId,
          userId: ctx.user.id,
          isLike: input.isLike,
        });

        // Update video counts
        await ctx.db
          .update(videos)
          .set({
            likeCount: input.isLike
              ? sql`${videos.likeCount} + 1`
              : videos.likeCount,
            dislikeCount: !input.isLike
              ? sql`${videos.dislikeCount} + 1`
              : videos.dislikeCount,
          })
          .where(eq(videos.id, input.videoId));

        return { action: "added" };
      }
    }),

  // Get user's like status for a video
  getLikeStatus: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const like = await ctx.db
        .select()
        .from(videoLikes)
        .where(
          and(
            eq(videoLikes.videoId, input.videoId),
            eq(videoLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      return like[0] || null;
    }),

  // ─── ML Endpoints ───────────────────────────────────────────────────────────

  // Get AI-powered recommendations for a video
  getRecommendations: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(20).default(8),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get source video
      const sourceVideo = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!sourceVideo[0]) return [];

      const source = sourceVideo[0];

      // Get candidate videos (excluding the source)
      const candidates = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          tags: videos.tags,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(
          and(eq(videos.visibility, "public"), ne(videos.id, input.videoId))
        )
        .orderBy(desc(videos.viewCount))
        .limit(30);

      if (candidates.length === 0) return [];

      // Score with AI
      const scores = await getRecommendationScores(
        source.title,
        source.description,
        source.tags,
        candidates.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          tags: c.tags,
        }))
      );

      // Sort by relevance score and return top N
      const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
      return candidates
        .map((c) => ({ ...c, relevanceScore: scoreMap.get(c.id) ?? 0.1 }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, input.limit);
    }),

  // Trigger transcription for a video
  transcribe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const video = await ctx.db
        .select()
        .from(videos)
        .where(and(eq(videos.id, input.id), eq(videos.userId, ctx.user.id)))
        .limit(1);

      if (!video[0]) throw new Error("Video not found");
      if (!video[0].videoURL) throw new Error("No video URL");
      if (video[0].transcript) return { transcript: video[0].transcript };

      const transcript = await transcribeVideo(video[0].videoURL);
      if (transcript) {
        // Also regenerate summary with transcript
        const aiSummary = await generateSummary(
          video[0].title,
          video[0].description,
          transcript
        );

        await ctx.db
          .update(videos)
          .set({ transcript, aiSummary: aiSummary || undefined })
          .where(eq(videos.id, input.id));
      }

      return { transcript };
    }),

  // Re-run ML analysis on a video
  reAnalyze: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const video = await ctx.db
        .select()
        .from(videos)
        .where(and(eq(videos.id, input.id), eq(videos.userId, ctx.user.id)))
        .limit(1);

      if (!video[0]) throw new Error("Video not found");

      const tags = await generateTags(
        video[0].title,
        video[0].description,
        video[0].category
      );
      const aiSummary = await generateSummary(
        video[0].title,
        video[0].description,
        video[0].transcript
      );

      let nsfwScore = video[0].nsfwScore ?? 0;
      let isNsfw = video[0].isNsfw ?? false;
      if (video[0].thumbnailURL) {
        const nsfw = await detectNsfw(video[0].thumbnailURL);
        nsfwScore = nsfw.score;
        isNsfw = nsfw.isNsfw;
      }

      await ctx.db
        .update(videos)
        .set({
          tags: tags.length > 0 ? tags : undefined,
          aiSummary: aiSummary || undefined,
          nsfwScore,
          isNsfw,
        })
        .where(eq(videos.id, input.id));

      return { tags, aiSummary, nsfwScore, isNsfw };
    }),

  // Get subscriptions feed
  getSubscriptionsFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get channel IDs user is subscribed to
      const subs = await ctx.db
        .select({ channelId: subscriptions.channelId })
        .from(subscriptions)
        .where(eq(subscriptions.subscriberId, ctx.user.id));

      if (subs.length === 0) return { items: [], subscribedChannels: 0 };

      const channelIds = subs.map((s) => s.channelId);

      const items = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          tags: videos.tags,
          isNsfw: videos.isNsfw,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(
          and(
            eq(videos.visibility, "public"),
            inArray(videos.userId, channelIds)
          )
        )
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return { items, subscribedChannels: channelIds.length };
    }),

  // Get trending videos
  getTrending: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const allPublic = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          dislikeCount: videos.dislikeCount,
          commentCount: videos.commentCount,
          createdAt: videos.createdAt,
          tags: videos.tags,
          isNsfw: videos.isNsfw,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(videos.visibility, "public"))
        .orderBy(desc(videos.createdAt))
        .limit(100); // Get recent 100 for scoring

      // Score and sort by trending algorithm
      const scored = allPublic
        .map((v) => ({
          ...v,
          trendingScore: computeTrendingScore(
            v.viewCount,
            v.likeCount,
            v.commentCount,
            v.createdAt
          ),
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, input.limit);

      return scored;
    }),

  // Generate WebVTT subtitles for a video
  generateSubtitles: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rl = rateLimit(ctx.user.id, "ai-subtitles", AI_RATE_LIMIT);
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Slow down. Try again in ${rl.resetInSeconds}s.`,
        });
      }

      const video = await ctx.db
        .select({
          id: videos.id,
          videoURL: videos.videoURL,
          userId: videos.userId,
          subtitlesVTT: videos.subtitlesVTT,
        })
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      // Only video owner can generate subtitles
      if (video[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your video" });
      }

      if (!video[0].videoURL) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No video URL" });
      }

      // If subtitles already exist, return them
      if (video[0].subtitlesVTT) {
        return { vtt: video[0].subtitlesVTT };
      }

      // Transcribe with timestamps
      const segments = await transcribeVideoWithTimestamps(video[0].videoURL);
      if (segments.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Transcription failed or returned no results",
        });
      }

      // Generate WebVTT
      const vtt = generateWebVTT(segments);

      // Also save plain transcript if not yet set
      const plainText = segments.map((s) => s.text).join(" ");

      await ctx.db
        .update(videos)
        .set({
          subtitlesVTT: vtt,
          transcript: plainText,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, input.videoId));

      return { vtt };
    }),

  // Summarize comments for a video using AI
  summarizeVideoComments: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const videoComments = await ctx.db
        .select({
          content: comments.content,
          userName: users.name,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.videoId, input.videoId))
        .orderBy(desc(comments.createdAt))
        .limit(50);

      if (videoComments.length < 3) {
        return { summary: null, commentCount: videoComments.length };
      }

      const summary = await summarizeComments(videoComments);
      return { summary, commentCount: videoComments.length };
    }),

  // Personalized "For You" feed based on watch history
  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. Get user's watch history to build preferences
      const history = await ctx.db
        .select({
          videoId: watchHistory.videoId,
          category: videos.category,
          tags: videos.tags,
        })
        .from(watchHistory)
        .innerJoin(videos, eq(watchHistory.videoId, videos.id))
        .where(eq(watchHistory.userId, ctx.user.id))
        .orderBy(desc(watchHistory.watchedAt))
        .limit(100);

      // Build user preference profile
      const watchedCategories: Record<string, number> = {};
      const watchedTags: Record<string, number> = {};
      const watchedVideoIds = new Set(history.map((h) => h.videoId));

      for (const h of history) {
        if (h.category) {
          watchedCategories[h.category] = (watchedCategories[h.category] || 0) + 1;
        }
        if (h.tags && Array.isArray(h.tags)) {
          for (const tag of h.tags) {
            watchedTags[tag] = (watchedTags[tag] || 0) + 1;
          }
        }
      }

      const userPrefs = {
        watchedCategories,
        watchedTags,
        totalWatched: history.length,
      };

      // 2. Get candidate videos (not already watched)
      const candidates = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          dislikeCount: videos.dislikeCount,
          commentCount: videos.commentCount,
          createdAt: videos.createdAt,
          tags: videos.tags,
          category: videos.category,
          isNsfw: videos.isNsfw,
          isShort: videos.isShort,
          qualityScore: videos.qualityScore,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(videos.visibility, "public"))
        .orderBy(desc(videos.createdAt))
        .limit(200);

      // 3. Score and rank by personalization
      const scored = candidates
        .filter((v) => !watchedVideoIds.has(v.id))
        .map((v) => ({
          ...v,
          personalScore: personalizedFeedScore(v, userPrefs),
        }))
        .sort((a, b) => b.personalScore - a.personalScore)
        .slice(0, input.limit);

      return scored;
    }),

  // Smart search with AI query expansion
  smartSearch: baseProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Expand the user's query using AI
      const expandedTerms = await expandSearchQuery(input.query);

      // Build search conditions from all expanded terms
      const searchConditions = expandedTerms.map((term) => {
        const searchTerm = `%${term.trim()}%`;
        return or(
          ilike(videos.title, searchTerm),
          ilike(videos.description, searchTerm),
          ilike(users.name, searchTerm)
        );
      });

      const results = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          tags: videos.tags,
          category: videos.category,
          qualityScore: videos.qualityScore,
          isNsfw: videos.isNsfw,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(
          and(
            eq(videos.visibility, "public"),
            or(...searchConditions.filter(Boolean))
          )
        )
        .orderBy(desc(videos.viewCount))
        .limit(input.limit);

      return {
        results,
        expandedTerms,
      };
    }),

  // Get content quality score for a video (on-demand)
  getQualityScore: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db
        .select({
          title: videos.title,
          description: videos.description,
          transcript: videos.transcript,
          tags: videos.tags,
          duration: videos.duration,
          qualityScore: videos.qualityScore,
        })
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      // If already scored, return cached score
      if (video[0].qualityScore !== null) {
        return {
          overall: video[0].qualityScore,
          cached: true,
        };
      }

      const quality = await scoreContentQuality(
        video[0].title,
        video[0].description,
        video[0].transcript,
        video[0].tags,
        video[0].duration
      );

      // Cache the score
      await ctx.db
        .update(videos)
        .set({ qualityScore: quality.overall })
        .where(eq(videos.id, input.videoId));

      return {
        ...quality,
        cached: false,
      };
    }),

  // Extract keywords for a video (on-demand)
  extractVideoKeywords: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const video = await ctx.db
        .select({
          title: videos.title,
          description: videos.description,
          transcript: videos.transcript,
          userId: videos.userId,
          keywords: videos.keywords,
        })
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!video[0]) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (video[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // If already has keywords, return them
      if (video[0].keywords && video[0].keywords.length > 0) {
        return { keywords: video[0].keywords };
      }

      const keywords = await extractKeywords(
        video[0].title,
        video[0].description,
        video[0].transcript
      );

      if (keywords.length > 0) {
        await ctx.db
          .update(videos)
          .set({ keywords })
          .where(eq(videos.id, input.videoId));
      }

      return { keywords };
    }),
});
