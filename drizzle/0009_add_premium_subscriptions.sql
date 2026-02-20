-- Premium Subscription System Migration
-- Adds subscription tiers, payments, offline downloads, super chats, and creator earnings

-- Create enums
DO $$ BEGIN
  CREATE TYPE "subscription_tier" AS ENUM('free', 'lite', 'premium', 'vip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_gateway" AS ENUM('esewa', 'khalti', 'stripe', 'paypal');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "download_status" AS ENUM('pending', 'ready', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add premium fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_expiry" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_payment_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_badge" boolean DEFAULT false NOT NULL;

-- Add premium content flags to videos table
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_premium_only" boolean DEFAULT false;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_vip_only" boolean DEFAULT false;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_exclusive_content" boolean DEFAULT false;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "early_access_until" timestamp;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "max_quality_free" text DEFAULT '480p';

-- Create premium_subscriptions table
CREATE TABLE IF NOT EXISTS "premium_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tier" "subscription_tier" DEFAULT 'free' NOT NULL,
  "start_date" timestamp DEFAULT now() NOT NULL,
  "end_date" timestamp NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "auto_renew" boolean DEFAULT true NOT NULL,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_id" uuid REFERENCES "premium_subscriptions"("id") ON DELETE SET NULL,
  "amount" integer NOT NULL,
  "currency" text DEFAULT 'NPR' NOT NULL,
  "gateway" "payment_gateway" NOT NULL,
  "gateway_transaction_id" text,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "tier" "subscription_tier" NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create offline_downloads table
CREATE TABLE IF NOT EXISTS "offline_downloads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "status" "download_status" DEFAULT 'pending' NOT NULL,
  "quality" text DEFAULT '720p' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "downloaded_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "offline_downloads_user_video_idx" ON "offline_downloads" ("user_id", "video_id");

-- Create super_chats table
CREATE TABLE IF NOT EXISTS "super_chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "receiver_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "video_id" uuid REFERENCES "videos"("id") ON DELETE SET NULL,
  "amount" integer NOT NULL,
  "currency" text DEFAULT 'NPR' NOT NULL,
  "message" text,
  "color" text DEFAULT '#FFD700',
  "gateway" "payment_gateway" NOT NULL,
  "gateway_transaction_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create creator_earnings table
CREATE TABLE IF NOT EXISTS "creator_earnings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" integer NOT NULL,
  "currency" text DEFAULT 'NPR' NOT NULL,
  "source" text NOT NULL,
  "reference_id" uuid,
  "is_paid_out" boolean DEFAULT false NOT NULL,
  "paid_out_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "premium_subs_user_idx" ON "premium_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "premium_subs_active_idx" ON "premium_subscriptions" ("is_active") WHERE "is_active" = true;
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "super_chats_receiver_idx" ON "super_chats" ("receiver_id");
CREATE INDEX IF NOT EXISTS "super_chats_video_idx" ON "super_chats" ("video_id");
CREATE INDEX IF NOT EXISTS "creator_earnings_user_idx" ON "creator_earnings" ("user_id");
CREATE INDEX IF NOT EXISTS "creator_earnings_unpaid_idx" ON "creator_earnings" ("is_paid_out") WHERE "is_paid_out" = false;
