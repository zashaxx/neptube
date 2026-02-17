/**
 * NepTube Rate Limiter
 *
 * Simple in-memory sliding-window rate limiter.
 * For production at scale, swap with @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 600_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check if a request should be rate-limited.
 * @param identifier - unique key (e.g., userId or IP)
 * @param action - action name (e.g., "comment", "upload")
 * @param config - rate limit configuration
 */
export function rateLimit(
  identifier: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= config.limit) {
    const oldestInWindow = entry.timestamps[0]!;
    const resetInSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    remaining: config.limit - entry.timestamps.length,
    resetInSeconds: config.windowSeconds,
  };
}

// ─── Pre-defined rate limit configs ──────────────────────────────────────────

/** 5 comments per minute */
export const COMMENT_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowSeconds: 60,
};

/** 3 video uploads per hour */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  limit: 3,
  windowSeconds: 3600,
};

/** 10 AI generation requests per minute */
export const AI_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowSeconds: 60,
};

/** 20 report submissions per hour */
export const REPORT_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowSeconds: 3600,
};

/** 30 like/dislike toggles per minute */
export const LIKE_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowSeconds: 60,
};

/** 60 search queries per minute */
export const SEARCH_RATE_LIMIT: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
};
