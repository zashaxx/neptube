-- Migration: Add watch_history table
-- Run this SQL directly in your Neon database console

-- Create watch_history table
CREATE TABLE IF NOT EXISTS "watch_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "video_id" uuid NOT NULL,
  "watched_at" timestamp DEFAULT now() NOT NULL,
  "last_position" integer DEFAULT 0
);

-- Add foreign key constraints
ALTER TABLE "watch_history" 
  ADD CONSTRAINT "watch_history_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "watch_history" 
  ADD CONSTRAINT "watch_history_video_id_videos_id_fk" 
  FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;

-- Optional: Add index for better query performance
CREATE INDEX IF NOT EXISTS "watch_history_user_id_idx" ON "watch_history" ("user_id");
CREATE INDEX IF NOT EXISTS "watch_history_watched_at_idx" ON "watch_history" ("watched_at" DESC);

-- Verify the table was created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'watch_history';
