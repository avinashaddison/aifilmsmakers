import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Film configuration types
export const FILM_MODES = [
  "short_film", // 5 chapters - quick compact narrative
  "hollywood_screenplay" // 18 chapters - full cinematic structure
] as const;

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

// Hollywood Screenplay 18-chapter structure types
export const CHAPTER_TYPES = [
  "hook", // Chapter 1 - 150 words, glimpse of ending
  "intro_1", // Chapter 2 - Before the Fall
  "intro_2", // Chapter 3 - Quiet Routines & Hidden Cracks
  "intro_3", // Chapter 4 - The Life They Thought They Had
  "inciting_incident", // Chapter 5 - The First Disturbance
  "early_dev_1", // Chapter 6 - Shockwaves
  "early_dev_2", // Chapter 7 - Attempts to Restore Control
  "early_dev_3", // Chapter 8 - Complications & Subplots
  "middle_dev_1", // Chapter 9 - The Deepening Storm
  "middle_dev_2", // Chapter 10 - Truths Rising from the Past
  "middle_dev_3", // Chapter 11 - The Breaking Point
  "plot_twist", // Chapter 12 - The Plot Twist (1500 words)
  "climax_build_1", // Chapter 13 - Aftermath of the Truth
  "climax_build_2", // Chapter 14 - Final Preparations
  "climax_build_3", // Chapter 15 - Walking into the Storm
  "climax", // Chapter 16 - The Climax
  "resolution_1", // Chapter 17 - The Dust Settles
  "resolution_2" // Chapter 18 - The Final Reflection
] as const;

export type FilmMode = typeof FILM_MODES[number];
export type ChapterType = typeof CHAPTER_TYPES[number];

export const VIDEO_MODELS = [
  "kling_21",
  "kling_25",
  "higgsfield_v1",
  "seedance",
  "ltxv-13b",
  "veo_3",
  "veo_31",
  "hailuo_2",
  "sora_2"
] as const;

export const FRAME_SIZES = [
  "720p",
  "1080p",
  "4K"
] as const;

export const GENERATION_STAGES = [
  "idle",
  "generating_chapters",
  "generating_prompts",
  "generating_videos", 
  "merging_chapters",
  "merging_final",
  "completed",
  "failed"
] as const;

// Films table
export const films = pgTable("films", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, generating, completed
  filmMode: text("film_mode").notNull().default("short_film"), // short_film or hollywood_screenplay
  generationStage: text("generation_stage").default("idle"),
  narratorVoice: text("narrator_voice").default("male-narrator"),
  storyLength: text("story_length").default("medium"),
  chapterCount: integer("chapter_count").default(5),
  wordsPerChapter: integer("words_per_chapter").default(500),
  videoModel: text("video_model").default("kling_21"),
  frameSize: text("frame_size").default("1080p"),
  finalVideoUrl: text("final_video_url"),
  finalVideoPath: text("final_video_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFilmSchema = createInsertSchema(films).omit({ id: true, createdAt: true }).extend({
  filmMode: z.enum(FILM_MODES).optional(),
  narratorVoice: z.string().optional(),
  storyLength: z.string().optional(),
  chapterCount: z.number().optional(),
  wordsPerChapter: z.number().optional(),
  videoModel: z.string().optional(),
  frameSize: z.string().optional(),
  generationStage: z.string().optional(),
});
export type InsertFilm = z.infer<typeof insertFilmSchema>;
export type Film = typeof films.$inferSelect;
export type NarratorVoice = typeof NARRATOR_VOICES[number];
export type StoryLength = typeof STORY_LENGTHS[number];
export type VideoModel = typeof VIDEO_MODELS[number];
export type FrameSize = typeof FRAME_SIZES[number];
export type GenerationStage = typeof GENERATION_STAGES[number];

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
  chapterType: text("chapter_type"), // Hollywood screenplay chapter type (hook, intro_1, plot_twist, etc.)
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  prompt: text("prompt"), // AI-generated video prompt
  artifact: jsonb("artifact").$type<{
    name: string;
    description: string;
    significance: string;
  }>(), // Symbolic artifact for Hollywood screenplay mode
  scenePrompts: jsonb("scene_prompts").$type<string[]>(), // Array of video prompts for each scene/frame
  videoFrames: jsonb("video_frames").$type<Array<{
    frameNumber: number;
    prompt: string;
    videoUrl?: string;
    objectPath?: string;
    status: string;
    externalId?: string;
  }>>(),
  status: text("status").notNull().default("pending"), // pending, generating_prompts, generating_videos, merging, completed, failed
  videoUrl: text("video_url"),
  objectPath: text("object_path"), // Path in object storage for merged chapter video
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
  model: text("model").notNull().default("kling_21"),
  externalId: text("external_id"), // ID from VideogenAPI
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGeneratedVideoSchema = createInsertSchema(generatedVideos).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertGeneratedVideo = z.infer<typeof insertGeneratedVideoSchema>;
export type GeneratedVideo = typeof generatedVideos.$inferSelect;
