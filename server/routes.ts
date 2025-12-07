import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFilmSchema, insertStoryFrameworkSchema, insertChapterSchema } from "@shared/schema";
import { z } from "zod";
import Replicate from "replicate";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function generateStoryPreview(filmTitle: string) {
  const systemPrompt = "You are a professional film writer who creates compelling cinematic stories. Always respond with valid JSON only, no additional text.";
  
  const userPrompt = `Based on the film title "${filmTitle}", generate a quick preview.

Generate a JSON response with this exact structure (no markdown, just pure JSON):
{
  "genres": ["Primary Genre", "Secondary Genre"],
  "premise": "A compelling 2-3 sentence premise of the film",
  "openingHook": "An attention-grabbing opening hook that draws viewers in (1-2 sentences)"
}

Make it cinematic, emotionally engaging, and suitable for video adaptation.`;

  let fullResponse = "";
  
  for await (const event of replicate.stream("openai/gpt-4o-mini", {
    input: {
      prompt: userPrompt,
      system_prompt: systemPrompt,
    },
  })) {
    fullResponse += event.toString();
  }

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from GPT-4o-mini response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateStoryFramework(filmTitle: string) {
  const systemPrompt = "You are a professional film writer who creates compelling cinematic stories. Always respond with valid JSON only, no additional text or markdown.";
  
  const userPrompt = `Create a complete story framework for a film titled "${filmTitle}".

Generate a JSON response with the following structure (no markdown, just pure JSON):
{
  "premise": "A 2-3 sentence premise of the film",
  "hook": "A compelling opening hook (1-2 sentences)",
  "genre": "The primary genre (e.g., Sci-Fi, Drama, Thriller, etc.)",
  "tone": "The overall tone (e.g., Dark, Uplifting, Mysterious, etc.)",
  "setting": {
    "location": "Primary location",
    "time": "Time period",
    "weather": "Weather/climate",
    "atmosphere": "Overall atmosphere"
  },
  "characters": [
    {
      "name": "Character name",
      "age": 30,
      "role": "protagonist/antagonist/supporting",
      "description": "Brief character description",
      "actor": "Suggested actor type or name"
    }
  ]
}

Make it cinematic, compelling, and suitable for video generation. Include 3-5 main characters.`;

  let fullResponse = "";
  
  for await (const event of replicate.stream("anthropic/claude-4-sonnet", {
    input: {
      prompt: userPrompt,
      system_prompt: systemPrompt,
    },
  })) {
    fullResponse += event.toString();
  }

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateChapters(filmTitle: string, framework: any, numberOfChapters: number = 5, wordsPerChapter: number = 500) {
  const systemPrompt = "You are a professional film writer who creates compelling cinematic stories. Always respond with valid JSON only, no additional text or markdown.";
  
  const userPrompt = `Based on the following film framework, create ${numberOfChapters} chapters that tell a complete story.

Film Title: ${filmTitle}
Premise: ${framework.premise}
Genre: ${framework.genre}
Tone: ${framework.tone}
Characters: ${framework.characters.map((c: any) => `${c.name} (${c.role})`).join(", ")}

Generate a JSON array of ${numberOfChapters} chapters with this structure (no markdown, just pure JSON):
[
  {
    "chapterNumber": 1,
    "title": "Chapter title",
    "summary": "A detailed summary of approximately ${wordsPerChapter} words describing what happens in this chapter. Include dialogue, emotions, actions, and scene descriptions.",
    "prompt": "Detailed visual description for video generation (50-100 words). Include: camera angles, lighting, action, mood, characters visible, environment details. Be specific and cinematic."
  }
]

IMPORTANT: Each chapter summary must be approximately ${wordsPerChapter} words long. Create rich, detailed narrative content suitable for a film script.

Ensure the chapters flow naturally, build tension, and create a complete narrative arc with beginning, middle, and end.`;

  let fullResponse = "";
  
  for await (const event of replicate.stream("anthropic/claude-4-sonnet", {
    input: {
      prompt: userPrompt,
      system_prompt: systemPrompt,
    },
  })) {
    fullResponse += event.toString();
  }

  const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateScenePrompts(chapterSummary: string, chapterTitle: string, numberOfScenes: number = 3) {
  const systemPrompt = "You are a professional video director who creates detailed scene prompts for AI video generation. Always respond with valid JSON only, no additional text.";
  
  const userPrompt = `Based on the following chapter, create ${numberOfScenes} detailed video scene prompts.

Chapter Title: ${chapterTitle}
Chapter Summary: ${chapterSummary}

Generate a JSON array of ${numberOfScenes} scene prompts (no markdown, just pure JSON):
[
  "Detailed visual description for scene 1 (50-80 words). Include: camera angles, lighting, action, mood, characters visible, environment details. Be specific and cinematic.",
  "Detailed visual description for scene 2...",
  "Detailed visual description for scene 3..."
]

Each prompt should capture a key moment from the chapter and be optimized for AI video generation.`;

  let fullResponse = "";
  
  for await (const event of replicate.stream("openai/gpt-4o-mini", {
    input: {
      prompt: userPrompt,
      system_prompt: systemPrompt,
    },
  })) {
    fullResponse += event.toString();
  }

  const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from GPT response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function downloadVideoToTemp(objectPath: string): Promise<string> {
  const objectStorageService = new ObjectStorageService();
  const signedUrl = await objectStorageService.getSignedDownloadUrl(objectPath);
  
  const tempPath = path.join("/tmp", `video_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video from ${objectPath}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tempPath, buffer);
  
  return tempPath;
}

async function mergeVideosWithFFmpeg(inputPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileListPath = path.join("/tmp", `filelist_${Date.now()}.txt`);
    const fileListContent = inputPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);
    
    console.log(`Merging ${inputPaths.length} videos to ${outputPath}`);
    console.log(`File list content:\n${fileListContent}`);
    
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', fileListPath,
      '-c', 'copy',
      outputPath
    ]);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      fs.unlinkSync(fileListPath);
      
      if (code === 0) {
        console.log(`FFmpeg merge completed successfully`);
        resolve();
      } else {
        console.error(`FFmpeg stderr: ${stderr}`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      fs.unlinkSync(fileListPath);
      reject(err);
    });
  });
}

async function uploadMergedVideo(localPath: string): Promise<{ objectPath: string; publicPath: string }> {
  const objectStorageService = new ObjectStorageService();
  const privateObjectDir = objectStorageService.getPrivateObjectDir();
  const objectId = `merged_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fullPath = `${privateObjectDir}/videos/${objectId}.mp4`;
  
  const { bucketName, objectName } = parseObjectPathInternal(fullPath);
  const { objectStorageClient } = await import('./objectStorage');
  const { setObjectAclPolicy } = await import('./objectAcl');
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  
  const buffer = fs.readFileSync(localPath);
  await file.save(buffer, {
    contentType: 'video/mp4',
    resumable: false,
  });
  
  await setObjectAclPolicy(file, {
    owner: "system",
    visibility: "public",
  });
  
  return {
    objectPath: `/objects/videos/${objectId}.mp4`,
    publicPath: `/objects/videos/${objectId}.mp4`
  };
}

function parseObjectPathInternal(objPath: string): { bucketName: string; objectName: string } {
  if (!objPath.startsWith("/")) {
    objPath = `/${objPath}`;
  }
  const pathParts = objPath.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

function parseDurationToSeconds(duration: string | number | null | undefined): number {
  if (typeof duration === 'number') return duration;
  if (!duration) return 30;
  
  const parts = duration.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return parseInt(duration) || 30;
}

async function mergeChapterVideos(chapter: any): Promise<{ videoUrl: string; objectPath: string; duration: number }> {
  const videoFrames = chapter.videoFrames || [];
  const completedFrames = videoFrames.filter((f: any) => f.status === "completed" && f.objectPath);
  
  if (completedFrames.length === 0) {
    throw new Error(`No completed video frames to merge for chapter ${chapter.chapterNumber}`);
  }
  
  console.log(`Merging ${completedFrames.length} videos for chapter ${chapter.chapterNumber}`);
  
  const tempInputPaths: string[] = [];
  const outputPath = path.join("/tmp", `chapter_${chapter.id}_merged.mp4`);
  
  try {
    for (const frame of completedFrames) {
      const tempPath = await downloadVideoToTemp(frame.objectPath);
      tempInputPaths.push(tempPath);
    }
    
    await mergeVideosWithFFmpeg(tempInputPaths, outputPath);
    
    const uploadResult = await uploadMergedVideo(outputPath);
    
    const estimatedDuration = completedFrames.length * 10;
    
    return {
      videoUrl: uploadResult.publicPath,
      objectPath: uploadResult.objectPath,
      duration: estimatedDuration
    };
  } finally {
    for (const tempPath of tempInputPaths) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (e) {
        console.error(`Failed to cleanup temp file ${tempPath}:`, e);
      }
    }
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (e) {
      console.error(`Failed to cleanup output file ${outputPath}:`, e);
    }
  }
}

async function mergeFinalMovie(chapters: any[], filmId: string): Promise<{ videoUrl: string; objectPath: string; duration: number }> {
  const chaptersWithVideos = chapters
    .filter(c => c.objectPath && c.status === "completed")
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
  
  if (chaptersWithVideos.length === 0) {
    throw new Error(`No completed chapter videos to merge for film ${filmId}`);
  }
  
  console.log(`Merging ${chaptersWithVideos.length} chapter videos for final movie`);
  
  const tempInputPaths: string[] = [];
  const outputPath = path.join("/tmp", `film_${filmId}_final.mp4`);
  
  try {
    for (const chapter of chaptersWithVideos) {
      const tempPath = await downloadVideoToTemp(chapter.objectPath);
      tempInputPaths.push(tempPath);
    }
    
    await mergeVideosWithFFmpeg(tempInputPaths, outputPath);
    
    const uploadResult = await uploadMergedVideo(outputPath);
    
    const totalDuration = chaptersWithVideos.reduce((sum, c) => sum + parseDurationToSeconds(c.duration), 0);
    
    return {
      videoUrl: uploadResult.publicPath,
      objectPath: uploadResult.objectPath,
      duration: totalDuration
    };
  } finally {
    for (const tempPath of tempInputPaths) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (e) {
        console.error(`Failed to cleanup temp file ${tempPath}:`, e);
      }
    }
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (e) {
      console.error(`Failed to cleanup output file ${outputPath}:`, e);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/films", async (req, res) => {
    try {
      const validatedData = insertFilmSchema.parse(req.body);
      const film = await storage.createFilm(validatedData);
      res.json(film);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create film" });
      }
    }
  });

  app.get("/api/films", async (req, res) => {
    try {
      const films = await storage.listFilms();
      res.json(films);
    } catch (error) {
      res.status(500).json({ error: "Failed to list films" });
    }
  });

  app.get("/api/films/:id", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }
      res.json(film);
    } catch (error) {
      res.status(500).json({ error: "Failed to get film" });
    }
  });

  app.post("/api/preview-story", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== "string") {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      const preview = await generateStoryPreview(title);
      res.json(preview);
    } catch (error) {
      console.error("Story preview error:", error);
      res.status(500).json({ error: "Failed to generate story preview" });
    }
  });

  app.get("/api/films/:id/framework", async (req, res) => {
    try {
      const framework = await storage.getStoryFrameworkByFilmId(req.params.id);
      if (!framework) {
        res.status(404).json({ error: "Story framework not found" });
        return;
      }
      res.json(framework);
    } catch (error) {
      res.status(500).json({ error: "Failed to get story framework" });
    }
  });

  app.post("/api/films/:id/framework", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      await storage.updateFilmStatus(req.params.id, "generating");

      const generatedFramework = await generateStoryFramework(film.title);

      const framework = await storage.createStoryFramework({
        filmId: req.params.id,
        ...generatedFramework
      });

      await storage.updateFilmStatus(req.params.id, "draft");

      res.json(framework);
    } catch (error) {
      await storage.updateFilmStatus(req.params.id, "draft");
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        console.error("Framework generation error:", error);
        res.status(500).json({ error: "Failed to generate story framework" });
      }
    }
  });

  app.post("/api/films/:id/generate-chapters", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const framework = await storage.getStoryFrameworkByFilmId(req.params.id);
      if (!framework) {
        res.status(404).json({ error: "Story framework not found. Generate framework first." });
        return;
      }

      await storage.updateFilmStatus(req.params.id, "generating");

      const numberOfChapters = req.body.numberOfChapters || film.chapterCount || 5;
      const wordsPerChapter = film.wordsPerChapter || 500;
      const generatedChapters = await generateChapters(film.title, framework, numberOfChapters, wordsPerChapter);

      const createdChapters = [];
      for (const chapter of generatedChapters) {
        const created = await storage.createChapter({
          filmId: req.params.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          summary: chapter.summary,
          prompt: chapter.prompt,
          status: "pending"
        });
        createdChapters.push(created);
      }

      await storage.updateFilmStatus(req.params.id, "draft");

      res.json(createdChapters);
    } catch (error) {
      await storage.updateFilmStatus(req.params.id, "draft");
      console.error("Chapter generation error:", error);
      res.status(500).json({ error: "Failed to generate chapters" });
    }
  });

  app.get("/api/films/:id/chapters", async (req, res) => {
    try {
      const chapters = await storage.getChaptersByFilmId(req.params.id);
      res.json(chapters);
    } catch (error) {
      res.status(500).json({ error: "Failed to get chapters" });
    }
  });

  app.post("/api/films/:id/chapters", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const validatedData = insertChapterSchema.parse(req.body);
      const chapter = await storage.createChapter({
        ...validatedData,
        filmId: req.params.id
      });

      res.json(chapter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create chapter" });
      }
    }
  });

  app.get("/api/chapters/:id", async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }
      res.json(chapter);
    } catch (error) {
      res.status(500).json({ error: "Failed to get chapter" });
    }
  });

  app.patch("/api/chapters/:id", async (req, res) => {
    try {
      const chapter = await storage.updateChapter(req.params.id, req.body);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }
      res.json(chapter);
    } catch (error) {
      res.status(500).json({ error: "Failed to update chapter" });
    }
  });

  app.post("/api/text-to-video", async (req, res) => {
    try {
      const { 
        prompt, 
        duration = 10, 
        resolution = "1080p",
        model = "kling_21",
        aspect_ratio = "16:9",
        image_url,
        seed
      } = req.body;

      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      const apiKey = process.env.VIDEOGEN_API_KEY;
      if (!apiKey) {
        throw new Error("VIDEOGEN_API_KEY not configured");
      }

      // Create a record in the database first
      const videoRecord = await storage.createGeneratedVideo({
        prompt,
        duration: parseInt(duration),
        resolution,
        model,
        status: "processing"
      });

      // Build request body according to VideogenAPI documentation
      const requestBody: any = {
        model,
        prompt,
        duration: parseInt(duration),
        resolution,
        aspect_ratio
      };

      // Add optional parameters
      if (image_url) {
        requestBody.image_url = image_url;
      }

      if (seed) {
        requestBody.seed = parseInt(seed);
      }

      const response = await fetch("https://videogenapi.com/api/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VideogenAPI error:", errorText);
        await storage.updateGeneratedVideo(videoRecord.id, { status: "failed" });
        res.status(500).json({ error: "Video generation failed", details: errorText });
        return;
      }

      const result = await response.json();
      
      // Update the record with the result
      await storage.updateGeneratedVideo(videoRecord.id, {
        externalId: result.id || result.video_id || result.generation_id,
        videoUrl: result.video_url || result.url,
        status: result.video_url || result.url ? "completed" : "processing"
      });
      
      res.json({
        id: videoRecord.id,
        externalId: result.id || result.video_id || result.generation_id,
        status: result.video_url || result.url ? "completed" : "processing",
        videoUrl: result.video_url || result.url,
        message: result.message || "Video generation started"
      });
    } catch (error) {
      console.error("Text-to-video error:", error);
      res.status(500).json({ error: "Failed to generate video" });
    }
  });

  // Check video generation status
  app.get("/api/videos/:id/check-status", async (req, res) => {
    try {
      const video = await storage.getGeneratedVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }

      // If already completed or failed, return current status
      if (video.status === "completed" || video.status === "failed") {
        res.json(video);
        return;
      }

      // If we have an external ID, check status with VideogenAPI
      if (video.externalId) {
        const apiKey = process.env.VIDEOGEN_API_KEY;
        if (!apiKey) {
          throw new Error("VIDEOGEN_API_KEY not configured");
        }

        const response = await fetch(`https://videogenapi.com/api/v1/status/${video.externalId}`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update local record if video is ready
          if (result.video_url || result.url) {
            const externalVideoUrl = result.video_url || result.url;
            
            // Upload video to Object Storage
            try {
              const objectStorageService = new ObjectStorageService();
              const objectPath = await objectStorageService.uploadVideoFromUrl(externalVideoUrl);
              
              await storage.updateGeneratedVideo(req.params.id, {
                videoUrl: externalVideoUrl,
                objectPath: objectPath,
                status: "completed"
              });
            } catch (uploadError) {
              console.error("Failed to upload to object storage:", uploadError);
              // Still mark as completed even if upload fails
              await storage.updateGeneratedVideo(req.params.id, {
                videoUrl: externalVideoUrl,
                status: "completed"
              });
            }
          } else if (result.status === "failed" || result.status === "error") {
            await storage.updateGeneratedVideo(req.params.id, {
              status: "failed"
            });
          }
          
          const updatedVideo = await storage.getGeneratedVideo(req.params.id);
          res.json(updatedVideo);
          return;
        }
      }

      res.json(video);
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Video Library routes
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.listGeneratedVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error listing videos:", error);
      res.status(500).json({ error: "Failed to list videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getGeneratedVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }
      res.json(video);
    } catch (error) {
      res.status(500).json({ error: "Failed to get video" });
    }
  });

  // Serve videos from Object Storage
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get signed download URL for a video
  app.get("/api/videos/:id/download-url", async (req, res) => {
    try {
      const video = await storage.getGeneratedVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }

      if (video.objectPath) {
        const objectStorageService = new ObjectStorageService();
        const signedUrl = await objectStorageService.getSignedDownloadUrl(video.objectPath);
        res.json({ downloadUrl: signedUrl, objectPath: video.objectPath });
      } else if (video.videoUrl) {
        res.json({ downloadUrl: video.videoUrl });
      } else {
        res.status(404).json({ error: "Video not ready" });
      }
    } catch (error) {
      console.error("Error getting download URL:", error);
      res.status(500).json({ error: "Failed to get download URL" });
    }
  });

  app.post("/api/chapters/:id/generate-video", async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }

      if (!chapter.prompt) {
        res.status(400).json({ error: "Chapter does not have a prompt for video generation" });
        return;
      }

      await storage.updateChapter(req.params.id, { status: "generating" });

      const apiKey = process.env.VIDEOGEN_API_KEY;
      if (!apiKey) {
        throw new Error("VIDEOGEN_API_KEY not configured");
      }

      const response = await fetch("https://videogenapi.com/api/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "sora-2",
          prompt: chapter.prompt,
          duration: 10,
          resolution: "1080p"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VideogenAPI error:", errorText);
        await storage.updateChapter(req.params.id, { status: "failed" });
        res.status(500).json({ error: "Video generation failed", details: errorText });
        return;
      }

      const result = await response.json();
      
      await storage.updateChapter(req.params.id, { 
        status: "completed",
        videoUrl: result.video_url || result.url,
        metadata: {
          ...chapter.metadata,
          resolution: "720p"
        }
      });

      const updatedChapter = await storage.getChapter(req.params.id);
      res.json(updatedChapter);
    } catch (error) {
      console.error("Video generation error:", error);
      await storage.updateChapter(req.params.id, { status: "failed" });
      res.status(500).json({ error: "Failed to generate video" });
    }
  });

  // Start full film generation pipeline
  app.post("/api/films/:id/start-generation", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      // Allow starting if idle, failed, or generating_chapters (newly created films)
      const allowedStages = ["idle", "failed", "generating_chapters"];
      if (!allowedStages.includes(film.generationStage || "idle")) {
        res.status(400).json({ error: "Film generation already in progress" });
        return;
      }

      // Start the pipeline in background
      res.json({ message: "Film generation started", filmId: film.id });

      // Run the pipeline asynchronously
      runFilmGenerationPipeline(film.id).catch(async (error) => {
        console.error("Pipeline error:", error);
        await storage.updateFilm(film.id, { generationStage: "failed" });
      });
    } catch (error) {
      console.error("Start generation error:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  return httpServer;
}

// Helper function to poll video generation status
async function pollVideoStatus(externalId: string, maxAttempts: number = 60): Promise<{ videoUrl?: string; status: string }> {
  const apiKey = process.env.VIDEOGEN_API_KEY;
  if (!apiKey) {
    throw new Error("VIDEOGEN_API_KEY not configured");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`https://videogenapi.com/api/v1/status/${externalId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const videoUrl = result.video_url || result.url;
        
        if (videoUrl) {
          return { videoUrl, status: "completed" };
        }
        
        if (result.status === "failed" || result.status === "error") {
          return { status: "failed" };
        }
      }
    } catch (error) {
      console.error("Poll error:", error);
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return { status: "timeout" };
}

// Main film generation pipeline
async function runFilmGenerationPipeline(filmId: string) {
  console.log(`Starting film generation pipeline for film ${filmId}`);
  
  const apiKey = process.env.VIDEOGEN_API_KEY;
  if (!apiKey) {
    throw new Error("VIDEOGEN_API_KEY not configured");
  }

  // Step 1: Update stage to generating_chapters
  await storage.updateFilm(filmId, { generationStage: "generating_chapters" });
  
  const film = await storage.getFilm(filmId);
  if (!film) throw new Error("Film not found");

  // Step 2: Check if framework exists, if not generate it
  let framework = await storage.getStoryFrameworkByFilmId(filmId);
  if (!framework) {
    console.log("Generating story framework...");
    const generatedFramework = await generateStoryFramework(film.title);
    framework = await storage.createStoryFramework({
      filmId,
      ...generatedFramework
    });
  }

  // Step 3: Check if chapters exist, if not generate them
  let chapters = await storage.getChaptersByFilmId(filmId);
  if (chapters.length === 0) {
    console.log("Generating chapters...");
    const numberOfChapters = film.chapterCount || 5;
    const wordsPerChapter = film.wordsPerChapter || 500;
    const generatedChapters = await generateChapters(film.title, framework, numberOfChapters, wordsPerChapter);
    
    for (const chapter of generatedChapters) {
      await storage.createChapter({
        filmId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        summary: chapter.summary,
        prompt: chapter.prompt,
        status: "pending"
      });
    }
    chapters = await storage.getChaptersByFilmId(filmId);
  }

  // Step 4: Update stage to generating_prompts
  await storage.updateFilm(filmId, { generationStage: "generating_prompts" });

  // Step 5: Generate scene prompts for each chapter
  for (const chapter of chapters) {
    if (!chapter.scenePrompts || chapter.scenePrompts.length === 0) {
      console.log(`Generating scene prompts for chapter ${chapter.chapterNumber}...`);
      await storage.updateChapter(chapter.id, { status: "generating_prompts" });
      
      const scenePrompts = await generateScenePrompts(chapter.summary, chapter.title, 3);
      
      // Create videoFrames array with pending status
      const videoFrames = scenePrompts.map((prompt: string, index: number) => ({
        frameNumber: index + 1,
        prompt,
        status: "pending"
      }));

      await storage.updateChapter(chapter.id, { 
        scenePrompts,
        videoFrames,
        status: "generating_videos"
      });
    }
  }

  // Refresh chapters after prompt generation
  chapters = await storage.getChaptersByFilmId(filmId);

  // Step 6: Update stage to generating_videos
  await storage.updateFilm(filmId, { generationStage: "generating_videos" });

  // Step 7: Generate videos for each scene prompt
  for (const chapter of chapters) {
    if (chapter.status === "completed" || chapter.status === "merging") {
      continue; // Skip already completed chapters
    }

    const videoFrames = chapter.videoFrames || [];
    let updatedFrames = [...videoFrames];
    let allCompleted = true;

    for (let i = 0; i < updatedFrames.length; i++) {
      const frame = updatedFrames[i];
      
      if (frame.status === "completed" && frame.videoUrl) {
        continue; // Skip already completed frames
      }

      console.log(`Generating video for chapter ${chapter.chapterNumber}, frame ${frame.frameNumber}...`);
      
      try {
        // Start video generation
        const response = await fetch("https://videogenapi.com/api/v1/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: film.videoModel || "kling_21",
            prompt: frame.prompt,
            duration: 10,
            resolution: film.frameSize || "1080p",
            aspect_ratio: "16:9"
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Video generation failed for frame ${frame.frameNumber}:`, errorText);
          updatedFrames[i] = { ...frame, status: "failed" };
          allCompleted = false;
          continue;
        }

        const result = await response.json();
        const externalId = result.id || result.video_id || result.generation_id;

        // Check if video URL is immediately available
        let videoUrl = result.video_url || result.url;

        if (!videoUrl && externalId) {
          // Poll for completion
          updatedFrames[i] = { ...frame, status: "processing", externalId };
          await storage.updateChapter(chapter.id, { videoFrames: updatedFrames });

          const pollResult = await pollVideoStatus(externalId);
          if (pollResult.videoUrl) {
            videoUrl = pollResult.videoUrl;
          } else {
            console.error(`Video generation timeout for frame ${frame.frameNumber}`);
            updatedFrames[i] = { ...frame, status: "failed", externalId };
            allCompleted = false;
            continue;
          }
        }

        // Upload to object storage
        try {
          const objectStorageService = new ObjectStorageService();
          const objectPath = await objectStorageService.uploadVideoFromUrl(videoUrl);
          updatedFrames[i] = { 
            ...frame, 
            status: "completed", 
            videoUrl, 
            objectPath,
            externalId 
          };
        } catch (uploadError) {
          console.error("Failed to upload to object storage:", uploadError);
          updatedFrames[i] = { 
            ...frame, 
            status: "completed", 
            videoUrl,
            externalId 
          };
        }

        // Update chapter with progress
        await storage.updateChapter(chapter.id, { videoFrames: updatedFrames });

      } catch (error) {
        console.error(`Error generating video for frame ${frame.frameNumber}:`, error);
        updatedFrames[i] = { ...frame, status: "failed" };
        allCompleted = false;
      }
    }

    // Update chapter status
    if (allCompleted) {
      await storage.updateChapter(chapter.id, { 
        videoFrames: updatedFrames,
        status: "merging"
      });
    } else {
      await storage.updateChapter(chapter.id, { 
        videoFrames: updatedFrames,
        status: "failed"
      });
    }
  }

  // Step 8: Merge chapter videos
  await storage.updateFilm(filmId, { generationStage: "merging_chapters" });
  
  chapters = await storage.getChaptersByFilmId(filmId);
  for (const chapter of chapters) {
    if (chapter.status === "merging") {
      try {
        console.log(`Merging videos for chapter ${chapter.chapterNumber}...`);
        const mergeResult = await mergeChapterVideos(chapter);
        
        await storage.updateChapter(chapter.id, { 
          status: "completed",
          videoUrl: mergeResult.videoUrl,
          objectPath: mergeResult.objectPath,
          duration: `00:${String(mergeResult.duration).padStart(2, '0')}`
        });
        
        console.log(`Chapter ${chapter.chapterNumber} merged successfully: ${mergeResult.objectPath}`);
      } catch (mergeError) {
        console.error(`Failed to merge chapter ${chapter.chapterNumber}:`, mergeError);
        await storage.updateChapter(chapter.id, { status: "failed" });
      }
    }
  }

  // Step 9: Merge all chapter videos into final movie
  await storage.updateFilm(filmId, { generationStage: "merging_final" });
  
  chapters = await storage.getChaptersByFilmId(filmId);
  const completedChapters = chapters.filter(c => c.status === "completed" && c.objectPath);
  
  if (completedChapters.length > 0) {
    try {
      console.log(`Merging ${completedChapters.length} chapters into final movie...`);
      const finalResult = await mergeFinalMovie(completedChapters, filmId);
      
      await storage.updateFilm(filmId, { 
        generationStage: "completed",
        finalVideoUrl: finalResult.videoUrl,
        finalVideoPath: finalResult.objectPath
      });
      
      console.log(`Final movie merged successfully: ${finalResult.objectPath}`);
    } catch (finalMergeError) {
      console.error(`Failed to merge final movie:`, finalMergeError);
      await storage.updateFilm(filmId, { generationStage: "failed" });
    }
  } else {
    console.log(`No completed chapters to merge for final movie`);
    await storage.updateFilm(filmId, { generationStage: "completed" });
  }
  
  console.log(`Film generation pipeline completed for film ${filmId}`);
}
