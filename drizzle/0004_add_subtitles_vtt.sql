-- Add subtitles_vtt column to videos table for WebVTT subtitle storage
ALTER TABLE "videos" ADD COLUMN "subtitles_vtt" text;
