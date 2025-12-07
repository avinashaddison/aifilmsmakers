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

// Hollywood Screenplay 18-Chapter Structure Configuration
const HOLLYWOOD_CHAPTER_CONFIG: Record<string, {
  title: string;
  wordCount: number;
  phase: string;
  description: string;
  requirements: string;
}> = {
  hook: {
    title: "The Hook",
    wordCount: 150,
    phase: "Opening",
    description: "A glimpse of the ending without context or explanation",
    requirements: `Write ONLY 150 words. This is a flash-forward scene showing a powerful moment from the climax.
- Show the protagonist at their most vulnerable or powerful moment
- Include a symbolic artifact that will gain meaning later
- Create mystery - the reader should not understand WHY this is happening
- Use present tense, visceral sensory details
- End mid-action, leaving the reader desperate to understand`
  },
  intro_1: {
    title: "Before the Fall",
    wordCount: 850,
    phase: "Act 1 - World Building",
    description: "Introduction to the protagonist's ordinary world",
    requirements: `Write 800-900 words. Establish the protagonist's world BEFORE everything changes.
- Introduce the protagonist through action, not description
- Show their daily routines, environment, relationships
- Hint at their internal flaw or wound without stating it directly
- Introduce the artifact in its ordinary context
- Create sensory-rich descriptions of their world
- Plant seeds of what they're about to lose`
  },
  intro_2: {
    title: "Quiet Routines & Hidden Cracks",
    wordCount: 850,
    phase: "Act 1 - World Building",
    description: "Deeper exploration of relationships and subtle flaws",
    requirements: `Write 800-900 words. Deepen the world while revealing hidden tensions.
- Show the protagonist's key relationships in action
- Reveal their character flaw through behavior, not exposition
- Include moments of irony (what they don't know is coming)
- The artifact appears again in a meaningful context
- Small moments of foreshadowing
- Build reader investment in this world before it shatters`
  },
  intro_3: {
    title: "The Life They Thought They Had",
    wordCount: 850,
    phase: "Act 1 - World Building",
    description: "The final moments of normalcy before disruption",
    requirements: `Write 800-900 words. This is the last moment of peace.
- Create a sense of false security and contentment
- Show the protagonist making plans or assumptions about the future
- Include a pivotal relationship moment
- The artifact appears in a way that seems insignificant
- Build dramatic irony - readers should feel dread
- End with subtle warning signs that something is about to change`
  },
  inciting_incident: {
    title: "The First Disturbance",
    wordCount: 850,
    phase: "Act 1 - Inciting Incident",
    description: "The event that disrupts the protagonist's world",
    requirements: `Write 800-900 words. This is the moment everything changes.
- Create a clear, specific disrupting event
- Show the protagonist's immediate visceral reaction
- The event should feel both surprising and inevitable
- The artifact gains new significance or appears in a new context
- Other characters should react, showing the ripple effects
- End with the protagonist in uncertainty - their old world is gone`
  },
  early_dev_1: {
    title: "Shockwaves",
    wordCount: 850,
    phase: "Act 2 - Rising Action",
    description: "The immediate aftermath and spreading effects of the disruption",
    requirements: `Write 800-900 words. Show how the disruption spreads through the protagonist's life.
- Multiple areas of life begin to be affected
- The protagonist tries to process what happened
- Relationships begin to shift or strain
- New conflicts emerge from the initial incident
- The artifact becomes a point of emotional focus
- Build a sense of mounting pressure`
  },
  early_dev_2: {
    title: "Attempts to Restore Control",
    wordCount: 850,
    phase: "Act 2 - Rising Action",
    description: "The protagonist's first attempts to fix things (which fail)",
    requirements: `Write 800-900 words. Show the protagonist's doomed attempts to restore normalcy.
- They try logical, reasonable solutions that don't work
- Their character flaw begins to sabotage their efforts
- Secondary characters may offer help or hindrance
- The artifact serves as a reminder of what was lost
- Each attempt should fail in a way that raises stakes
- Build frustration and desperation`
  },
  early_dev_3: {
    title: "Complications & Subplots",
    wordCount: 850,
    phase: "Act 2 - Rising Action",
    description: "New problems emerge, secondary characters take focus",
    requirements: `Write 800-900 words. Expand the story's scope with complications.
- Introduce or deepen secondary storylines
- New obstacles emerge that weren't anticipated
- A secondary character faces their own crisis
- The artifact appears in connection with another character
- Create moments of dark humor or brief respite
- Weave together multiple threads of tension`
  },
  middle_dev_1: {
    title: "The Deepening Storm",
    wordCount: 850,
    phase: "Act 2 - Midpoint",
    description: "Escalation of conflicts, raising stakes significantly",
    requirements: `Write 800-900 words. Intensify every conflict dramatically.
- Stakes become personal and immediate
- The protagonist makes a crucial decision or discovery
- A major relationship is tested or damaged
- The artifact reveals hidden meaning or history
- Create a sense that there's no going back
- Build toward a point of no return`
  },
  middle_dev_2: {
    title: "Truths Rising from the Past",
    wordCount: 850,
    phase: "Act 2 - Midpoint",
    description: "Revelations about characters' histories and hidden truths",
    requirements: `Write 800-900 words. Uncover secrets and hidden histories.
- A significant truth about the past is revealed
- This revelation reframes earlier events
- Characters must confront uncomfortable truths
- The artifact is connected to this revelation
- Relationships shift based on new understanding
- Create emotional complexity - truth is liberating but painful`
  },
  middle_dev_3: {
    title: "The Breaking Point",
    wordCount: 850,
    phase: "Act 2 - Midpoint",
    description: "The protagonist's emotional and psychological collapse",
    requirements: `Write 800-900 words. Show the protagonist at their lowest.
- Their usual coping mechanisms fail completely
- A moment of complete vulnerability or breakdown
- They may lash out or retreat from others
- The artifact becomes a focal point of their pain
- This is their "dark night of the soul"
- End with them seemingly defeated, but a spark of change`
  },
  plot_twist: {
    title: "The Plot Twist",
    wordCount: 1500,
    phase: "Act 2 - Major Revelation",
    description: "A major revelation that changes everything the reader thought they knew",
    requirements: `Write 1400-1500 words. This is the story's major turning point.
- Reveal a truth that reframes the entire narrative
- This revelation should be surprising but inevitable in hindsight
- Plant payoffs for earlier foreshadowing
- The artifact's true significance is revealed
- Multiple characters are affected by this truth
- Create a moment of profound realization
- Show immediate emotional fallout
- This chapter should feel like the story breaking open
- End with the protagonist fundamentally changed by this knowledge`
  },
  climax_build_1: {
    title: "Aftermath of the Truth",
    wordCount: 850,
    phase: "Act 3 - Rising to Climax",
    description: "Processing the revelation and its implications",
    requirements: `Write 800-900 words. Show characters absorbing the truth.
- The protagonist processes what they've learned
- Relationships reconfigure around the new reality
- Some characters reject the truth, others embrace it
- The artifact takes on new meaning post-revelation
- Begin to see the path forward, however difficult
- Plant seeds for the final confrontation`
  },
  climax_build_2: {
    title: "Final Preparations",
    wordCount: 850,
    phase: "Act 3 - Rising to Climax",
    description: "Gathering strength and resources for the final confrontation",
    requirements: `Write 800-900 words. The protagonist prepares for what must be done.
- Concrete preparations for a final action or confrontation
- Moments of reconnection with key allies
- The protagonist accepts what they must sacrifice
- The artifact is prepared or positioned for its final role
- Quiet moments of resolution before the storm
- Build anticipation for the climax`
  },
  climax_build_3: {
    title: "Walking into the Storm",
    wordCount: 850,
    phase: "Act 3 - Rising to Climax",
    description: "The march toward the final confrontation",
    requirements: `Write 800-900 words. The protagonist moves toward their destiny.
- Physical and emotional journey toward the climax
- Moments of doubt and determination
- Final words with key characters
- The artifact accompanies them on this journey
- Build tension and inevitability
- End poised on the edge of the final scene`
  },
  climax: {
    title: "The Climax",
    wordCount: 1100,
    phase: "Act 3 - Climax",
    description: "The final confrontation - return to the scene from the Hook",
    requirements: `Write 1000-1200 words. Return to the Hook scene with full context.
- Recreate the opening scene, but now the reader understands everything
- The protagonist faces their greatest challenge
- Their character flaw is either overcome or defines their failure
- The artifact plays its crucial final role
- Maximum emotional intensity
- All storylines converge in this moment
- The outcome should feel both surprising and inevitable`
  },
  resolution_1: {
    title: "The Dust Settles",
    wordCount: 850,
    phase: "Resolution",
    description: "Immediate aftermath of the climax",
    requirements: `Write 800-900 words. Show the immediate aftermath.
- The dust literally and metaphorically settles
- Surviving characters process what happened
- Consequences of the climax become clear
- The artifact's final state reflects the story's outcome
- Moments of grief, relief, or bittersweet victory
- Begin to show the new normal emerging`
  },
  resolution_2: {
    title: "The Final Reflection",
    wordCount: 650,
    phase: "Resolution",
    description: "Poetic closing that echoes the beginning",
    requirements: `Write 600-700 words. A quiet, reflective ending.
- Mirror imagery or scenes from the opening chapters
- Show how the protagonist has changed
- The artifact in its final resting place or context
- Leave some questions for the reader to ponder
- End on an image or moment that encapsulates the journey
- Create a sense of completion but not perfect closure`
  }
};

// Hollywood screenplay base writing style requirements
const HOLLYWOOD_STYLE_REQUIREMENTS = `
WRITING STYLE REQUIREMENTS:
- Write in third-person limited perspective
- Use mature, literary prose - no slang or modern jargon
- Create slow-burn, atmospheric tension
- Use "." for pauses, never use "..."
- Include rich sensory details: sight, sound, smell, touch, taste
- Show emotions through physical sensations and actions
- Dialogue should feel natural but purposeful
- Every scene should advance character or plot
- Maintain consistent tone throughout`;

async function generateHollywoodChapter(
  filmTitle: string,
  framework: any,
  chapterNumber: number,
  chapterType: string,
  previousChapters: Array<{title: string; summary: string; chapterType: string; artifact?: any}>,
  hookContent?: string
): Promise<{
  chapterNumber: number;
  chapterType: string;
  title: string;
  summary: string;
  prompt: string;
  artifact: { name: string; description: string; significance: string };
}> {
  const config = HOLLYWOOD_CHAPTER_CONFIG[chapterType];
  if (!config) {
    throw new Error(`Unknown chapter type: ${chapterType}`);
  }

  const systemPrompt = `You are an award-winning screenwriter crafting a Hollywood-quality screenplay. You write with the depth of literary fiction and the pacing of cinema. Always respond with valid JSON only, no additional text or markdown.`;

  const previousContext = previousChapters.length > 0
    ? `\n\nPREVIOUS CHAPTERS FOR CONTINUITY:\n${previousChapters.map((c, i) => 
        `Chapter ${i + 1} (${c.chapterType}): "${c.title}"\nArtifact: ${c.artifact?.name || 'N/A'}\nSummary excerpt: ${c.summary.substring(0, 300)}...`
      ).join('\n\n')}`
    : '';

  const hookReference = hookContent && chapterType === 'climax'
    ? `\n\nHOOK SCENE TO RECREATE WITH FULL CONTEXT:\n${hookContent}\n\nThis climax must return to this scene. The reader now understands what led here.`
    : '';

  const artifactGuidance = chapterNumber === 1
    ? 'Create a meaningful symbolic artifact that will recur throughout the story. It should be a physical object with emotional resonance.'
    : 'Reference the recurring artifact established in earlier chapters. Show its evolving significance.';

  const userPrompt = `Create ${config.title} (Chapter ${chapterNumber} of 18) for a Hollywood screenplay.

FILM DETAILS:
Title: "${filmTitle}"
Premise: ${framework.premise}
Genres: ${Array.isArray(framework.genres) ? framework.genres.join(', ') : framework.genre}
Tone: ${framework.tone}
Setting: ${JSON.stringify(framework.setting)}
Characters: ${framework.characters.map((c: any) => `${c.name} (${c.role}): ${c.description}`).join('\n')}
${previousContext}
${hookReference}

CHAPTER REQUIREMENTS:
Phase: ${config.phase}
Purpose: ${config.description}
Target Word Count: ${config.wordCount} words

SPECIFIC INSTRUCTIONS:
${config.requirements}

ARTIFACT GUIDANCE:
${artifactGuidance}

${HOLLYWOOD_STYLE_REQUIREMENTS}

Generate a JSON response with this exact structure:
{
  "chapterNumber": ${chapterNumber},
  "chapterType": "${chapterType}",
  "title": "A compelling, evocative chapter title (3-6 words)",
  "summary": "The full chapter narrative of exactly ${config.wordCount} words. Write the complete scene with dialogue, action, description, and emotional depth.",
  "prompt": "A detailed visual prompt for AI video generation (80-120 words). Include: specific camera movements, lighting mood, character positions, key actions, environment details, color palette, and emotional atmosphere.",
  "artifact": {
    "name": "The artifact's name",
    "description": "Physical description of the artifact",
    "significance": "What it symbolizes or represents in this chapter"
  }
}`;

  let fullResponse = "";
  
  for await (const event of replicate.stream("anthropic/claude-4-sonnet", {
    input: {
      prompt: userPrompt,
      system_prompt: systemPrompt,
      max_tokens: 4000,
    },
  })) {
    fullResponse += event.toString();
  }

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse JSON from Claude response for Hollywood chapter ${chapterNumber} (${chapterType})`);
  }

  return JSON.parse(jsonMatch[0]);
}

// Get chapter type for a given chapter number in Hollywood mode
function getHollywoodChapterType(chapterNumber: number): string {
  const chapterTypes = [
    "hook", "intro_1", "intro_2", "intro_3", "inciting_incident",
    "early_dev_1", "early_dev_2", "early_dev_3",
    "middle_dev_1", "middle_dev_2", "middle_dev_3",
    "plot_twist", "climax_build_1", "climax_build_2", "climax_build_3",
    "climax", "resolution_1", "resolution_2"
  ];
  return chapterTypes[chapterNumber - 1] || "intro_1";
}

// Get word count for a Hollywood chapter type
function getHollywoodWordCount(chapterType: string): number {
  return HOLLYWOOD_CHAPTER_CONFIG[chapterType]?.wordCount || 850;
}

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
  "genres": ["Primary Genre", "Secondary Genre", "Tertiary Genre"],
  "premise": "A detailed 4-6 sentence premise that sets up the world, introduces the main character with their backstory, establishes their current situation, and hints at the conflict to come. Be vivid and descriptive, painting a clear picture of the story's foundation.",
  "hook": "A compelling 3-4 sentence opening hook that draws viewers in immediately. Describe the opening scene, the mood, and what question or mystery will keep the audience watching. Make it cinematic and emotionally engaging.",
  "tone": "The overall tone (e.g., Dark, Uplifting, Mysterious, etc.)",
  "setting": {
    "location": "Primary location with vivid details",
    "time": "Time period",
    "weather": "Weather/climate that enhances the mood",
    "atmosphere": "Overall atmosphere and visual style"
  },
  "characters": [
    {
      "name": "Character name",
      "age": 30,
      "role": "protagonist/antagonist/supporting",
      "description": "Detailed character description including personality, motivations, and arc",
      "actor": "Suggested actor type or name"
    }
  ]
}

IMPORTANT: 
- Include 2-3 genres that best describe the film
- The premise should be a full detailed paragraph (100-150 words)
- The hook should be a gripping opening that makes viewers want to watch (80-120 words)
- Include 3-5 main characters with rich descriptions

Make it cinematic, compelling, and suitable for video generation.`;

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
    throw new Error("Could not parse JSON from GPT response");
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

async function generateSingleChapter(
  filmTitle: string, 
  framework: any, 
  chapterNumber: number, 
  totalChapters: number, 
  wordsPerChapter: number,
  previousChapters: Array<{title: string; summary: string}>
) {
  const systemPrompt = "You are a professional film writer who creates compelling cinematic stories. Always respond with valid JSON only, no additional text or markdown.";
  
  const previousContext = previousChapters.length > 0 
    ? `\n\nPrevious chapters for context:\n${previousChapters.map((c, i) => `Chapter ${i+1}: ${c.title} - ${c.summary.substring(0, 200)}...`).join('\n')}`
    : '';
  
  const positionHint = chapterNumber === 1 
    ? "This is the OPENING chapter - establish the world, introduce the protagonist, and set up the initial situation."
    : chapterNumber === totalChapters 
    ? "This is the FINAL chapter - bring the story to a satisfying conclusion, resolve conflicts, and deliver emotional payoff."
    : chapterNumber <= Math.floor(totalChapters / 3)
    ? "This is an early chapter - continue building the world and deepen character development."
    : chapterNumber <= Math.floor(2 * totalChapters / 3)
    ? "This is a middle chapter - escalate conflicts, raise stakes, and drive the story forward."
    : "This is a late chapter - build toward the climax with increasing tension.";
  
  const userPrompt = `Based on the following film framework, create chapter ${chapterNumber} of ${totalChapters}.

Film Title: ${filmTitle}
Premise: ${framework.premise}
Genres: ${Array.isArray(framework.genres) ? framework.genres.join(', ') : framework.genre}
Hook: ${framework.hook}
${previousContext}

${positionHint}

Generate a JSON object for this single chapter (no markdown, just pure JSON):
{
  "chapterNumber": ${chapterNumber},
  "title": "A compelling chapter title",
  "summary": "A detailed narrative of approximately ${wordsPerChapter} words describing what happens in this chapter. Include vivid descriptions, character emotions, dialogue snippets, and scene details.",
  "prompt": "Detailed visual description for video generation (50-100 words). Include: camera angles, lighting, action, mood, characters visible, environment details. Be specific and cinematic."
}

IMPORTANT: The summary must be approximately ${wordsPerChapter} words. Make it rich, cinematic, and emotionally engaging.`;

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
    throw new Error("Could not parse JSON from Claude response for chapter " + chapterNumber);
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
  // Expose Hollywood chapter configuration for frontend
  app.get("/api/hollywood-chapters-config", (req, res) => {
    const config = Object.entries(HOLLYWOOD_CHAPTER_CONFIG).map(([type, data]) => ({
      type,
      ...data
    }));
    res.json(config);
  });

  app.post("/api/generate-framework", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== "string") {
        res.status(400).json({ error: "Title is required" });
        return;
      }
      const framework = await generateStoryFramework(title);
      res.json(framework);
    } catch (error) {
      console.error("Error generating framework:", error);
      res.status(500).json({ error: "Failed to generate framework" });
    }
  });

  app.post("/api/generate-chapters-stream", async (req, res) => {
    try {
      const { title, framework, chapterCount, wordsPerChapter, filmMode } = req.body;
      
      if (!title || !framework) {
        res.status(400).json({ error: "Title and framework are required" });
        return;
      }
      
      const isHollywood = filmMode === "hollywood_screenplay";
      const totalChapters = isHollywood ? 18 : (chapterCount || 5);
      const words = wordsPerChapter || 500;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      // For Hollywood mode, track chapters with their types and artifacts
      const previousHollywoodChapters: Array<{title: string; summary: string; chapterType: string; artifact?: any}> = [];
      const previousChapters: Array<{title: string; summary: string}> = [];
      let hookContent: string | undefined;
      
      for (let i = 1; i <= totalChapters; i++) {
        try {
          const chapterType = isHollywood ? getHollywoodChapterType(i) : undefined;
          const chapterConfig = chapterType ? HOLLYWOOD_CHAPTER_CONFIG[chapterType] : null;
          
          res.write(`data: ${JSON.stringify({ 
            type: 'generating', 
            chapterNumber: i, 
            totalChapters,
            chapterType,
            chapterTitle: chapterConfig?.title,
            phase: chapterConfig?.phase
          })}\n\n`);
          
          if (isHollywood && chapterType) {
            // Use Hollywood-specific generation
            const chapter = await generateHollywoodChapter(
              title,
              framework,
              i,
              chapterType,
              previousHollywoodChapters,
              chapterType === 'climax' ? hookContent : undefined
            );
            
            // Store hook content for climax callback
            if (chapterType === 'hook') {
              hookContent = chapter.summary;
            }
            
            previousHollywoodChapters.push({ 
              title: chapter.title, 
              summary: chapter.summary,
              chapterType: chapter.chapterType,
              artifact: chapter.artifact
            });
            
            res.write(`data: ${JSON.stringify({ type: 'chapter', chapter })}\n\n`);
          } else {
            // Use standard generation for short films
            const chapter = await generateSingleChapter(
              title,
              framework,
              i,
              totalChapters,
              words,
              previousChapters
            );
            
            previousChapters.push({ title: chapter.title, summary: chapter.summary });
            
            res.write(`data: ${JSON.stringify({ type: 'chapter', chapter })}\n\n`);
          }
        } catch (chapterError) {
          console.error(`Error generating chapter ${i}:`, chapterError);
          res.write(`data: ${JSON.stringify({ type: 'error', chapterNumber: i, error: 'Failed to generate chapter' })}\n\n`);
        }
      }
      
      res.write(`data: ${JSON.stringify({ type: 'complete', totalChapters })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in chapter streaming:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate chapters" });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
        res.end();
      }
    }
  });

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

      const isHollywood = film.filmMode === "hollywood_screenplay";
      const numberOfChapters = isHollywood ? 18 : (req.body.numberOfChapters || film.chapterCount || 5);
      const wordsPerChapter = film.wordsPerChapter || 500;
      
      const createdChapters = [];
      
      if (isHollywood) {
        // Generate Hollywood chapters one by one with specialized prompts
        const previousHollywoodChapters: Array<{title: string; summary: string; chapterType: string; artifact?: any}> = [];
        let hookContent: string | undefined;
        
        for (let i = 1; i <= numberOfChapters; i++) {
          const chapterType = getHollywoodChapterType(i);
          
          const chapter = await generateHollywoodChapter(
            film.title,
            framework,
            i,
            chapterType,
            previousHollywoodChapters,
            chapterType === 'climax' ? hookContent : undefined
          );
          
          // Store hook content for climax callback
          if (chapterType === 'hook') {
            hookContent = chapter.summary;
          }
          
          previousHollywoodChapters.push({
            title: chapter.title,
            summary: chapter.summary,
            chapterType: chapter.chapterType,
            artifact: chapter.artifact
          });
          
          const created = await storage.createChapter({
            filmId: req.params.id,
            chapterNumber: chapter.chapterNumber,
            chapterType: chapter.chapterType,
            title: chapter.title,
            summary: chapter.summary,
            prompt: chapter.prompt,
            artifact: chapter.artifact,
            status: "pending"
          });
          createdChapters.push(created);
        }
      } else {
        // Standard short film generation
        const generatedChapters = await generateChapters(film.title, framework, numberOfChapters, wordsPerChapter);

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
