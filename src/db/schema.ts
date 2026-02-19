import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  integer,
  boolean,
  pgEnum,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "moderator"]);
export const videoVisibilityEnum = pgEnum("video_visibility", [
  "public",
  "private",
  "unlisted",
]);
export const videoStatusEnum = pgEnum("video_status", [
  "draft",
  "pending",
  "published",
  "rejected",
]);
export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "negative",
  "neutral",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_video",
  "comment",
  "reply",
  "like",
  "subscription",
  "report_resolved",
  "community_post",
]);

export const communityPostTypeEnum = pgEnum("community_post_type", [
  "text",
  "image",
  "poll",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
]);
export const reportTargetEnum = pgEnum("report_target", [
  "video",
  "comment",
  "user",
]);

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    name: text("name").notNull(),
    imageURL: text("image_url").notNull(),
    bannerURL: text("banner_url"),
    description: text("description"),
    role: userRoleEnum("role").default("user").notNull(),
    isBanned: boolean("is_banned").default(false).notNull(),
    banReason: text("ban_reason"),
  },
  (t) => [uniqueIndex("clerk_id_idx").on(t.clerkId)]
);

// Videos table
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  thumbnailURL: text("thumbnail_url"),
  videoURL: text("video_url"),
  visibility: videoVisibilityEnum("visibility").default("private").notNull(),
  status: videoStatusEnum("status").default("draft").notNull(),
  rejectionReason: text("rejection_reason"),
  duration: integer("duration").default(0),
  viewCount: integer("view_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  dislikeCount: integer("dislike_count").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  // ML fields
  tags: jsonb("tags").$type<string[]>(),
  aiSummary: text("ai_summary"),
  transcript: text("transcript"),
  chapters: jsonb("chapters").$type<{ time: number; title: string }[]>(),
  subtitlesVTT: text("subtitles_vtt"),
  keywords: jsonb("keywords").$type<string[]>(),
  language: text("language"),
  languageName: text("language_name"),
  qualityScore: integer("quality_score"),
  nsfwScore: real("nsfw_score"),
  isNsfw: boolean("is_nsfw").default(false),
  isShort: boolean("is_short").default(false),
  allowDownload: boolean("allow_download").default(true),
  publishAt: timestamp("publish_at"), // Scheduled publish date
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  likeCount: integer("like_count").default(0).notNull(),
  // ML fields
  sentiment: sentimentEnum("sentiment"),
  sentimentScore: real("sentiment_score"),
  isToxic: boolean("is_toxic").default(false),
  toxicityScore: real("toxicity_score"),
  isSpam: boolean("is_spam").default(false),
  spamScore: real("spam_score"),
  emotion: text("emotion"),
  emotionConfidence: real("emotion_confidence"),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Video likes table
export const videoLikes = pgTable(
  "video_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    isLike: boolean("is_like").notNull(), // true = like, false = dislike
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("video_likes_user_video_idx").on(t.userId, t.videoId)]
);

// Subscriptions table
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("subscriptions_subscriber_channel_idx").on(t.subscriberId, t.channelId)]
);

// Watch History table
export const watchHistory = pgTable(
  "watch_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watched_at").defaultNow().notNull(),
    watchDuration: integer("watch_duration").default(0), // seconds watched
  },
  (t) => [uniqueIndex("watch_history_user_video_idx").on(t.userId, t.videoId)]
);

// Playlists table
export const playlists = pgTable("playlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: videoVisibilityEnum("visibility").default("private").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Playlist Videos (join table)
export const playlistVideos = pgTable(
  "playlist_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    position: integer("position").default(0).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("playlist_videos_playlist_video_idx").on(t.playlistId, t.videoId)]
);

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false).notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  videoId: uuid("video_id").references(() => videos.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports table
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: reportTargetEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(),
  resolvedBy: uuid("resolved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  resolvedAt: timestamp("resolved_at"),
  resolvedNote: text("resolved_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Community Posts table
export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: communityPostTypeEnum("type").default("text").notNull(),
  content: text("content").notNull(),
  imageURL: text("image_url"),
  likeCount: integer("like_count").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Poll Options table (for community posts with polls)
export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => communityPosts.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  voteCount: integer("vote_count").default(0).notNull(),
});

// Poll Votes table
export const pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("poll_votes_user_post_idx").on(t.userId, t.postId)]
);

// Community Post Likes table
export const communityPostLikes = pgTable(
  "community_post_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("community_post_likes_user_post_idx").on(t.userId, t.postId)]
);

// Video feedback table (not interested, etc.)
export const videoFeedback = pgTable(
  "video_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "not_interested", "dont_recommend_channel"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("video_feedback_user_video_idx").on(t.userId, t.videoId)]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  comments: many(comments),
  videoLikes: many(videoLikes),
  subscriptions: many(subscriptions, { relationName: "subscriber" }),
  subscribers: many(subscriptions, { relationName: "channel" }),
  watchHistory: many(watchHistory),
  playlists: many(playlists),
  notifications: many(notifications),
  reports: many(reports),
  communityPosts: many(communityPosts),
  communityPostLikes: many(communityPostLikes),
  pollVotes: many(pollVotes),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(videoLikes),
  watchHistory: many(watchHistory),
  playlistVideos: many(playlistVideos),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
}));

export const videoLikesRelations = relations(videoLikes, ({ one }) => ({
  user: one(users, {
    fields: [videoLikes.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [videoLikes.videoId],
    references: [videos.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  subscriber: one(users, {
    fields: [subscriptions.subscriberId],
    references: [users.id],
    relationName: "subscriber",
  }),
  channel: one(users, {
    fields: [subscriptions.channelId],
    references: [users.id],
    relationName: "channel",
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [watchHistory.videoId],
    references: [videos.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  videos: many(playlistVideos),
}));

export const playlistVideosRelations = relations(playlistVideos, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistVideos.playlistId],
    references: [playlists.id],
  }),
  video: one(videos, {
    fields: [playlistVideos.videoId],
    references: [videos.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [notifications.videoId],
    references: [videos.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [reports.resolvedBy],
    references: [users.id],
  }),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  user: one(users, {
    fields: [communityPosts.userId],
    references: [users.id],
  }),
  pollOptions: many(pollOptions),
  likes: many(communityPostLikes),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  post: one(communityPosts, {
    fields: [pollOptions.postId],
    references: [communityPosts.id],
  }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  post: one(communityPosts, {
    fields: [pollVotes.postId],
    references: [communityPosts.id],
  }),
}));

export const communityPostLikesRelations = relations(communityPostLikes, ({ one }) => ({
  user: one(users, {
    fields: [communityPostLikes.userId],
    references: [users.id],
  }),
  post: one(communityPosts, {
    fields: [communityPostLikes.postId],
    references: [communityPosts.id],
  }),
}));

export const videoFeedbackRelations = relations(videoFeedback, ({ one }) => ({
  user: one(users, {
    fields: [videoFeedback.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [videoFeedback.videoId],
    references: [videos.id],
  }),
}));
