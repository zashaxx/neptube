import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import {
  searchYouTube,
  getTrendingYouTube,
  getYouTubeVideoById,
  isYouTubeConfigured,
} from "@/lib/youtube";

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
});
