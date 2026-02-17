-- Add unique constraints to prevent duplicate entries at database level

-- Prevent duplicate likes (one like per user per video)
CREATE UNIQUE INDEX IF NOT EXISTS "video_likes_user_video_idx" ON "video_likes" ("user_id", "video_id");

-- Prevent duplicate subscriptions (one subscription per subscriber-channel pair)
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_subscriber_channel_idx" ON "subscriptions" ("subscriber_id", "channel_id");

-- Prevent duplicate watch history entries (one entry per user per video, upsert on watchedAt)
CREATE UNIQUE INDEX IF NOT EXISTS "watch_history_user_video_idx" ON "watch_history" ("user_id", "video_id");

-- Prevent duplicate playlist video entries (one entry per playlist per video)
CREATE UNIQUE INDEX IF NOT EXISTS "playlist_videos_playlist_video_idx" ON "playlist_videos" ("playlist_id", "video_id");
