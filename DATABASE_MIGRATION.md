# Database Migration Instructions

## Watch History Feature - Database Setup

A new `watch_history` table has been added to track user video viewing history.

### Steps to Apply the Migration:

1. **Generate Migration Files:**
   ```bash
   bun run db:generate
   ```
   
   If that doesn't work, try:
   ```bash
   bunx drizzle-kit generate:pg
   ```

2. **Apply Migration to Database:**
   ```bash
   bun run db:push
   ```
   
   Or manually run the SQL migration from the `drizzle/` folder.

### Manual SQL (if needed):

If you prefer to run the SQL directly:

```sql
CREATE TABLE IF NOT EXISTS "watch_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "watched_at" timestamp DEFAULT now() NOT NULL,
  "last_position" integer DEFAULT 0
);
```

### What's New:

- **Watch History Table**: Tracks when users watch videos
- **Like Status API**: Get user's like/dislike status for videos
- **History Page**: New `/history` page with two tabs:
  - Watch History
  - Liked Videos
- **Video Player Enhancements**:
  - Automatically tracks when videos are watched
  - Interactive like/dislike buttons with visual feedback
  - Optimistic UI updates for better user experience

### Features:

✅ Videos are automatically added to watch history when played
✅ Click any video in history/liked videos to play it
✅ Like/dislike buttons show your current status
✅ Clicking like again removes your like (toggle behavior)
✅ Full dark mode support
✅ Responsive design (1 column on mobile, 3 columns on desktop)
