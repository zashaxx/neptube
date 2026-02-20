/**
 * Seed NepTube database with free stock videos from Pexels
 * 
 * Usage: bun run scripts/seed-pexels-videos.ts
 * 
 * Requires PEXELS_API_KEY in .env.local
 * Get one free at: https://www.pexels.com/api/
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

if (!PEXELS_API_KEY) {
  console.error("❌ PEXELS_API_KEY not found in .env.local");
  console.error("   Get a free key at: https://www.pexels.com/api/");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  user: { name: string; url: string };
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

interface PexelsResponse {
  videos: PexelsVideo[];
}

const SEARCH_QUERIES = [
  "nature landscape",
  "city timelapse",
  "cooking food",
  "technology",
  "travel adventure",
  "animals wildlife",
  "music concert",
  "fitness workout",
  "ocean waves",
  "coding programming",
  "cars driving",
  "fashion style",
  "space universe",
  "sports action",
  "art creative",
];

const CATEGORY_MAP: Record<string, string> = {
  "nature landscape": "Nature",
  "city timelapse": "Travel",
  "cooking food": "Food",
  "technology": "Technology",
  "travel adventure": "Travel",
  "animals wildlife": "Nature",
  "music concert": "Music",
  "fitness workout": "Sports",
  "ocean waves": "Nature",
  "coding programming": "Technology",
  "cars driving": "Automotive",
  "fashion style": "Fashion",
  "space universe": "Science",
  "sports action": "Sports",
  "art creative": "Art",
};

async function fetchPexelsVideos(query: string, perPage = 5): Promise<PexelsVideo[]> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&size=medium`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY! } });
  if (!res.ok) {
    console.error(`  ⚠️ Pexels API error for "${query}": ${res.status}`);
    return [];
  }
  const data: PexelsResponse = await res.json();
  return data.videos;
}

function getBestVideoFile(video: PexelsVideo): string | null {
  const mp4Files = video.video_files
    .filter((f) => f.file_type === "video/mp4")
    .sort((a, b) => {
      const aScore = a.height >= 720 && a.height <= 1080 ? 1 : 0;
      const bScore = b.height >= 720 && b.height <= 1080 ? 1 : 0;
      return bScore - aScore || b.height - a.height;
    });
  return mp4Files[0]?.link || null;
}

function generateTitle(query: string, index: number): string {
  const titles: Record<string, string[]> = {
    "nature landscape": ["Breathtaking Mountain Views", "Peaceful Nature Walk", "Stunning Sunset Scenery", "Wild Forest Adventure", "Golden Hour Landscapes"],
    "city timelapse": ["City Lights at Night", "Urban Rush Hour", "Downtown Skyline Timelapse", "Street Life in Motion", "Nighttime City Vibes"],
    "cooking food": ["Easy Homemade Recipe", "Kitchen Cooking Session", "Delicious Meal Prep", "Fresh Ingredients Close-up", "Tasty Food Plating"],
    "technology": ["Future of Tech", "Gadgets & Innovation", "Digital World Showcase", "Smart Technology Demo", "Tech in Everyday Life"],
    "travel adventure": ["Epic Travel Journey", "Exploring Hidden Gems", "Backpacking Highlights", "Adventure Awaits", "Wanderlust Moments"],
    "animals wildlife": ["Wild Animals in Nature", "Cute Animal Compilation", "Ocean Creatures", "Birds in Flight", "Jungle Wildlife Safari"],
    "music concert": ["Live Music Experience", "Concert Energy", "Stage Performance Highlights", "Festival Vibes", "Behind the Scenes Music"],
    "fitness workout": ["Full Body Workout", "Morning Fitness Routine", "Gym Motivation", "Yoga & Stretching", "HIIT Training Session"],
    "ocean waves": ["Calming Ocean Waves", "Beach Sunset Vibes", "Tropical Paradise", "Deep Sea Blue", "Surfing the Waves"],
    "coding programming": ["Code Like a Pro", "Developer Workspace", "Programming in Action", "Building Software", "Tech Setup Tour"],
    "cars driving": ["Luxury Car Showcase", "Scenic Road Trip", "Sports Car in Motion", "Night Drive Vibes", "Mountain Highway Drive"],
    "fashion style": ["Fashion Forward Looks", "Street Style Trends", "Model Photoshoot BTS", "Wardrobe Essentials", "Runway Highlights"],
    "space universe": ["Journey Through Space", "Galaxy & Stars", "Cosmic Wonders", "Planet Earth from Above", "Aurora Borealis Magic"],
    "sports action": ["Extreme Sports Highlights", "Athletic Performance", "Game Day Moments", "Training Hard", "Victory Celebration"],
    "art creative": ["Creative Art Process", "Painting in Progress", "Street Art Showcase", "Artistic Expression", "Colors & Canvas"],
  };
  return titles[query]?.[index] || `${query.charAt(0).toUpperCase() + query.slice(1)} #${index + 1}`;
}

async function getOrCreateSystemUser(): Promise<string> {
  const existing = await sql("SELECT id FROM users WHERE name = 'NepTube' LIMIT 1");
  if (existing.length > 0) {
    console.log("📌 Using existing NepTube system user");
    return existing[0].id;
  }
  const result = await sql(
    `INSERT INTO users (clerk_id, name, image_url, description, role, created_at, updated_at)
     VALUES ('system_neptube_stock', 'NepTube', '/logo.svg', 'Free stock videos powered by Pexels.', 'user', NOW(), NOW())
     RETURNING id`
  );
  console.log("✅ Created NepTube system user");
  return result[0].id;
}

async function main() {
  console.log("🎬 NepTube Stock Video Seeder (Pexels)");
  console.log("========================================\n");

  const systemUserId = await getOrCreateSystemUser();
  let totalSeeded = 0;

  for (const query of SEARCH_QUERIES) {
    console.log(`\n🔍 Fetching "${query}" videos...`);
    const videos = await fetchPexelsVideos(query, 5);

    for (let i = 0; i < videos.length; i++) {
      const pexelsVideo = videos[i];
      const videoURL = getBestVideoFile(pexelsVideo);
      if (!videoURL) {
        console.log(`  ⏭️ Skipping ${pexelsVideo.id} (no suitable video file)`);
        continue;
      }

      const title = generateTitle(query, i);
      const category = CATEGORY_MAP[query] || "Entertainment";
      const tags = JSON.stringify(query.split(" ").concat(category.toLowerCase(), "stock", "pexels"));
      const viewCount = Math.floor(Math.random() * 50000) + 500;
      const likeCount = Math.floor(Math.random() * 2000) + 50;
      const dislikeCount = Math.floor(Math.random() * 100);
      const description = `${title} — Free stock footage by ${pexelsVideo.user.name} on Pexels. Category: ${category}.`;
      const isShort = pexelsVideo.duration <= 60;

      try {
        await sql(
          `INSERT INTO videos (title, description, category, thumbnail_url, video_url, visibility, status, duration, view_count, like_count, dislike_count, comment_count, tags, is_nsfw, is_short, allow_download, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'public', 'published', $6, $7, $8, $9, 0, $10, false, $11, true, $12, NOW(), NOW())`,
          [title, description, category, pexelsVideo.image, videoURL, pexelsVideo.duration, viewCount, likeCount, dislikeCount, tags, isShort, systemUserId]
        );
        totalSeeded++;
        console.log(`  ✅ ${title} (${pexelsVideo.duration}s)`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Failed to seed "${title}": ${message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n========================================`);
  console.log(`🎉 Done! Seeded ${totalSeeded} stock videos into NepTube`);
}

main().catch(console.error);
