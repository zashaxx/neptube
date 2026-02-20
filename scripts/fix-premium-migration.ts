import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function fixMigration() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Fixing premium subscriptions migration...\n");

  // Execute statements individually, handling DO blocks properly
  const statements: { label: string; query: string }[] = [
    {
      label: "Create subscription_tier enum",
      query: `DO $$ BEGIN CREATE TYPE "subscription_tier" AS ENUM('free', 'lite', 'premium', 'vip'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    },
    {
      label: "Create payment_status enum",
      query: `DO $$ BEGIN CREATE TYPE "payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    },
    {
      label: "Create payment_gateway enum",
      query: `DO $$ BEGIN CREATE TYPE "payment_gateway" AS ENUM('esewa', 'khalti', 'stripe', 'paypal'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    },
    {
      label: "Create download_status enum",
      query: `DO $$ BEGIN CREATE TYPE "download_status" AS ENUM('pending', 'ready', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    },
    {
      label: "Add subscription_tier to users",
      query: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL`,
    },
    {
      label: "Add subscription_expiry to users",
      query: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_expiry" timestamp`,
    },
    {
      label: "Add last_payment_at to users",
      query: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_payment_at" timestamp`,
    },
    {
      label: "Add premium_badge to users",
      query: `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_badge" boolean DEFAULT false NOT NULL`,
    },
    {
      label: "Add is_premium_only to videos",
      query: `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_premium_only" boolean DEFAULT false`,
    },
    {
      label: "Add is_vip_only to videos",
      query: `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_vip_only" boolean DEFAULT false`,
    },
    {
      label: "Add is_exclusive_content to videos",
      query: `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "is_exclusive_content" boolean DEFAULT false`,
    },
    {
      label: "Add early_access_until to videos",
      query: `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "early_access_until" timestamp`,
    },
    {
      label: "Add max_quality_free to videos",
      query: `ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "max_quality_free" text DEFAULT '480p'`,
    },
    {
      label: "Create premium_subscriptions table",
      query: `CREATE TABLE IF NOT EXISTS "premium_subscriptions" (
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
      )`,
    },
    {
      label: "Create payments table",
      query: `CREATE TABLE IF NOT EXISTS "payments" (
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
      )`,
    },
    {
      label: "Create offline_downloads table",
      query: `CREATE TABLE IF NOT EXISTS "offline_downloads" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
        "status" "download_status" DEFAULT 'pending' NOT NULL,
        "quality" text DEFAULT '720p' NOT NULL,
        "expires_at" timestamp NOT NULL,
        "downloaded_at" timestamp DEFAULT now() NOT NULL
      )`,
    },
    {
      label: "Create offline_downloads unique index",
      query: `CREATE UNIQUE INDEX IF NOT EXISTS "offline_downloads_user_video_idx" ON "offline_downloads" ("user_id", "video_id")`,
    },
    {
      label: "Create super_chats table",
      query: `CREATE TABLE IF NOT EXISTS "super_chats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
        "amount" integer NOT NULL,
        "currency" text DEFAULT 'NPR' NOT NULL,
        "message" text,
        "color" text DEFAULT '#FFD700' NOT NULL,
        "is_tip" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )`,
    },
    {
      label: "Create creator_earnings table",
      query: `CREATE TABLE IF NOT EXISTS "creator_earnings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "creator_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "source_type" text NOT NULL,
        "source_id" uuid,
        "amount" integer NOT NULL,
        "currency" text DEFAULT 'NPR' NOT NULL,
        "is_paid_out" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )`,
    },
  ];

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const { label, query } of statements) {
    try {
      await sql(query);
      console.log(`✓ ${label}`);
      success++;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`⤳ ${label} (already exists)`);
        skipped++;
      } else {
        console.error(`✗ ${label}`);
        console.error(`  Error: ${msg}`);
        failed++;
      }
    }
  }

  console.log(`\nDone: ${success} applied, ${skipped} skipped, ${failed} failed`);

  // Verify the columns exist
  console.log("\nVerifying...");
  const userCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('subscription_tier', 'subscription_expiry', 'last_payment_at', 'premium_badge')`;
  console.log("Users premium columns:", userCols.map((r: Record<string, string>) => r.column_name));

  const videoCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'videos' AND column_name IN ('is_premium_only', 'is_vip_only', 'is_exclusive_content', 'early_access_until', 'max_quality_free')`;
  console.log("Videos premium columns:", videoCols.map((r: Record<string, string>) => r.column_name));

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('premium_subscriptions', 'payments', 'offline_downloads', 'super_chats', 'creator_earnings')`;
  console.log("Premium tables:", tables.map((r: Record<string, string>) => r.tablename));
}

fixMigration().catch(console.error);
