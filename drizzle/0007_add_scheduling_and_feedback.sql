-- Add publishAt to videos table
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "publish_at" TIMESTAMP;

-- Create video_feedback table
CREATE TABLE IF NOT EXISTS "video_feedback" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "video_id" UUID NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "video_feedback_user_video_idx" ON "video_feedback" ("user_id", "video_id");
