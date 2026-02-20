import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

dotenv.config({ path: ".env.local" });

async function applyMigration() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Applying premium subscriptions migration...");

  const migrationSQL = readFileSync(
    resolve(__dirname, "../drizzle/0009_add_premium_subscriptions.sql"),
    "utf-8"
  );

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    try {
      await sql(statement);
      console.log("✓ Executed:", statement.substring(0, 80) + "...");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      // Ignore "already exists" errors
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("⤳ Skipped (already exists):", statement.substring(0, 60) + "...");
      } else {
        console.error("✗ Failed:", statement.substring(0, 80) + "...");
        console.error("  Error:", msg);
      }
    }
  }

  console.log("\n✅ Premium subscriptions migration complete!");
}

applyMigration().catch(console.error);
