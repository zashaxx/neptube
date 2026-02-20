import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`UPDATE users SET image_url = '/logo.svg' WHERE name = 'NepTube' AND image_url LIKE '%dicebear%' RETURNING id, name, image_url`;
  console.log("Updated:", result);
}

main().catch(console.error);
