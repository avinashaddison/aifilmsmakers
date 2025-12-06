import { db } from "../drizzle/db";
import { 
  films, 
  storyFrameworks, 
  chapters,
  generatedVideos,
  type InsertFilm, 
  type Film,
  type InsertStoryFramework,
  type StoryFramework,
  type InsertChapter,
  type Chapter,
  type InsertGeneratedVideo,
  type GeneratedVideo
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Films
  createFilm(film: InsertFilm): Promise<Film>;
  getFilm(id: string): Promise<Film | undefined>;
  listFilms(): Promise<Film[]>;
  updateFilmStatus(id: string, status: string): Promise<Film | undefined>;
  
  // Story Frameworks
  createStoryFramework(framework: InsertStoryFramework): Promise<StoryFramework>;
  getStoryFrameworkByFilmId(filmId: string): Promise<StoryFramework | undefined>;
  
  // Chapters
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  getChaptersByFilmId(filmId: string): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter | undefined>;
  updateChapter(id: string, updates: Partial<InsertChapter>): Promise<Chapter | undefined>;
  
  // Generated Videos
  createGeneratedVideo(video: InsertGeneratedVideo): Promise<GeneratedVideo>;
  getGeneratedVideo(id: string): Promise<GeneratedVideo | undefined>;
  listGeneratedVideos(): Promise<GeneratedVideo[]>;
  updateGeneratedVideo(id: string, updates: Partial<InsertGeneratedVideo>): Promise<GeneratedVideo | undefined>;
}

export class DbStorage implements IStorage {
  // Films
  async createFilm(insertFilm: InsertFilm): Promise<Film> {
    const [film] = await db.insert(films).values(insertFilm).returning();
    return film;
  }

  async getFilm(id: string): Promise<Film | undefined> {
    const [film] = await db.select().from(films).where(eq(films.id, id));
    return film;
  }

  async listFilms(): Promise<Film[]> {
    return await db.select().from(films).orderBy(desc(films.createdAt));
  }

  async updateFilmStatus(id: string, status: string): Promise<Film | undefined> {
    const [film] = await db
      .update(films)
      .set({ status })
      .where(eq(films.id, id))
      .returning();
    return film;
  }

  // Story Frameworks
  async createStoryFramework(insertFramework: InsertStoryFramework): Promise<StoryFramework> {
    const [framework] = await db.insert(storyFrameworks).values(insertFramework).returning();
    return framework;
  }

  async getStoryFrameworkByFilmId(filmId: string): Promise<StoryFramework | undefined> {
    const [framework] = await db
      .select()
      .from(storyFrameworks)
      .where(eq(storyFrameworks.filmId, filmId));
    return framework;
  }

  // Chapters
  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const [chapter] = await db.insert(chapters).values(insertChapter).returning();
    return chapter;
  }

  async getChaptersByFilmId(filmId: string): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.filmId, filmId))
      .orderBy(chapters.chapterNumber);
  }

  async getChapter(id: string): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async updateChapter(id: string, updates: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const [chapter] = await db
      .update(chapters)
      .set(updates)
      .where(eq(chapters.id, id))
      .returning();
    return chapter;
  }

  // Generated Videos
  async createGeneratedVideo(insertVideo: InsertGeneratedVideo): Promise<GeneratedVideo> {
    const [video] = await db.insert(generatedVideos).values(insertVideo).returning();
    return video;
  }

  async getGeneratedVideo(id: string): Promise<GeneratedVideo | undefined> {
    const [video] = await db.select().from(generatedVideos).where(eq(generatedVideos.id, id));
    return video;
  }

  async listGeneratedVideos(): Promise<GeneratedVideo[]> {
    return await db.select().from(generatedVideos).orderBy(desc(generatedVideos.createdAt));
  }

  async updateGeneratedVideo(id: string, updates: Partial<InsertGeneratedVideo>): Promise<GeneratedVideo | undefined> {
    const [video] = await db
      .update(generatedVideos)
      .set(updates)
      .where(eq(generatedVideos.id, id))
      .returning();
    return video;
  }
}

export const storage = new DbStorage();
