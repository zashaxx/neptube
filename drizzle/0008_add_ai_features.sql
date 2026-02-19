-- Migration 0008: AI Features (Thumbnail Scoring, Script Coach, Retention, Recommendation, Short Clips, Viral Sim, Revenue, Content DNA, Risk Scanner)

-- ─── New columns on videos table ─────────────────────────────────────────────

ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "predicted_retention_curve" JSONB;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "predicted_drop_points" JSONB;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "rewatch_probability" REAL;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "trending_score" REAL DEFAULT 0;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "content_dna" JSONB;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "estimated_cpm" REAL;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "estimated_revenue_per_1k" REAL;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "monetization_score" INTEGER;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "copyright_probability" REAL;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "controversy_score" REAL;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "brand_safety_score" INTEGER;

-- ─── Thumbnail Scores table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "thumbnail_scores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" UUID NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "attention_score" REAL,
  "ctr_prediction" REAL,
  "emotion_detected" TEXT,
  "suggestions" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Script Analysis table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "script_analysis" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" UUID REFERENCES "videos"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "hook_strength" REAL,
  "retention_prediction" REAL,
  "engagement_prediction" REAL,
  "weak_segments" JSONB,
  "suggestions" JSONB,
  "raw_transcript" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Recommendation Scores table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "recommendation_scores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" UUID NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "title_match_score" REAL DEFAULT 0,
  "tag_score" REAL DEFAULT 0,
  "category_score" REAL DEFAULT 0,
  "engagement_weight" REAL DEFAULT 0,
  "final_score" REAL DEFAULT 0,
  "computed_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Short Clips table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "short_clips" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_video_id" UUID NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "start_time" REAL NOT NULL,
  "end_time" REAL NOT NULL,
  "hook_strength" REAL,
  "caption" TEXT,
  "vertical_optimized" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Viral Simulations table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "viral_simulations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_id" UUID NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "publish_time" TEXT,
  "niche" TEXT,
  "reach_24h" INTEGER,
  "reach_48h" INTEGER,
  "confidence_score" REAL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
