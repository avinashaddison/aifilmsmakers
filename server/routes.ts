import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFilmSchema, insertStoryFrameworkSchema, insertChapterSchema } from "@shared/schema";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

async function generateStoryFramework(filmTitle: string) {
  const prompt = `You are a professional film writer. Create a complete story framework for a film titled "${filmTitle}".

Generate a JSON response with the following structure:
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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateChapters(filmTitle: string, framework: any, numberOfChapters: number = 5) {
  const prompt = `You are a professional film writer. Based on the following film framework, create ${numberOfChapters} chapters that tell a complete story.

Film Title: ${filmTitle}
Premise: ${framework.premise}
Genre: ${framework.genre}
Tone: ${framework.tone}
Characters: ${framework.characters.map((c: any) => `${c.name} (${c.role})`).join(", ")}

Generate a JSON array of ${numberOfChapters} chapters with this structure:
[
  {
    "chapterNumber": 1,
    "title": "Chapter title",
    "summary": "3-4 sentence summary of what happens in this chapter",
    "prompt": "Detailed visual description for video generation (50-100 words). Include: camera angles, lighting, action, mood, characters visible, environment details. Be specific and cinematic."
  }
]

Ensure the chapters flow naturally, build tension, and create a complete narrative arc with beginning, middle, and end.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  return JSON.parse(jsonMatch[0]);
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

      const numberOfChapters = req.body.numberOfChapters || 5;
      const generatedChapters = await generateChapters(film.title, framework, numberOfChapters);

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
        model = "sora-2",
        aspect_ratio = "16:9",
        add_audio = false,
        audio_prompt,
        image_url
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

      // Build request body
      const requestBody: any = {
        model,
        prompt,
        duration: parseInt(duration),
        resolution,
        aspect_ratio
      };

      // Add optional parameters
      if (add_audio) {
        requestBody.add_audio = true;
        if (audio_prompt) {
          requestBody.audio_prompt = audio_prompt;
        }
      }

      if (image_url) {
        requestBody.image_url = image_url;
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

  return httpServer;
}
