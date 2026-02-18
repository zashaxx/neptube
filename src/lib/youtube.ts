/**
 * YouTube Data API v3 integration
 * 
 * Requires YOUTUBE_API_KEY in .env.local
 * Get one free at: https://console.cloud.google.com/apis/credentials
 * Enable "YouTube Data API v3" in the API library
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set in .env.local");
  return key;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailURL: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string; // ISO 8601 e.g. "PT4M13S"
  tags?: string[];
  categoryId?: string;
  isYouTube: true; // marker to distinguish from local videos
}

interface YouTubeSearchItem {
  id: { kind: string; videoId?: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: { high?: { url: string }; maxres?: { url: string }; medium?: { url: string }; default?: { url: string } };
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    tags?: string[];
    categoryId?: string;
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeChannelItem {
  id: string;
  snippet: {
    thumbnails: { default?: { url: string }; medium?: { url: string } };
  };
}

/**
 * Search YouTube videos
 */
export async function searchYouTube(
  query: string,
  maxResults = 12,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  const apiKey = getApiKey();

  // Step 1: Search
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults),
    key: apiKey,
    videoEmbeddable: "true",
    safeSearch: "moderate",
  });
  if (pageToken) searchParams.set("pageToken", pageToken);

  const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
  if (!searchRes.ok) {
    const err = await searchRes.text();
    console.error("YouTube search error:", err);
    return { videos: [] };
  }
  const searchData = await searchRes.json();
  const items: YouTubeSearchItem[] = searchData.items ?? [];
  const videoIds = items
    .filter((i) => i.id.videoId)
    .map((i) => i.id.videoId!)
    .join(",");

  if (!videoIds) return { videos: [], nextPageToken: searchData.nextPageToken };

  // Step 2: Get full video details (statistics + duration)
  const videos = await getVideoDetails(videoIds);

  return { videos, nextPageToken: searchData.nextPageToken };
}

/**
 * Get trending / popular videos
 */
export async function getTrendingYouTube(
  maxResults = 20,
  regionCode = "US",
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    chart: "mostPopular",
    regionCode,
    maxResults: String(maxResults),
    key: apiKey,
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  if (!res.ok) {
    const err = await res.text();
    console.error("YouTube trending error:", err);
    return { videos: [] };
  }

  const data = await res.json();
  const videoItems: YouTubeVideoItem[] = data.items ?? [];

  // Fetch channel thumbnails
  const channelIds = [...new Set(videoItems.map((v) => v.snippet.channelId))].join(",");
  const channelMap = channelIds ? await getChannelThumbnails(channelIds) : {};

  const videos: YouTubeVideo[] = videoItems.map((item) => ({
    id: item.id,
    title: decodeEntities(item.snippet.title),
    description: item.snippet.description,
    thumbnailURL:
      item.snippet.thumbnails.maxres?.url ||
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url ||
      "",
    channelId: item.snippet.channelId,
    channelTitle: decodeEntities(item.snippet.channelTitle),
    channelThumbnail: channelMap[item.snippet.channelId],
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics.viewCount || "0", 10),
    likeCount: parseInt(item.statistics.likeCount || "0", 10),
    commentCount: parseInt(item.statistics.commentCount || "0", 10),
    duration: item.contentDetails.duration,
    tags: item.snippet.tags?.slice(0, 10),
    categoryId: item.snippet.categoryId,
    isYouTube: true as const,
  }));

  return { videos, nextPageToken: data.nextPageToken };
}

/**
 * Get details for specific video IDs
 */
export async function getVideoDetails(videoIds: string): Promise<YouTubeVideo[]> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoIds,
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  const videoItems: YouTubeVideoItem[] = data.items ?? [];

  // Fetch channel thumbnails
  const channelIds = [...new Set(videoItems.map((v) => v.snippet.channelId))].join(",");
  const channelMap = channelIds ? await getChannelThumbnails(channelIds) : {};

  return videoItems.map((item) => ({
    id: item.id,
    title: decodeEntities(item.snippet.title),
    description: item.snippet.description,
    thumbnailURL:
      item.snippet.thumbnails.maxres?.url ||
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url ||
      "",
    channelId: item.snippet.channelId,
    channelTitle: decodeEntities(item.snippet.channelTitle),
    channelThumbnail: channelMap[item.snippet.channelId],
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics.viewCount || "0", 10),
    likeCount: parseInt(item.statistics.likeCount || "0", 10),
    commentCount: parseInt(item.statistics.commentCount || "0", 10),
    duration: item.contentDetails.duration,
    tags: item.snippet.tags?.slice(0, 10),
    categoryId: item.snippet.categoryId,
    isYouTube: true as const,
  }));
}

/**
 * Get a single YouTube video by ID
 */
export async function getYouTubeVideoById(videoId: string): Promise<YouTubeVideo | null> {
  const videos = await getVideoDetails(videoId);
  return videos[0] ?? null;
}

/**
 * Fetch channel thumbnails by IDs
 */
async function getChannelThumbnails(channelIds: string): Promise<Record<string, string>> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    part: "snippet",
    id: channelIds,
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);
  if (!res.ok) return {};

  const data = await res.json();
  const channels: YouTubeChannelItem[] = data.items ?? [];

  const map: Record<string, string> = {};
  for (const ch of channels) {
    map[ch.id] = ch.snippet.thumbnails.medium?.url || ch.snippet.thumbnails.default?.url || "";
  }
  return map;
}

/**
 * Parse ISO 8601 duration to human readable
 */
export function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Decode HTML entities from YouTube API responses
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Check if YouTube API key is configured
 */
export function isYouTubeConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}
