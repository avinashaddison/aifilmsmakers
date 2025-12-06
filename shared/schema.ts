import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Films table
export const films = pgTable("films", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, generating, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFilmSchema = createInsertSchema(films).omit({ id: true, createdAt: true });
export type InsertFilm = z.infer<typeof insertFilmSchema>;
export type Film = typeof films.$inferSelect;

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
