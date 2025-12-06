import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Film configuration types
export const NARRATOR_VOICES = [
  "male-narrator",
  "female-narrator", 
  "dramatic-male",
  "dramatic-female",
  "neutral",
  "documentary"
] as const;

export const STORY_LENGTHS = [
  "short", // 3-5 chapters
  "medium", // 6-12 chapters
  "long", // 13-18 chapters
  "custom" // user-defined
] as const;

export const VIDEO_MODELS = [
  "sora-2",
  "minimax-video-01",
  "veo-2",
  "kling-video",
  "runway-gen-3"
] as const;

// Films table
export const films = pgTable("films", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, generating, completed
  narratorVoice: text("narrator_voice").default("male-narrator"),
  storyLength: text("story_length").default("medium"),
  chapterCount: integer("chapter_count").default(5),
  wordsPerChapter: integer("words_per_chapter").default(500),
  videoModel: text("video_model").default("sora-2"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFilmSchema = createInsertSchema(films).omit({ id: true, createdAt: true }).extend({
  narratorVoice: z.string().optional(),
  storyLength: z.string().optional(),
  chapterCount: z.number().optional(),
  wordsPerChapter: z.number().optional(),
  videoModel: z.string().optional(),
});
export type InsertFilm = z.infer<typeof insertFilmSchema>;
export type Film = typeof films.$inferSelect;
export type NarratorVoice = typeof NARRATOR_VOICES[number];
export type StoryLength = typeof STORY_LENGTHS[number];
export type VideoModel = typeof VIDEO_MODELS[number];

// Story Frameworks table
export const storyFrameworks = pgTable("story_frameworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filmId: varchar("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
  premise: text("premise").notNull(),
  hook: text("hook").notNull(),
  genre: text("genre").notNull(),
  tone: text("tone").notNull(),
  setting: jsonb("setting").notNull().$type<{
    location: string;
    time: string;
    weather: string;
    atmosphere: string;
  }>(),
  characters: jsonb("characters").notNull().$type<Array<{
    name: string;
    age: number;
    role: string;
    description: string;
    actor: string;
  }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStoryFrameworkSchema = createInsertSchema(storyFrameworks).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertStoryFramework = z.infer<typeof insertStoryFrameworkSchema>;
export type StoryFramework = typeof storyFrameworks.$inferSelect;

// Chapters table
export const chapters = pgTable("chapters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filmId: varchar("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  prompt: text("prompt"), // AI-generated video prompt
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed
  videoUrl: text("video_url"),
  duration: text("duration").default("00:45"),
  metadata: jsonb("metadata").$type<{
    style?: string;
    camera?: string;
    resolution?: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChapterSchema = createInsertSchema(chapters).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chapters.$inferSelect;

// Generated Videos table (for Video Library)
export const generatedVideos = pgTable("generated_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  videoUrl: text("video_url"),
  objectPath: text("object_path"),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  duration: integer("duration").notNull().default(10),
  resolution: text("resolution").notNull().default("1080p"),
  model: text("model").notNull().default("sora-2"),
  externalId: text("external_id"), // ID from VideogenAPI
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGeneratedVideoSchema = createInsertSchema(generatedVideos).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertGeneratedVideo = z.infer<typeof insertGeneratedVideoSchema>;
export type GeneratedVideo = typeof generatedVideos.$inferSelect;
