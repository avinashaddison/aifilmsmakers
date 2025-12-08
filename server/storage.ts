import { db } from "../drizzle/db";
import { 
  films, 
  storyFrameworks, 
  chapters,
  generatedVideos,
  scenes,
  generationJobs,
  type InsertFilm, 
  type Film,
  type InsertStoryFramework,
  type StoryFramework,
  type InsertChapter,
  type Chapter,
  type InsertGeneratedVideo,
  type GeneratedVideo,
  type InsertScene,
  type Scene,
  type InsertGenerationJob,
  type GenerationJob
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Films
  createFilm(film: InsertFilm): Promise<Film>;
  getFilm(id: string): Promise<Film | undefined>;
  listFilms(): Promise<Film[]>;
  updateFilmStatus(id: string, status: string): Promise<Film | undefined>;
  updateFilm(id: string, updates: Partial<InsertFilm>): Promise<Film | undefined>;
  
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
  
  // Scenes
  createScene(scene: InsertScene): Promise<Scene>;
  getScenesByChapterId(chapterId: string): Promise<Scene[]>;
  getScenesByFilmId(filmId: string): Promise<Scene[]>;
  getScene(id: string): Promise<Scene | undefined>;
  updateScene(id: string, updates: Partial<InsertScene>): Promise<Scene | undefined>;
  deleteScenesByChapterId(chapterId: string): Promise<void>;
  
  // Generation Jobs
  createGenerationJob(job: InsertGenerationJob): Promise<GenerationJob>;
  getGenerationJobByFilmId(filmId: string): Promise<GenerationJob | undefined>;
  updateGenerationJob(id: string, updates: Partial<InsertGenerationJob>): Promise<GenerationJob | undefined>;
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

  async updateFilm(id: string, updates: Partial<InsertFilm>): Promise<Film | undefined> {
    const [film] = await db
      .update(films)
      .set(updates)
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

  // Scenes
  async createScene(insertScene: InsertScene): Promise<Scene> {
    const [scene] = await db.insert(scenes).values(insertScene).returning();
    return scene;
  }

  async getScenesByChapterId(chapterId: string): Promise<Scene[]> {
    return await db
      .select()
      .from(scenes)
      .where(eq(scenes.chapterId, chapterId))
      .orderBy(scenes.sceneNumber);
  }

  async getScenesByFilmId(filmId: string): Promise<Scene[]> {
    return await db
      .select()
      .from(scenes)
      .where(eq(scenes.filmId, filmId))
      .orderBy(scenes.sceneNumber);
  }

  async getScene(id: string): Promise<Scene | undefined> {
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, id));
    return scene;
  }

  async updateScene(id: string, updates: Partial<InsertScene>): Promise<Scene | undefined> {
    const [scene] = await db
      .update(scenes)
      .set(updates)
      .where(eq(scenes.id, id))
      .returning();
    return scene;
  }

  async deleteScenesByChapterId(chapterId: string): Promise<void> {
    await db.delete(scenes).where(eq(scenes.chapterId, chapterId));
  }

  // Generation Jobs
  async createGenerationJob(insertJob: InsertGenerationJob): Promise<GenerationJob> {
    const [job] = await db.insert(generationJobs).values(insertJob).returning();
    return job;
  }

  async getGenerationJobByFilmId(filmId: string): Promise<GenerationJob | undefined> {
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.filmId, filmId))
      .orderBy(desc(generationJobs.createdAt));
    return job;
  }

  async updateGenerationJob(id: string, updates: Partial<InsertGenerationJob>): Promise<GenerationJob | undefined> {
    const [job] = await db
      .update(generationJobs)
      .set(updates)
      .where(eq(generationJobs.id, id))
      .returning();
    return job;
  }
}

export const storage = new DbStorage();
