import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertFilmSchema, insertStoryFrameworkSchema, insertChapterSchema } from "@shared/schema";
import { z } from "zod";
import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

// WebSocket clients map (filmId -> Set of clients)
const filmClients = new Map<string, Set<WebSocket>>();

// Broadcast to all clients watching a specific film
function broadcastToFilm(filmId: string, message: object) {
  const clients = filmClients.get(filmId);
  if (clients) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

// Helper to emit structured film events
function emitFilmEvent(filmId: string, eventType: string, payload: object) {
  broadcastToFilm(filmId, {
    type: eventType,
    filmId,
    timestamp: Date.now(),
    ...payload
  });
}

// Anthropic client using Replit AI Integrations (no API key required)
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Hollywood Screenplay 18-Chapter Structure Configuration
// Based on professional Hollywood screenplay template
const HOLLYWOOD_CHAPTER_CONFIG: Record<string, {
  title: string;
  wordCount: number;
  phase: string;
  description: string;
  requirements: string;
}> = {
  hook: {
    title: "The Shattering Moment",
    wordCount: 150,
    phase: "Opening",
    description: "A devastating glimpse of the ending without context",
    requirements: `MANDATORY: Write EXACTLY 150 words. Not 149. Not 151. Exactly 150.

Open with a devastating, visually rich moment taken directly from the climax or near-end of the film.

Requirements:
- Heavy emotional weight
- A sense of irreversible loss
- Trembling hands
- A broken symbolic object
- A decision that cannot be undone
- Atmospheric detail (weather, light, texture, sound)
- Mystery: nothing is explained

The viewer must silently think: "Dear God. what happened here."

No call-to-action. Pure cinematic pain.`
  },
  intro_1: {
    title: "Before the Fall",
    wordCount: 850,
    phase: "Act 1 - World Building",
    description: "The protagonist's world in its former stability",
    requirements: `Write 800-900 words. Show the protagonist's world in its former stability.

Build emotional investment through:
- Slow, atmospheric description
- Rich sensory detail (light, texture, sound, weather)
- Daily routines that feel deeply lived
- Hints of buried regret or quiet longing
- The symbolic object in its ordinary, meaningful context

This is a world worth losing.`
  },
  intro_2: {
    title: "Quiet Routines & Hidden Cracks",
    wordCount: 850,
    phase: "Act 1 - World Building",
    description: "Important relationships and emotional wounds beneath the surface",
    requirements: `Write 800-900 words. Life feels stable. but fragile.

Focus on:
- Important relationships
- Emotional wounds beneath the surface
- Gestures instead of exposition
- Subtle foreshadowing of the Hook
- Symbolic objects or places

Show through body language and micro-expressions, not dialogue or narration.`
  },
  intro_3: {
    title: "The Life They Thought They Had",
    wordCount: 850,
    phase: "Act 1 - World Building",
    description: "Deepening the personal world as shadows form",
    requirements: `Write 800-900 words. Everything still appears safe, but shadows are forming.

Deepen their personal world:
- Workplace or home environment
- Past memories shaping present behavior
- Unspoken tensions
- Fears, flaws, and values
- The symbolic object appears in a way that seems insignificant

Build dramatic irony - the reader should feel dread for what's coming.`
  },
  inciting_incident: {
    title: "The First Disturbance",
    wordCount: 850,
    phase: "Act 1 - Inciting Incident",
    description: "A moment that shatters stability",
    requirements: `Write 800-900 words. A moment that shatters stability.

It must be:
- Unexpected
- Emotionally painful
- Irreversible
- Morally complex

Describe:
- The shock
- The silence after the shock
- The broken gaze or trembling gesture that confirms life has changed

From here, nothing can go back.`
  },
  early_dev_1: {
    title: "Shockwaves",
    wordCount: 850,
    phase: "Act 2 - Rising Action",
    description: "How the disturbance disrupts routine, balance, and relationships",
    requirements: `Write 800-900 words. Pain is quiet, not loud.

Show how the disturbance disrupts:
- Routine
- Emotional balance
- Relationships

Use micro-expressions:
- Hands tightening around objects
- Interrupted sentences
- Long pauses
- Avoided eye contact

The symbolic object becomes a point of emotional focus.`
  },
  early_dev_2: {
    title: "Attempts to Restore Control",
    wordCount: 850,
    phase: "Act 2 - Rising Action",
    description: "The protagonist tries to fix their world - every attempt fails",
    requirements: `Write 800-900 words. The protagonist tries to fix their world. Every attempt fails.

Include:
- Guilt
- Denial
- Fear
- Stubbornness
- Emotional missteps

Attempts to recover control only reveal deeper fractures. The symbolic object serves as a reminder of what was lost.`
  },
  early_dev_3: {
    title: "Complications & Subplots",
    wordCount: 850,
    phase: "Act 2 - Rising Action",
    description: "Secondary characters with stakes, external pressures",
    requirements: `Write 800-900 words. Life tightens around them.

Introduce:
- Secondary characters with their own stakes
- A subplot connected to the theme
- External pressures (money, time, loyalty, distance, health)
- Emotional blindness causing conflict

The symbolic object appears in connection with another character.`
  },
  middle_dev_1: {
    title: "The Deepening Storm",
    wordCount: 850,
    phase: "Act 2 - Midpoint",
    description: "Tension rises as shadows lengthen and safety disappears",
    requirements: `Write 800-900 words. Shadows lengthen. Safety disappears.

Tension rises through:
- Darker settings
- Heavier silence
- Physical and emotional exhaustion
- Rising stakes
- The symbolic object reveals hidden meaning or history

Create a sense that there's no going back.`
  },
  middle_dev_2: {
    title: "Truths Rising from the Past",
    wordCount: 850,
    phase: "Act 2 - Midpoint",
    description: "Revelations from the past that deepen the emotional core",
    requirements: `Write 800-900 words. This chapter deepens the emotional core.

Reveal something from the past:
- Old mistakes
- Unresolved regrets
- Painful memories
- Forgotten letters, photos, or objects laden with meaning

The symbolic object is connected to this revelation. Create emotional complexity - truth is liberating but painful.`
  },
  middle_dev_3: {
    title: "The Breaking Point",
    wordCount: 850,
    phase: "Act 2 - Midpoint",
    description: "The protagonist reaches emotional collapse",
    requirements: `Write 800-900 words. This moment should feel suffocating.

The protagonist reaches emotional collapse. Show:
- Trembling hands
- Raised voices or total silence
- Breaking objects
- Walking away
- Collapsing into chairs

The symbolic object becomes a focal point of their pain.`
  },
  plot_twist: {
    title: "The Plot Twist",
    wordCount: 1500,
    phase: "Act 2 - Major Revelation",
    description: "A revelation that changes the meaning of everything",
    requirements: `Write EXACTLY 1,500 words. This is the story's major turning point.

A revelation that:
- Changes the meaning of everything
- Reframes earlier scenes
- Connects directly to the Hook
- Forces confrontation with truth
- Cuts deeply
- Feels earned, not convenient

The twist must be tragic, human, and impossible to ignore.
The symbolic object's true significance is revealed.
Show immediate emotional fallout.
End with the protagonist fundamentally changed by this knowledge.`
  },
  climax_build_1: {
    title: "Aftermath of the Truth",
    wordCount: 850,
    phase: "Act 3 - Rising to Climax",
    description: "The emotional shock settling in",
    requirements: `Write 800-900 words. Nothing feels stable.

Show the emotional shock settling in:
- Grief
- Numbness
- Distance
- Fragile attempts to cope

The symbolic object takes on new meaning post-revelation. Begin to see the path forward, however difficult.`
  },
  climax_build_2: {
    title: "Final Preparations",
    wordCount: 850,
    phase: "Act 3 - Rising to Climax",
    description: "Preparing for the final confrontation",
    requirements: `Write 800-900 words. Feels like walking toward fate.

The protagonist prepares for the final confrontation. Include:
- Packing symbolic objects
- Writing letters
- Quiet endings to relationships or conversations
- Returning to meaningful places

The symbolic object is prepared or positioned for its final role. Quiet moments of resolution before the storm.`
  },
  climax_build_3: {
    title: "Walking into the Storm",
    wordCount: 850,
    phase: "Act 3 - Rising to Climax",
    description: "A slow, deliberate march toward the inevitable",
    requirements: `Write 800-900 words. Every step feels final.

A slow, deliberate march toward the inevitable. Show:
- Rising tension
- Long silences
- Atmospheric heaviness
- Destiny closing in

The symbolic object accompanies them on this journey. End poised on the edge of the final scene.`
  },
  climax: {
    title: "The Climax",
    wordCount: 1100,
    phase: "Act 3 - Climax",
    description: "Return to the Hook with full understanding, then move beyond",
    requirements: `Write 1000-1200 words. This is the peak of the entire film.

Return to the Hook - same visuals, same emotions - but now fully understood.

Then move beyond it:
- The true confrontation
- Sacrifice, truth, forgiveness, or irreversible choice
- Completion of the character's transformation

The symbolic object plays its crucial final role.
Maximum emotional intensity.
All storylines converge in this moment.`
  },
  resolution_1: {
    title: "The Dust Settles",
    wordCount: 850,
    phase: "Resolution",
    description: "The immediate aftermath - soft but heavy",
    requirements: `Write 800-900 words. Soft but heavy.

Show the immediate aftermath:
- Quiet landscapes
- Slower pacing
- Consequences falling into place
- Emotional weight settling over daily life

The symbolic object's final state reflects the story's outcome. Moments of grief, relief, or bittersweet victory.`
  },
  resolution_2: {
    title: "The Final Reflection",
    wordCount: 650,
    phase: "Resolution",
    description: "A reflective, poetic, mature closing scene",
    requirements: `Write 600-700 words. The story ends, but the emotional resonance continues.

End with a reflective, poetic, mature scene. It must:
- Echo the Hook
- Show transformation
- Leave either a lingering ache or soft hope
- Close with a symbolic final image

The symbolic object in its final resting place. Create a sense of completion but not perfect closure.`
  }
};

// Hollywood screenplay mandatory writing techniques - for mature 50+ audience
const HOLLYWOOD_STYLE_REQUIREMENTS = `
⭐ MANDATORY WRITING TECHNIQUES FOR MATURE AUDIENCE (50+):

VOICE & PERSPECTIVE:
- Write as a veteran Hollywood screenwriter with 30 years of experience
- Reflective, emotionally heavy, deeply human
- Classic literary prose - the kind that wins Academy Awards
- NO slang. NO modern jargon. NO internet tone.
- Everything must feel timeless, as if written in 1994 by a master

TONE:
- Cinematic grandeur with intimate emotional depth
- Mature themes: mortality, regret, reconciliation, legacy
- Slow-burn pacing that respects the audience's intelligence
- Emotional weight that accumulates across chapters
- Reflective, contemplative, never rushed

PROSE STYLE:
- Sentences that breathe - vary rhythm between long flowing passages and short punches
- Literary but accessible - Hemingway meets Cormac McCarthy
- Specificity over generality - name the exact hour, the exact shade of light
- Subtext carries the emotional weight, not exposition
- Every word must earn its place

SCENE CRAFTING (Every chapter must utilize):
- Lighting that tells emotional truth (golden hour, harsh fluorescent, candlelight)
- Sound design (distant train whistles, clock ticking, rain on windows)
- Textures (worn leather, cold metal, rough hands)
- Weather as emotional mirror (fog, autumn leaves, summer heat)
- Shadows and negative space
- Body language that speaks louder than dialogue
- Symbolic objects carrying generational weight
- Nostalgia woven into setting details
- Subtle emotional cues in gesture and glance

DIALOGUE RULES:
- Minimalistic - less is always more
- Heavy subtext - what isn't said matters most
- Shaped by decades of lived experience
- Characters speak with the weight of their years
- No exposition through dialogue - show through action
- Silences are as important as words

THEMATIC DEPTH:
- Memory and how it deceives
- Loss that defines identity
- Legacy we leave behind
- Transformation through suffering
- Reconciliation with the past
- The weight of time
- Love that endures through silence

STRICT SYMBOLISM RULE:
- Each chapter must feature ONE significant symbolic object
- The object must carry emotional and thematic weight
- It should connect past and present
- Its meaning must evolve as the story progresses

TECHNICAL REQUIREMENTS:
- Third-person limited perspective, deep POV
- Use "." for pauses (He waited. A long breath. Then spoke.)
- Never use "..." - it's amateur
- Show emotions through physical sensations (tight chest, cold hands, dry mouth)
- Every scene must advance character OR plot, preferably both
- Paragraph breaks for emphasis and pacing
- Sensory details anchor every scene in physical reality`;

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

  const systemPrompt = `You are a veteran Hollywood screenwriter with 30 years of experience, known for Academy Award-caliber work. Your films resonate deeply with mature audiences (50+) who appreciate:
- Classic, literary prose that feels timeless
- Emotional depth earned through restraint, not melodrama
- The weight of lived experience in every word

YOUR VOICE:
- Reflective, contemplative, deeply human
- Hemingway's precision meets Cormac McCarthy's poetry
- NO slang. NO modern jargon. NO internet tone. NO clichés.
- Write as if crafting a film that will be studied for decades

YOUR CRAFT:
- Sensory-rich scenes anchored in physical reality
- Lighting, weather, and texture tell emotional truth
- Body language speaks louder than dialogue
- Silence carries as much weight as words
- Subtext is where the real story lives

THEMES YOU EXPLORE:
- Mortality and the passage of time
- Regret and reconciliation
- Legacy we leave behind
- Love that endures through decades
- The weight of memory

This is a 15,000-16,000 word cinematic screenplay across 18 chapters.

CRITICAL: Always respond with valid JSON only. No additional text, no markdown, no code blocks. Pure JSON.`;

  const previousContext = previousChapters.length > 0
    ? `\n\nPREVIOUS CHAPTERS FOR CONTINUITY:\n${previousChapters.map((c, i) => 
        `Chapter ${i + 1} (${c.chapterType}): "${c.title}"\nSymbolic Object: ${c.artifact?.name || 'N/A'}\nSummary excerpt: ${c.summary.substring(0, 400)}...`
      ).join('\n\n')}`
    : '';

  const hookReference = hookContent && chapterType === 'climax'
    ? `\n\n⚠️ CRITICAL - HOOK SCENE TO RECREATE WITH FULL CONTEXT:\n${hookContent}\n\nThis climax MUST return to this exact scene - same visuals, same emotions - but now fully understood. Then move beyond it.`
    : '';

  const symbolicObjectGuidance = chapterNumber === 1
    ? `SYMBOLIC OBJECT (STRICT REQUIREMENT):
Create ONE significant symbolic object that will recur throughout the entire 18-chapter story.
- It must be a physical object with deep emotional resonance
- It should be broken or damaged in the Hook scene
- It will evolve in meaning as the story progresses
- Choose something intimate: a watch, a letter, a photograph, a ring, a key, etc.`
    : `SYMBOLIC OBJECT (STRICT REQUIREMENT):
Reference the recurring symbolic object established in Chapter 1: "${previousChapters[0]?.artifact?.name || 'the established object'}"
- Show its evolving significance in this chapter
- It must appear meaningfully, not just mentioned in passing
- Its presence should carry emotional weight`;

  const charactersText = framework.characters && Array.isArray(framework.characters)
    ? framework.characters.map((c: any) => `${c.name} (${c.role}): ${c.description}`).join('\n')
    : 'No characters defined yet';

  const userPrompt = `Create "${config.title}" (Chapter ${chapterNumber} of 18) for a Hollywood screenplay.

FILM DETAILS:
Title: "${filmTitle}"
Premise: ${framework.premise || 'Not yet defined'}
Genres: ${Array.isArray(framework.genres) ? framework.genres.join(', ') : (framework.genre || 'Drama')}
Tone: ${framework.tone || 'Dramatic'}
Setting: ${framework.setting ? JSON.stringify(framework.setting) : 'Not yet defined'}
Characters: ${charactersText}
${previousContext}
${hookReference}

CHAPTER REQUIREMENTS:
Phase: ${config.phase}
Purpose: ${config.description}
Target Word Count: ${config.wordCount} words ${chapterType === 'hook' ? '(EXACTLY 150 - NOT 149, NOT 151)' : ''}${chapterType === 'plot_twist' ? '(EXACTLY 1,500 words)' : ''}

SPECIFIC INSTRUCTIONS:
${config.requirements}

${symbolicObjectGuidance}

${HOLLYWOOD_STYLE_REQUIREMENTS}

Generate a JSON response with this exact structure:
{
  "chapterNumber": ${chapterNumber},
  "chapterType": "${chapterType}",
  "title": "A compelling, evocative chapter title (3-6 words)",
  "summary": "The full chapter narrative of EXACTLY ${config.wordCount} words. Write the complete scene with atmospheric description, body language, minimal dialogue with heavy subtext, and emotional depth. Include lighting, weather, textures, and shadows.",
  "prompt": "A detailed visual prompt for AI video generation (80-120 words). Include: specific camera movements, lighting mood, character positions, key actions, environment details, color palette, weather, and emotional atmosphere. Make it cinematically rich.",
  "artifact": {
    "name": "The symbolic object's name",
    "description": "Physical description of the symbolic object",
    "significance": "What it represents emotionally in this chapter and how it connects to the overall arc"
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

  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let fullResponse = "";
    
    try {
      for await (const event of replicate.stream("openai/gpt-4o-mini", {
        input: {
          prompt: userPrompt,
          system_prompt: systemPrompt,
          max_tokens: 2000,
        },
      })) {
        fullResponse += event.toString();
      }

      // Try multiple JSON extraction patterns
      let jsonStr: string | null = null;
      
      // First, try to extract from markdown code blocks
      const codeBlockMatch = fullResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      
      // If no code block, try to find raw JSON object
      if (!jsonStr) {
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }
      
      if (!jsonStr) {
        console.error(`Attempt ${attempt}: Failed to extract JSON from response:`, fullResponse.substring(0, 500));
        if (attempt === maxRetries) {
          throw new Error("Could not parse JSON from GPT response after multiple attempts");
        }
        continue;
      }

      // Check if JSON looks complete (ends with closing brace)
      const trimmedJson = jsonStr.trim();
      if (!trimmedJson.endsWith('}')) {
        console.error(`Attempt ${attempt}: JSON appears truncated, retrying...`);
        if (attempt === maxRetries) {
          throw new Error("Received truncated JSON response after multiple attempts");
        }
        continue;
      }

      const parsed = JSON.parse(jsonStr);
      
      // Validate the response has required fields
      if (!parsed.genres || !parsed.premise || !parsed.characters) {
        console.error(`Attempt ${attempt}: Response missing required fields, retrying...`);
        if (attempt === maxRetries) {
          throw new Error("Response missing required fields after multiple attempts");
        }
        continue;
      }
      
      return parsed;
    } catch (parseError: any) {
      console.error(`Attempt ${attempt} JSON parse error:`, parseError.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to parse story framework JSON after ${maxRetries} attempts: ${parseError.message}`);
      }
    }
  }
  
  throw new Error("Failed to generate story framework after all retry attempts");
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

// Download audio file from object storage to temp directory
async function downloadAudioToTemp(objectPath: string): Promise<string> {
  const objectStorageService = new ObjectStorageService();
  
  // Normalize path - objectStorageService.getSignedDownloadUrl expects /objects/... format
  // Remove any existing /objects/ prefix to avoid double-prefixing, then add it back
  let downloadPath = objectPath;
  if (downloadPath.startsWith('/objects/')) {
    // Path is already in correct format
  } else if (downloadPath.startsWith('audio/') || downloadPath.startsWith('videos/')) {
    // Relative path - add /objects/ prefix
    downloadPath = `/objects/${downloadPath}`;
  }
  
  const signedUrl = await objectStorageService.getSignedDownloadUrl(downloadPath);
  
  const tempPath = path.join("/tmp", `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
  
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio from ${objectPath}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tempPath, buffer);
  
  return tempPath;
}

// Get video duration using ffprobe
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ]);
    
    let stdout = '';
    let stderr = '';
    
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const duration = parseFloat(stdout.trim());
        if (!isNaN(duration)) {
          resolve(Math.round(duration));
        } else {
          resolve(15); // Default fallback
        }
      } else {
        console.error(`ffprobe error: ${stderr}`);
        resolve(15); // Default fallback on error
      }
    });
    
    ffprobe.on('error', (err) => {
      console.error(`ffprobe spawn error:`, err);
      resolve(15); // Default fallback
    });
  });
}

// Assemble scene video by combining video with audio using ffmpeg
async function assembleSceneWithFFmpeg(videoPath: string, audioPath: string, outputPath: string): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    console.log(`Assembling scene: video=${videoPath}, audio=${audioPath}, output=${outputPath}`);
    
    // ffmpeg command to combine video and audio
    // -shortest: end encoding when the shortest stream ends
    // -c:v copy: copy video stream without re-encoding
    // -c:a aac: encode audio to AAC for compatibility
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      outputPath
    ]);
    
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        console.log(`FFmpeg scene assembly completed successfully`);
        // Get actual duration using ffprobe
        const duration = await getVideoDuration(outputPath);
        resolve({ duration });
      } else {
        console.error(`FFmpeg stderr: ${stderr}`);
        reject(new Error(`FFmpeg scene assembly exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

// Assemble a single scene: combine video + audio
async function assembleScene(scene: any): Promise<{ videoUrl: string; objectPath: string; duration: number }> {
  if (!scene.videoObjectPath) {
    throw new Error(`Scene ${scene.sceneNumber} has no video`);
  }
  if (!scene.audioObjectPath) {
    throw new Error(`Scene ${scene.sceneNumber} has no audio`);
  }
  
  console.log(`Assembling scene ${scene.sceneNumber}: video=${scene.videoObjectPath}, audio=${scene.audioObjectPath}`);
  
  const tempVideoPath = await downloadVideoToTemp(scene.videoObjectPath);
  const tempAudioPath = await downloadAudioToTemp(scene.audioObjectPath);
  const outputPath = path.join("/tmp", `scene_${scene.id}_assembled.mp4`);
  
  try {
    const { duration } = await assembleSceneWithFFmpeg(tempVideoPath, tempAudioPath, outputPath);
    
    const uploadResult = await uploadMergedVideo(outputPath);
    
    return {
      videoUrl: uploadResult.publicPath,
      objectPath: uploadResult.objectPath,
      duration
    };
  } finally {
    // Cleanup temp files
    for (const tempPath of [tempVideoPath, tempAudioPath, outputPath]) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (e) {
        console.error(`Failed to cleanup temp file ${tempPath}:`, e);
      }
    }
  }
}

// Assemble all scenes in a film
async function assembleFilmScenes(filmId: string): Promise<{ successCount: number; failCount: number }> {
  const scenes = await storage.getScenesByFilmId(filmId);
  
  // Filter scenes that are ready for assembly (have both video and audio)
  const readyScenes = scenes.filter(s => 
    s.videoObjectPath && 
    s.audioObjectPath && 
    s.status !== "completed" && 
    s.status !== "assembling"
  );
  
  console.log(`Found ${readyScenes.length} scenes ready for assembly in film ${filmId}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const scene of readyScenes) {
    try {
      await storage.updateScene(scene.id, { status: "assembling" });
      
      const result = await assembleScene(scene);
      
      await storage.updateScene(scene.id, {
        assembledVideoUrl: result.videoUrl,
        assembledVideoPath: result.objectPath,
        actualDuration: result.duration,
        status: "completed"
      });
      
      successCount++;
      console.log(`Scene ${scene.sceneNumber} assembled successfully`);
    } catch (error) {
      console.error(`Failed to assemble scene ${scene.sceneNumber}:`, error);
      await storage.updateScene(scene.id, {
        status: "failed",
        errorMessage: `Assembly failed: ${error}`
      });
      failCount++;
    }
  }
  
  return { successCount, failCount };
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

// Scene Splitter - Uses Claude to break chapter text into 10-20 second video scene prompts
interface ScenePrompt {
  sceneNumber: number;
  visualPrompt: string;
  narrativeText: string;
  mood: string;
  cameraMovement: string;
  targetDuration: number;
}

async function splitChapterIntoScenes(
  chapterText: string,
  chapterTitle: string,
  chapterNumber: number,
  filmTitle: string,
  framework: any
): Promise<ScenePrompt[]> {
  const wordCount = chapterText.split(/\s+/).length;
  // ~150 words per minute narration = ~2.5 words per second
  // For 15-second scenes, that's ~37 words per scene
  // Use ~40 words per scene to ensure full coverage
  const wordsPerScene = 40;
  const targetSceneCount = Math.max(3, Math.ceil(wordCount / wordsPerScene));
  
  const systemPrompt = `You are a professional cinematic scene breakdown specialist. Your job is to take chapter text from a screenplay and break it down into individual video scenes, each 10-20 seconds long.

Each scene must be a self-contained visual moment that can be generated by an AI video generator. Focus on:
- Specific visual composition and framing
- Character positions and movements
- Lighting and atmosphere
- Environmental details
- Emotional tone through visuals

CRITICAL: Generate exactly ${targetSceneCount} scenes that together cover the entire chapter content.
CRITICAL: Always respond with valid JSON only. No markdown code blocks, no additional text.`;

  const userPrompt = `Break down this chapter into ${targetSceneCount} video scenes (10-20 seconds each).

FILM: "${filmTitle}"
CHAPTER ${chapterNumber}: "${chapterTitle}"
SETTING: ${framework.setting ? JSON.stringify(framework.setting) : 'Cinematic setting'}
TONE: ${framework.tone || 'Dramatic'}
CHARACTERS: ${framework.characters ? framework.characters.map((c: any) => c.name).join(', ') : 'Main characters'}

CHAPTER TEXT:
${chapterText}

Generate a JSON array with exactly ${targetSceneCount} scenes. Each scene must have:
{
  "sceneNumber": 1,
  "visualPrompt": "A detailed 80-120 word prompt for AI video generation. Include: specific camera angle (close-up, wide shot, tracking), lighting (golden hour, harsh shadows, soft diffused), character positioning, key action or gesture, environment details, color palette, weather if applicable. Make it cinematically rich and specific enough for video AI to recreate.",
  "narrativeText": "The exact portion of the chapter text that corresponds to this scene (50-100 words). This will be used for TTS narration.",
  "mood": "The emotional tone of this scene (melancholic, tense, hopeful, etc.)",
  "cameraMovement": "Specific camera direction (slow push-in, static wide, handheld tracking, crane up, etc.)",
  "targetDuration": 15
}

Ensure scenes flow naturally and cover the entire chapter narrative. Each visualPrompt must be highly specific for video generation.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse the JSON response
  let scenes: ScenePrompt[];
  try {
    // Try to extract JSON array from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON array in response");
    }
    scenes = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("Failed to parse scene splitter response:", content.text.substring(0, 500));
    throw new Error(`Failed to parse scene breakdown: ${parseError}`);
  }

  // Validate and normalize scenes
  return scenes.map((scene, index) => ({
    sceneNumber: index + 1,
    visualPrompt: scene.visualPrompt || "",
    narrativeText: scene.narrativeText || "",
    mood: scene.mood || "neutral",
    cameraMovement: scene.cameraMovement || "static",
    targetDuration: scene.targetDuration || 15,
  }));
}

// Split all chapters of a film into scenes
async function splitFilmIntoScenes(filmId: string): Promise<{
  totalScenes: number;
  chaptersProcessed: number;
  errors: string[];
}> {
  const film = await storage.getFilm(filmId);
  if (!film) throw new Error("Film not found");

  const framework = await storage.getStoryFrameworkByFilmId(filmId);
  if (!framework) throw new Error("Story framework not found");

  const chapters = await storage.getChaptersByFilmId(filmId);
  if (chapters.length === 0) throw new Error("No chapters found");

  let totalScenes = 0;
  let chaptersProcessed = 0;
  const errors: string[] = [];

  for (const chapter of chapters) {
    try {
      console.log(`Splitting chapter ${chapter.chapterNumber}: ${chapter.title}`);
      
      // Delete any existing scenes for this chapter
      await storage.deleteScenesByChapterId(chapter.id);
      
      // Split chapter into scenes
      const scenePrompts = await splitChapterIntoScenes(
        chapter.summary,
        chapter.title,
        chapter.chapterNumber,
        film.title,
        framework
      );

      // Create scene records in database
      for (const scenePrompt of scenePrompts) {
        await storage.createScene({
          chapterId: chapter.id,
          filmId: film.id,
          sceneNumber: scenePrompt.sceneNumber,
          visualPrompt: scenePrompt.visualPrompt,
          narrativeText: scenePrompt.narrativeText,
          mood: scenePrompt.mood,
          cameraMovement: scenePrompt.cameraMovement,
          targetDuration: scenePrompt.targetDuration,
          status: "pending",
        });
      }

      // Update chapter with scene count
      await storage.updateChapter(chapter.id, {
        totalScenes: scenePrompts.length,
        completedScenes: 0,
        status: "scenes_ready",
      });

      totalScenes += scenePrompts.length;
      chaptersProcessed++;
      console.log(`Chapter ${chapter.chapterNumber} split into ${scenePrompts.length} scenes`);
    } catch (error) {
      const errorMsg = `Failed to split chapter ${chapter.chapterNumber}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      await storage.updateChapter(chapter.id, { status: "failed" });
    }
  }

  return { totalScenes, chaptersProcessed, errors };
}

// Voice descriptions for TTS based on narrator voice selection
const NARRATOR_VOICE_DESCRIPTIONS: Record<string, string> = {
  "male-narrator": "Jon's voice is calm and measured with a deep, authoritative tone. The recording is of very high audio quality with the speaker's voice sounding clear and close up, delivering narration with gravitas and emotional depth.",
  "female-narrator": "Laura's voice is warm and expressive with a moderate pace and clear enunciation. The recording is of very high audio quality with the speaker's voice sounding clear and intimate, perfect for storytelling.",
  "dramatic-male": "Gary's voice is intense and emotionally charged with varied pacing for dramatic effect. The recording has cinematic quality with the speaker's voice rich and resonant, conveying deep emotion.",
  "dramatic-female": "Karen's voice is powerful and evocative with dynamic range from soft whispers to passionate delivery. The recording is pristine with the speaker's voice conveying profound emotion.",
  "neutral": "David's voice is balanced and professional with a neutral tone and steady pace. The recording is crystal clear with no background noise, suitable for documentary-style narration.",
  "documentary": "James's voice is informative yet engaging with measured delivery and authoritative presence. The recording is broadcast quality with the speaker's voice commanding attention while remaining accessible."
};

// Generate TTS audio for a scene using Replicate's parler-tts
async function generateSceneAudio(
  narrativeText: string,
  voiceDescription: string
): Promise<string> {
  console.log(`Generating TTS audio for text: "${narrativeText.substring(0, 50)}..."`);
  
  const output = await replicate.run(
    "cjwbw/parler-tts:bf38249a8cc143b97b5108570d1c81b8321881dd91fe7837877e7dfa3a0fad27",
    {
      input: {
        prompt: narrativeText,
        description: voiceDescription,
      },
    }
  );

  // Output is a URL to the generated audio file
  if (typeof output === 'string') {
    return output;
  }
  
  // Handle FileOutput object
  if (output && typeof output === 'object' && 'url' in output) {
    return (output as { url: () => string }).url();
  }
  
  throw new Error("Unexpected TTS output format");
}

// Upload audio file to object storage
async function uploadAudioToObjectStorage(audioUrl: string, sceneId: string): Promise<{ objectPath: string; publicUrl: string }> {
  const objectStorageService = new ObjectStorageService();
  return await objectStorageService.uploadAudioFromUrl(audioUrl, sceneId);
}

// Generate audio for all scenes in a chapter
async function generateChapterAudio(
  chapterId: string,
  voiceDescription: string
): Promise<{
  successCount: number;
  failCount: number;
  errors: string[];
}> {
  const scenes = await storage.getScenesByChapterId(chapterId);
  if (scenes.length === 0) {
    throw new Error("No scenes found for chapter");
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const scene of scenes) {
    if (!scene.narrativeText || scene.narrativeText.trim() === "") {
      console.log(`Scene ${scene.sceneNumber} has no narrative text, skipping TTS`);
      continue;
    }

    if (scene.audioUrl) {
      console.log(`Scene ${scene.sceneNumber} already has audio, skipping`);
      successCount++;
      continue;
    }

    try {
      console.log(`Generating audio for scene ${scene.sceneNumber}...`);
      
      await storage.updateScene(scene.id, { status: "generating_audio" });
      
      // Generate TTS audio
      const audioUrl = await generateSceneAudio(scene.narrativeText, voiceDescription);
      
      // Upload to object storage
      const uploadResult = await uploadAudioToObjectStorage(audioUrl, scene.id);
      
      // Update scene with audio info
      await storage.updateScene(scene.id, {
        audioUrl: uploadResult.publicUrl,
        audioObjectPath: uploadResult.objectPath,
        status: "audio_complete",
      });
      
      successCount++;
      console.log(`Scene ${scene.sceneNumber} audio generated successfully`);
    } catch (error) {
      const errorMsg = `Failed to generate audio for scene ${scene.sceneNumber}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      failCount++;
      
      await storage.updateScene(scene.id, {
        status: "failed",
        errorMessage: errorMsg,
      });
    }
  }

  return { successCount, failCount, errors };
}

// Generate audio for all scenes in a film
async function generateFilmAudio(filmId: string): Promise<{
  totalScenes: number;
  successCount: number;
  failCount: number;
  errors: string[];
}> {
  const film = await storage.getFilm(filmId);
  if (!film) throw new Error("Film not found");

  const chapters = await storage.getChaptersByFilmId(filmId);
  if (chapters.length === 0) throw new Error("No chapters found");

  // Get voice description based on film's narrator voice setting
  const voiceType = film.narratorVoice || "male-narrator";
  const voiceDescription = NARRATOR_VOICE_DESCRIPTIONS[voiceType] || NARRATOR_VOICE_DESCRIPTIONS["male-narrator"];

  let totalScenes = 0;
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  // Update film stage
  await storage.updateFilm(filmId, { generationStage: "generating_audio" });

  for (const chapter of chapters) {
    try {
      console.log(`Generating audio for chapter ${chapter.chapterNumber}: ${chapter.title}`);
      
      await storage.updateChapter(chapter.id, { status: "generating_audio" });
      
      const result = await generateChapterAudio(chapter.id, voiceDescription);
      
      const chapterScenes = await storage.getScenesByChapterId(chapter.id);
      totalScenes += chapterScenes.length;
      successCount += result.successCount;
      failCount += result.failCount;
      errors.push(...result.errors);
      
      // Update chapter status
      const failedScenes = chapterScenes.filter(s => s.status === "failed").length;
      await storage.updateChapter(chapter.id, {
        status: failedScenes > 0 ? "failed" : "audio_ready",
        completedScenes: result.successCount,
      });
      
    } catch (error) {
      const errorMsg = `Failed to process chapter ${chapter.chapterNumber}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      await storage.updateChapter(chapter.id, { status: "failed" });
    }
  }

  // Update film stage based on results
  await storage.updateFilm(filmId, {
    generationStage: failCount === 0 ? "scenes_ready" : "failed",
  });

  return { totalScenes, successCount, failCount, errors };
}

// Generate videos for all scenes in a film using VideogenAPI
async function generateFilmSceneVideos(filmId: string): Promise<{
  totalScenes: number;
  successCount: number;
  failCount: number;
  errors: string[];
}> {
  const film = await storage.getFilm(filmId);
  if (!film) throw new Error("Film not found");

  const chapters = await storage.getChaptersByFilmId(filmId);
  if (chapters.length === 0) throw new Error("No chapters found");

  const apiKey = process.env.VIDEOGEN_API_KEY;
  if (!apiKey) throw new Error("VIDEOGEN_API_KEY not configured");

  // Default to higgsfield_v1 model
  const model = film.videoModel || "higgsfield_v1";
  const resolution = film.frameSize || "1080p";

  let totalScenes = 0;
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  // Update film stage
  await storage.updateFilm(filmId, { generationStage: "generating_videos" });

  for (const chapter of chapters) {
    try {
      console.log(`Generating videos for chapter ${chapter.chapterNumber}: ${chapter.title}`);
      
      await storage.updateChapter(chapter.id, { status: "generating_videos" });
      
      const scenes = await storage.getScenesByChapterId(chapter.id);
      totalScenes += scenes.length;

      for (const scene of scenes) {
        // Skip scenes that already have video
        if (scene.videoUrl || scene.status === "video_complete" || scene.status === "completed") {
          console.log(`Scene ${scene.sceneNumber} already has video, skipping`);
          successCount++;
          continue;
        }

        if (!scene.visualPrompt || scene.visualPrompt.trim() === "") {
          console.log(`Scene ${scene.sceneNumber} has no visual prompt, skipping`);
          continue;
        }

        try {
          console.log(`Starting VideogenAPI video generation for chapter ${chapter.chapterNumber}, scene ${scene.sceneNumber}...`);
          await storage.updateScene(scene.id, { status: "generating_video" });

          const requestBody = {
            model: "higgsfield_v1", // Always use higgsfield_v1 as default
            prompt: scene.visualPrompt,
            duration: Math.min(scene.targetDuration || 15, 15),
            resolution
          };

          console.log(`VideogenAPI request:`, JSON.stringify(requestBody));

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
            console.error(`VideogenAPI error: ${errorText}`);
            
            // Check for rate limit
            if (errorText.includes("Rate limit exceeded")) {
              const errorMsg = `Rate limit exceeded for chapter ${chapter.chapterNumber} scene ${scene.sceneNumber}. Try again later.`;
              errors.push(errorMsg);
              await storage.updateScene(scene.id, { 
                status: "failed",
                errorMessage: errorMsg
              });
              failCount++;
              continue;
            }
            
            const errorMsg = `VideogenAPI error for chapter ${chapter.chapterNumber} scene ${scene.sceneNumber}: ${errorText}`;
            errors.push(errorMsg);
            await storage.updateScene(scene.id, { 
              status: "failed",
              errorMessage: errorMsg
            });
            failCount++;
            continue;
          }

          const result = await response.json();
          console.log(`VideogenAPI response:`, JSON.stringify(result));
          
          const externalId = result.id || result.video_id || result.generation_id;

          // Poll for completion
          const pollResult = await pollVideoStatus(externalId, 120); // 10 minutes timeout

          if (pollResult.videoUrl) {
            // Upload to object storage
            try {
              const objectStorageService = new ObjectStorageService();
              const objectPath = await objectStorageService.uploadVideoFromUrl(pollResult.videoUrl);

              await storage.updateScene(scene.id, {
                videoUrl: pollResult.videoUrl,
                videoObjectPath: objectPath,
                externalVideoId: externalId,
                status: "video_complete"
              });
              successCount++;
              console.log(`Chapter ${chapter.chapterNumber} scene ${scene.sceneNumber} video generated successfully`);
            } catch (uploadError) {
              console.error(`Failed to upload scene video:`, uploadError);
              await storage.updateScene(scene.id, {
                videoUrl: pollResult.videoUrl,
                externalVideoId: externalId,
                status: "video_complete"
              });
              successCount++;
            }
          } else {
            const errorMsg = `Video generation ${pollResult.status} for chapter ${chapter.chapterNumber} scene ${scene.sceneNumber}`;
            errors.push(errorMsg);
            await storage.updateScene(scene.id, {
              status: "failed",
              errorMessage: errorMsg
            });
            failCount++;
          }
          
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (sceneError) {
          const errorMsg = `Error generating video for chapter ${chapter.chapterNumber} scene ${scene.sceneNumber}: ${sceneError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          await storage.updateScene(scene.id, {
            status: "failed",
            errorMessage: errorMsg
          });
          failCount++;
        }
      }
      
      // Update chapter status based on scene results
      const chapterScenes = await storage.getScenesByChapterId(chapter.id);
      const completedScenes = chapterScenes.filter(s => s.status === "video_complete" || s.status === "completed").length;
      const failedScenes = chapterScenes.filter(s => s.status === "failed").length;
      
      await storage.updateChapter(chapter.id, {
        status: failedScenes > 0 && completedScenes === 0 ? "failed" : "videos_ready",
        completedScenes,
      });
      
    } catch (chapterError) {
      const errorMsg = `Failed to process chapter ${chapter.chapterNumber}: ${chapterError}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      await storage.updateChapter(chapter.id, { status: "failed" });
    }
  }

  // Update film stage based on results
  await storage.updateFilm(filmId, {
    generationStage: failCount === 0 ? "assembling_scenes" : (successCount > 0 ? "assembling_scenes" : "failed"),
  });

  console.log(`Film video generation complete: ${successCount} success, ${failCount} failed out of ${totalScenes} total scenes`);
  return { totalScenes, successCount, failCount, errors };
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

      // Map AI response to database schema (genres array -> genre string)
      const genre = Array.isArray(generatedFramework.genres) 
        ? generatedFramework.genres.join(", ") 
        : (generatedFramework.genre || "Drama");

      const framework = await storage.createStoryFramework({
        filmId: req.params.id,
        premise: generatedFramework.premise,
        hook: generatedFramework.hook,
        genre,
        tone: generatedFramework.tone,
        setting: generatedFramework.setting,
        characters: generatedFramework.characters
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

      // Compose payload with filmId from URL before validation
      const validatedData = insertChapterSchema.parse({
        ...req.body,
        filmId: req.params.id
      });
      const chapter = await storage.createChapter(validatedData);

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

  // Split film chapters into scenes for video generation
  app.post("/api/films/:id/split-scenes", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const chapters = await storage.getChaptersByFilmId(req.params.id);
      if (chapters.length === 0) {
        res.status(400).json({ error: "No chapters found. Generate chapters first." });
        return;
      }

      // Update film status
      await storage.updateFilm(req.params.id, { generationStage: "splitting_scenes" });

      // Run scene splitting asynchronously
      res.json({ 
        message: "Scene splitting started",
        filmId: film.id,
        chapterCount: chapters.length
      });

      // Process in background
      splitFilmIntoScenes(req.params.id)
        .then(async (result) => {
          console.log(`Scene splitting completed: ${result.totalScenes} scenes from ${result.chaptersProcessed} chapters`);
          if (result.errors.length > 0) {
            console.error("Scene splitting errors:", result.errors);
          }
          await storage.updateFilm(req.params.id, { 
            generationStage: result.errors.length === 0 ? "scenes_ready" : "failed" 
          });
        })
        .catch(async (error) => {
          console.error("Scene splitting failed:", error);
          await storage.updateFilm(req.params.id, { generationStage: "failed" });
        });
    } catch (error) {
      console.error("Split scenes error:", error);
      res.status(500).json({ error: "Failed to start scene splitting" });
    }
  });

  // Get scenes for a film
  app.get("/api/films/:id/scenes", async (req, res) => {
    try {
      const scenes = await storage.getScenesByFilmId(req.params.id);
      res.json(scenes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get scenes" });
    }
  });

  // Get scenes for a specific chapter
  app.get("/api/chapters/:id/scenes", async (req, res) => {
    try {
      const scenes = await storage.getScenesByChapterId(req.params.id);
      res.json(scenes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get chapter scenes" });
    }
  });

  // Get a single scene
  app.get("/api/scenes/:id", async (req, res) => {
    try {
      const scene = await storage.getScene(req.params.id);
      if (!scene) {
        res.status(404).json({ error: "Scene not found" });
        return;
      }
      res.json(scene);
    } catch (error) {
      res.status(500).json({ error: "Failed to get scene" });
    }
  });

  // Update a scene
  app.patch("/api/scenes/:id", async (req, res) => {
    try {
      const scene = await storage.updateScene(req.params.id, req.body);
      if (!scene) {
        res.status(404).json({ error: "Scene not found" });
        return;
      }
      res.json(scene);
    } catch (error) {
      res.status(500).json({ error: "Failed to update scene" });
    }
  });

  // Get generation job status for a film
  app.get("/api/films/:id/generation-job", async (req, res) => {
    try {
      const job = await storage.getGenerationJobByFilmId(req.params.id);
      if (!job) {
        res.status(404).json({ error: "No generation job found" });
        return;
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to get generation job" });
    }
  });

  // Generate TTS audio for all scenes in a film
  app.post("/api/films/:id/generate-audio", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      // Check if scenes exist
      const scenes = await storage.getScenesByFilmId(req.params.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found. Please split chapters into scenes first using /api/films/:id/split-scenes" 
        });
        return;
      }

      // Return immediately and process in background
      res.json({ 
        message: "Audio generation started", 
        filmId: film.id,
        totalScenes: scenes.length
      });

      // Run audio generation asynchronously
      generateFilmAudio(film.id).catch(async (error) => {
        console.error("Audio generation error:", error);
        await storage.updateFilm(film.id, { generationStage: "failed" });
      });
    } catch (error) {
      console.error("Start audio generation error:", error);
      res.status(500).json({ error: "Failed to start audio generation" });
    }
  });

  // Generate TTS audio for a single scene
  app.post("/api/scenes/:id/generate-audio", async (req, res) => {
    try {
      const scene = await storage.getScene(req.params.id);
      if (!scene) {
        res.status(404).json({ error: "Scene not found" });
        return;
      }

      if (!scene.narrativeText || scene.narrativeText.trim() === "") {
        res.status(400).json({ error: "Scene has no narrative text for TTS" });
        return;
      }

      // Get the film to determine voice setting
      const film = await storage.getFilm(scene.filmId);
      const voiceType = film?.narratorVoice || "male-narrator";
      const voiceDescription = NARRATOR_VOICE_DESCRIPTIONS[voiceType] || NARRATOR_VOICE_DESCRIPTIONS["male-narrator"];

      await storage.updateScene(scene.id, { status: "generating_audio" });

      // Generate TTS audio
      const audioUrl = await generateSceneAudio(scene.narrativeText, voiceDescription);
      
      // Upload to object storage
      const uploadResult = await uploadAudioToObjectStorage(audioUrl, scene.id);
      
      // Update scene with audio info
      const updatedScene = await storage.updateScene(scene.id, {
        audioUrl: uploadResult.publicUrl,
        audioObjectPath: uploadResult.objectPath,
        status: "audio_complete",
      });

      res.json(updatedScene);
    } catch (error) {
      console.error("Scene audio generation error:", error);
      await storage.updateScene(req.params.id, { 
        status: "failed",
        errorMessage: `Audio generation failed: ${error}`
      });
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // Generate TTS audio for all scenes in a chapter
  app.post("/api/chapters/:id/generate-audio", async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }

      const scenes = await storage.getScenesByChapterId(chapter.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found. Please split chapter into scenes first." 
        });
        return;
      }

      // Get the film to determine voice setting
      const film = await storage.getFilm(chapter.filmId);
      const voiceType = film?.narratorVoice || "male-narrator";
      const voiceDescription = NARRATOR_VOICE_DESCRIPTIONS[voiceType] || NARRATOR_VOICE_DESCRIPTIONS["male-narrator"];

      await storage.updateChapter(chapter.id, { status: "generating_audio" });

      const result = await generateChapterAudio(chapter.id, voiceDescription);
      
      // Update chapter status
      await storage.updateChapter(chapter.id, {
        status: result.failCount > 0 ? "failed" : "audio_ready",
        completedScenes: result.successCount,
      });

      res.json({
        chapterId: chapter.id,
        ...result
      });
    } catch (error) {
      console.error("Chapter audio generation error:", error);
      await storage.updateChapter(req.params.id, { status: "failed" });
      res.status(500).json({ error: "Failed to generate chapter audio" });
    }
  });

  // Get available narrator voices
  app.get("/api/narrator-voices", (req, res) => {
    const voices = Object.entries(NARRATOR_VOICE_DESCRIPTIONS).map(([id, description]) => ({
      id,
      name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: description.substring(0, 100) + "..."
    }));
    res.json(voices);
  });

  // ============================================
  // Scene Assembly - Combine Audio + Video
  // ============================================

  // Assemble a single scene (combine video + audio)
  app.post("/api/scenes/:id/assemble", async (req, res) => {
    try {
      const scene = await storage.getScene(req.params.id);
      if (!scene) {
        res.status(404).json({ error: "Scene not found" });
        return;
      }

      if (!scene.videoObjectPath) {
        res.status(400).json({ 
          error: "Scene has no video. Generate video first using /api/scenes/:id/generate-video" 
        });
        return;
      }

      if (!scene.audioObjectPath) {
        res.status(400).json({ 
          error: "Scene has no audio. Generate audio first using /api/scenes/:id/generate-audio" 
        });
        return;
      }

      // Check if already assembled
      if (scene.assembledVideoPath && scene.status === "completed") {
        res.json({
          sceneId: scene.id,
          message: "Scene already assembled",
          assembledVideoUrl: scene.assembledVideoUrl,
          assembledVideoPath: scene.assembledVideoPath
        });
        return;
      }

      await storage.updateScene(scene.id, { status: "assembling" });

      const result = await assembleScene(scene);

      const updatedScene = await storage.updateScene(scene.id, {
        assembledVideoUrl: result.videoUrl,
        assembledVideoPath: result.objectPath,
        actualDuration: result.duration,
        status: "completed"
      });

      res.json(updatedScene);
    } catch (error) {
      console.error("Scene assembly error:", error);
      await storage.updateScene(req.params.id, { 
        status: "failed",
        errorMessage: `Assembly failed: ${error}`
      });
      res.status(500).json({ error: "Failed to assemble scene" });
    }
  });

  // Assemble all scenes in a chapter
  app.post("/api/chapters/:id/assemble-scenes", async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }

      const scenes = await storage.getScenesByChapterId(chapter.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found. Please split chapter into scenes first." 
        });
        return;
      }

      // Check which scenes are ready for assembly
      const readyScenes = scenes.filter(s => 
        s.videoObjectPath && 
        s.audioObjectPath && 
        s.status !== "completed" && 
        s.status !== "assembling"
      );

      if (readyScenes.length === 0) {
        const completedScenes = scenes.filter(s => s.status === "completed");
        res.json({
          chapterId: chapter.id,
          message: completedScenes.length > 0 
            ? "All ready scenes already assembled" 
            : "No scenes ready for assembly (need both video and audio)",
          totalScenes: scenes.length,
          completedScenes: completedScenes.length,
          readyForAssembly: 0
        });
        return;
      }

      await storage.updateChapter(chapter.id, { status: "assembling" });

      // Return immediately and process in background
      res.json({
        chapterId: chapter.id,
        message: "Scene assembly started",
        readyForAssembly: readyScenes.length,
        totalScenes: scenes.length
      });

      // Process assembly in background
      (async () => {
        let successCount = 0;
        let failCount = 0;

        for (const scene of readyScenes) {
          try {
            await storage.updateScene(scene.id, { status: "assembling" });
            
            const result = await assembleScene(scene);
            
            await storage.updateScene(scene.id, {
              assembledVideoUrl: result.videoUrl,
              assembledVideoPath: result.objectPath,
              actualDuration: result.duration,
              status: "completed"
            });
            
            successCount++;
            console.log(`Scene ${scene.sceneNumber} assembled successfully`);
          } catch (error) {
            console.error(`Failed to assemble scene ${scene.sceneNumber}:`, error);
            await storage.updateScene(scene.id, {
              status: "failed",
              errorMessage: `Assembly failed: ${error}`
            });
            failCount++;
          }
        }

        // Update chapter status
        await storage.updateChapter(chapter.id, {
          status: failCount > 0 && successCount === 0 ? "failed" : "assembled",
          completedScenes: successCount
        });

        console.log(`Chapter ${chapter.chapterNumber} assembly complete: ${successCount} success, ${failCount} failed`);
      })().catch(async (error) => {
        console.error("Chapter assembly error:", error);
        await storage.updateChapter(chapter.id, { status: "failed" });
      });
    } catch (error) {
      console.error("Start chapter assembly error:", error);
      res.status(500).json({ error: "Failed to start scene assembly" });
    }
  });

  // Assemble all scenes in a film
  app.post("/api/films/:id/assemble-scenes", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const scenes = await storage.getScenesByFilmId(film.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found. Please split chapters into scenes first." 
        });
        return;
      }

      // Check which scenes are ready for assembly
      const readyScenes = scenes.filter(s => 
        s.videoObjectPath && 
        s.audioObjectPath && 
        s.status !== "completed" && 
        s.status !== "assembling"
      );

      if (readyScenes.length === 0) {
        const completedScenes = scenes.filter(s => s.status === "completed");
        res.json({
          filmId: film.id,
          message: completedScenes.length > 0 
            ? "All ready scenes already assembled" 
            : "No scenes ready for assembly (need both video and audio)",
          totalScenes: scenes.length,
          completedScenes: completedScenes.length,
          readyForAssembly: 0
        });
        return;
      }

      // Update film stage
      await storage.updateFilm(film.id, { generationStage: "assembling_scenes" });

      // Return immediately and process in background
      res.json({
        filmId: film.id,
        message: "Scene assembly started for entire film",
        readyForAssembly: readyScenes.length,
        totalScenes: scenes.length
      });

      // Process assembly in background
      assembleFilmScenes(film.id).then(async (result) => {
        console.log(`Film scene assembly complete: ${result.successCount} success, ${result.failCount} failed`);
        
        // Update film stage
        if (result.failCount > 0 && result.successCount === 0) {
          await storage.updateFilm(film.id, { generationStage: "failed" });
        } else {
          await storage.updateFilm(film.id, { generationStage: "scenes_ready" });
        }
      }).catch(async (error) => {
        console.error("Film assembly error:", error);
        await storage.updateFilm(film.id, { generationStage: "failed" });
      });
    } catch (error) {
      console.error("Start film assembly error:", error);
      res.status(500).json({ error: "Failed to start scene assembly" });
    }
  });

  // Get assembly progress for a film
  app.get("/api/films/:id/assembly-progress", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const scenes = await storage.getScenesByFilmId(film.id);
      const chapters = await storage.getChaptersByFilmId(film.id);

      const completed = scenes.filter(s => s.status === "completed").length;
      const assembling = scenes.filter(s => s.status === "assembling").length;
      const readyForAssembly = scenes.filter(s => 
        s.videoObjectPath && s.audioObjectPath && 
        s.status !== "completed" && s.status !== "assembling"
      ).length;
      const needsVideo = scenes.filter(s => !s.videoObjectPath).length;
      const needsAudio = scenes.filter(s => !s.audioObjectPath).length;
      const failed = scenes.filter(s => s.status === "failed").length;

      res.json({
        filmId: film.id,
        generationStage: film.generationStage,
        totalScenes: scenes.length,
        completed,
        assembling,
        readyForAssembly,
        needsVideo,
        needsAudio,
        failed,
        percentComplete: scenes.length > 0 ? Math.round((completed / scenes.length) * 100) : 0,
        chapters: chapters.map(ch => {
          const chapterScenes = scenes.filter(s => s.chapterId === ch.id);
          return {
            chapterId: ch.id,
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            totalScenes: chapterScenes.length,
            completedScenes: chapterScenes.filter(s => s.status === "completed").length,
            readyForAssembly: chapterScenes.filter(s => 
              s.videoObjectPath && s.audioObjectPath && 
              s.status !== "completed" && s.status !== "assembling"
            ).length,
            status: ch.status
          };
        })
      });
    } catch (error) {
      console.error("Assembly progress check error:", error);
      res.status(500).json({ error: "Failed to get assembly progress" });
    }
  });

  // ============================================
  // Chapter Assembly - Merge assembled scenes into chapters
  // ============================================

  // Merge all assembled scenes into a single chapter video
  app.post("/api/chapters/:id/merge-scenes", async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }

      const scenes = await storage.getScenesByChapterId(chapter.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found for this chapter. Please split the chapter into scenes first." 
        });
        return;
      }

      // Check for assembled scenes (status completed with assembledVideoPath)
      const assembledScenes = scenes
        .filter(s => s.status === "completed" && s.assembledVideoPath)
        .sort((a, b) => a.sceneNumber - b.sceneNumber);

      if (assembledScenes.length === 0) {
        const needsAssembly = scenes.filter(s => 
          s.videoObjectPath && s.audioObjectPath && s.status !== "completed"
        ).length;
        
        res.status(400).json({ 
          error: "No assembled scenes ready for merging",
          totalScenes: scenes.length,
          needsAssembly,
          hint: "Please assemble scenes first using /api/chapters/:id/assemble-scenes"
        });
        return;
      }

      // Update chapter status
      await storage.updateChapter(chapter.id, { status: "merging" });

      // Return immediately and process in background
      res.json({
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        message: "Chapter merge started",
        assembledScenes: assembledScenes.length,
        totalScenes: scenes.length
      });

      // Process merge in background
      (async () => {
        const tempInputPaths: string[] = [];
        const outputPath = path.join("/tmp", `chapter_${chapter.id}_merged.mp4`);
        
        try {
          console.log(`Merging ${assembledScenes.length} assembled scenes for chapter ${chapter.chapterNumber}`);
          
          // Download all assembled scene videos to temp directory
          for (const scene of assembledScenes) {
            const tempPath = await downloadVideoToTemp(scene.assembledVideoPath!);
            tempInputPaths.push(tempPath);
          }
          
          // Merge with FFmpeg
          await mergeVideosWithFFmpeg(tempInputPaths, outputPath);
          
          // Upload merged video to object storage
          const uploadResult = await uploadMergedVideo(outputPath);
          
          // Calculate total duration from assembled scenes
          let totalDuration = 0;
          for (const scene of assembledScenes) {
            totalDuration += scene.actualDuration || scene.targetDuration || 15;
          }
          
          // Update chapter with merged video
          await storage.updateChapter(chapter.id, {
            status: "completed",
            videoUrl: uploadResult.publicPath,
            objectPath: uploadResult.objectPath,
            duration: formatDuration(totalDuration),
            completedScenes: assembledScenes.length
          });
          
          console.log(`Chapter ${chapter.chapterNumber} merge complete: ${uploadResult.objectPath}`);
        } catch (error) {
          console.error(`Failed to merge chapter ${chapter.chapterNumber}:`, error);
          await storage.updateChapter(chapter.id, { 
            status: "failed"
          });
        } finally {
          // Cleanup temp files
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
      })().catch(error => {
        console.error("Chapter merge error:", error);
        storage.updateChapter(chapter.id, { status: "failed" });
      });
    } catch (error) {
      console.error("Start chapter merge error:", error);
      res.status(500).json({ error: "Failed to start chapter merge" });
    }
  });

  // Merge all chapters in a film (bulk operation)
  app.post("/api/films/:id/merge-chapters", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const chapters = await storage.getChaptersByFilmId(film.id);
      if (chapters.length === 0) {
        res.status(400).json({ error: "No chapters found for this film" });
        return;
      }

      // Get all scenes
      const allScenes = await storage.getScenesByFilmId(film.id);

      // Find chapters ready for merging (all scenes assembled)
      const chaptersReady: typeof chapters = [];
      for (const chapter of chapters) {
        const chapterScenes = allScenes.filter(s => s.chapterId === chapter.id);
        const assembledScenes = chapterScenes.filter(s => 
          s.status === "completed" && s.assembledVideoPath
        );
        
        // Chapter is ready if it has scenes and all are assembled
        if (chapterScenes.length > 0 && 
            assembledScenes.length === chapterScenes.length &&
            chapter.status !== "completed" &&
            chapter.status !== "merging") {
          chaptersReady.push(chapter);
        }
      }

      if (chaptersReady.length === 0) {
        const completedChapters = chapters.filter(c => c.status === "completed");
        res.json({
          filmId: film.id,
          message: completedChapters.length > 0 
            ? "All ready chapters already merged" 
            : "No chapters ready for merging (scenes not all assembled)",
          totalChapters: chapters.length,
          completedChapters: completedChapters.length,
          readyForMerge: 0
        });
        return;
      }

      // Update film stage
      await storage.updateFilm(film.id, { generationStage: "assembling_chapters" });

      // Return immediately and process in background
      res.json({
        filmId: film.id,
        message: "Chapter merging started for entire film",
        readyForMerge: chaptersReady.length,
        totalChapters: chapters.length
      });

      // Process all chapters in background
      (async () => {
        let successCount = 0;
        let failCount = 0;

        for (const chapter of chaptersReady) {
          const chapterScenes = allScenes
            .filter(s => s.chapterId === chapter.id && s.status === "completed" && s.assembledVideoPath)
            .sort((a, b) => a.sceneNumber - b.sceneNumber);

          if (chapterScenes.length === 0) {
            failCount++;
            continue;
          }

          const tempInputPaths: string[] = [];
          const outputPath = path.join("/tmp", `chapter_${chapter.id}_merged.mp4`);

          try {
            await storage.updateChapter(chapter.id, { status: "merging" });
            
            console.log(`Merging ${chapterScenes.length} scenes for chapter ${chapter.chapterNumber}`);
            
            // Download all assembled scene videos
            for (const scene of chapterScenes) {
              const tempPath = await downloadVideoToTemp(scene.assembledVideoPath!);
              tempInputPaths.push(tempPath);
            }
            
            // Merge with FFmpeg
            await mergeVideosWithFFmpeg(tempInputPaths, outputPath);
            
            // Upload merged video
            const uploadResult = await uploadMergedVideo(outputPath);
            
            // Calculate total duration
            let totalDuration = 0;
            for (const scene of chapterScenes) {
              totalDuration += scene.actualDuration || scene.targetDuration || 15;
            }
            
            // Update chapter
            await storage.updateChapter(chapter.id, {
              status: "completed",
              videoUrl: uploadResult.publicPath,
              objectPath: uploadResult.objectPath,
              duration: formatDuration(totalDuration),
              completedScenes: chapterScenes.length
            });
            
            successCount++;
            console.log(`Chapter ${chapter.chapterNumber} merged successfully`);
          } catch (error) {
            console.error(`Failed to merge chapter ${chapter.chapterNumber}:`, error);
            await storage.updateChapter(chapter.id, { status: "failed" });
            failCount++;
          } finally {
            // Cleanup temp files
            for (const tempPath of tempInputPaths) {
              try {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
              } catch (e) {}
            }
            try {
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
          }
        }

        console.log(`Film chapter merge complete: ${successCount} success, ${failCount} failed`);
        
        // Update film stage
        if (failCount > 0 && successCount === 0) {
          await storage.updateFilm(film.id, { generationStage: "failed" });
        } else {
          await storage.updateFilm(film.id, { generationStage: "chapters_ready" });
        }
      })().catch(async (error) => {
        console.error("Film chapter merge error:", error);
        await storage.updateFilm(film.id, { generationStage: "failed" });
      });
    } catch (error) {
      console.error("Start film chapter merge error:", error);
      res.status(500).json({ error: "Failed to start chapter merging" });
    }
  });

  // Get chapter merge progress for a film
  app.get("/api/films/:id/chapter-merge-progress", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const chapters = await storage.getChaptersByFilmId(film.id);
      const allScenes = await storage.getScenesByFilmId(film.id);

      const chapterProgress = chapters.map(chapter => {
        const chapterScenes = allScenes.filter(s => s.chapterId === chapter.id);
        const assembledScenes = chapterScenes.filter(s => 
          s.status === "completed" && s.assembledVideoPath
        );
        
        return {
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          status: chapter.status,
          totalScenes: chapterScenes.length,
          assembledScenes: assembledScenes.length,
          allScenesReady: chapterScenes.length > 0 && assembledScenes.length === chapterScenes.length,
          hasVideo: !!chapter.objectPath,
          videoUrl: chapter.videoUrl,
          duration: chapter.duration
        };
      });

      const completed = chapterProgress.filter(c => c.status === "completed").length;
      const merging = chapterProgress.filter(c => c.status === "merging").length;
      const readyForMerge = chapterProgress.filter(c => 
        c.allScenesReady && c.status !== "completed" && c.status !== "merging"
      ).length;
      const failed = chapterProgress.filter(c => c.status === "failed").length;

      res.json({
        filmId: film.id,
        generationStage: film.generationStage,
        totalChapters: chapters.length,
        completed,
        merging,
        readyForMerge,
        failed,
        percentComplete: chapters.length > 0 ? Math.round((completed / chapters.length) * 100) : 0,
        chapters: chapterProgress
      });
    } catch (error) {
      console.error("Chapter merge progress check error:", error);
      res.status(500).json({ error: "Failed to get chapter merge progress" });
    }
  });

  // ============================================
  // Final Film Merge - Combine all chapters into one film
  // ============================================

  // Merge all completed chapters into final film
  app.post("/api/films/:id/merge-final", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const chapters = await storage.getChaptersByFilmId(film.id);
      if (chapters.length === 0) {
        res.status(400).json({ error: "No chapters found for this film" });
        return;
      }

      // Find completed chapters with video paths
      const completedChapters = chapters
        .filter(c => c.status === "completed" && c.objectPath)
        .sort((a, b) => a.chapterNumber - b.chapterNumber);

      if (completedChapters.length === 0) {
        const pendingCount = chapters.filter(c => c.status !== "completed").length;
        res.status(400).json({ 
          error: "No completed chapters ready for final merge",
          totalChapters: chapters.length,
          pendingChapters: pendingCount,
          hint: "Please ensure all chapters are merged first using /api/films/:id/merge-chapters"
        });
        return;
      }

      // Calculate estimated total duration before starting
      let estimatedDuration = 0;
      for (const chapter of completedChapters) {
        estimatedDuration += parseDurationToSeconds(chapter.duration);
      }

      // Update film stage
      await storage.updateFilm(film.id, { generationStage: "merging_final" });

      // Return immediately and process in background
      res.json({
        filmId: film.id,
        message: "Final film merge started",
        chaptersToMerge: completedChapters.length,
        totalChapters: chapters.length,
        estimatedDuration: formatDuration(estimatedDuration)
      });

      // Process final merge in background
      (async () => {
        try {
          console.log(`Starting final merge for film "${film.title}" with ${completedChapters.length} chapters`);
          
          const result = await mergeFinalMovie(completedChapters, film.id);
          
          // Update film with final video
          await storage.updateFilm(film.id, {
            generationStage: "completed",
            finalVideoUrl: result.videoUrl,
            finalVideoPath: result.objectPath,
            status: "completed"
          });
          
          console.log(`Final film merge complete: ${result.objectPath} (${formatDuration(result.duration)})`);
        } catch (error) {
          console.error(`Failed to merge final film "${film.title}":`, error);
          await storage.updateFilm(film.id, { generationStage: "failed" });
        }
      })().catch(async (error) => {
        console.error("Final film merge error:", error);
        await storage.updateFilm(film.id, { generationStage: "failed" });
      });
    } catch (error) {
      console.error("Start final merge error:", error);
      res.status(500).json({ error: "Failed to start final film merge" });
    }
  });

  // Get final merge progress for a film
  app.get("/api/films/:id/final-merge-progress", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const chapters = await storage.getChaptersByFilmId(film.id);
      const completedChapters = chapters.filter(c => c.status === "completed" && c.objectPath);
      
      // Calculate total duration from completed chapters
      let totalDuration = 0;
      for (const chapter of completedChapters) {
        totalDuration += parseDurationToSeconds(chapter.duration);
      }

      res.json({
        filmId: film.id,
        filmTitle: film.title,
        generationStage: film.generationStage,
        status: film.status,
        totalChapters: chapters.length,
        completedChapters: completedChapters.length,
        readyForFinalMerge: completedChapters.length > 0 && film.generationStage === "chapters_ready",
        isMerging: film.generationStage === "merging_final",
        isComplete: film.generationStage === "completed" && !!film.finalVideoPath,
        estimatedDuration: formatDuration(totalDuration),
        finalVideoUrl: film.finalVideoUrl,
        finalVideoPath: film.finalVideoPath,
        chapters: chapters.map(c => ({
          chapterNumber: c.chapterNumber,
          title: c.title,
          status: c.status,
          hasVideo: !!c.objectPath,
          duration: c.duration
        }))
      });
    } catch (error) {
      console.error("Final merge progress check error:", error);
      res.status(500).json({ error: "Failed to get final merge progress" });
    }
  });

  // Get comprehensive generation progress for a film
  app.get("/api/films/:id/generation-progress", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const chapters = await storage.getChaptersByFilmId(film.id);
      const scenes = await storage.getScenesByFilmId(film.id);

      // Calculate scene statistics
      const sceneStats = {
        total: scenes.length,
        pending: scenes.filter(s => s.status === "pending").length,
        generatingVideo: scenes.filter(s => s.status === "generating_video").length,
        videoComplete: scenes.filter(s => s.status === "video_complete").length,
        generatingAudio: scenes.filter(s => s.status === "generating_audio").length,
        audioComplete: scenes.filter(s => s.status === "audio_complete").length,
        assembling: scenes.filter(s => s.status === "assembling").length,
        completed: scenes.filter(s => s.status === "completed").length,
        failed: scenes.filter(s => s.status === "failed").length,
      };

      // Calculate chapter statistics
      const chapterStats = {
        total: chapters.length,
        pending: chapters.filter(c => c.status === "pending").length,
        splittingScenes: chapters.filter(c => c.status === "splitting_scenes").length,
        scenesReady: chapters.filter(c => c.status === "scenes_ready").length,
        generatingAudio: chapters.filter(c => c.status === "generating_audio").length,
        generatingVideos: chapters.filter(c => c.status === "generating_videos").length,
        assembling: chapters.filter(c => c.status === "assembling").length,
        merging: chapters.filter(c => c.status === "merging").length,
        completed: chapters.filter(c => c.status === "completed").length,
        failed: chapters.filter(c => c.status === "failed").length,
      };

      // Calculate overall progress percentage
      let overallProgress = 0;
      const stageWeights: Record<string, number> = {
        idle: 0,
        generating_chapters: 5,
        splitting_scenes: 15,
        scenes_ready: 20,
        generating_audio: 35,
        generating_videos: 50,
        assembling_scenes: 70,
        assembling_chapters: 85,
        chapters_ready: 90,
        merging_final: 95,
        completed: 100,
        failed: 0
      };
      overallProgress = stageWeights[film.generationStage || "idle"] || 0;

      // Calculate estimated total duration
      let estimatedDuration = 0;
      for (const chapter of chapters.filter(c => c.status === "completed" && c.objectPath)) {
        estimatedDuration += parseDurationToSeconds(chapter.duration);
      }

      res.json({
        filmId: film.id,
        filmTitle: film.title,
        filmMode: film.filmMode,
        generationStage: film.generationStage,
        status: film.status,
        overallProgress,
        estimatedDuration: formatDuration(estimatedDuration),
        finalVideoUrl: film.finalVideoUrl,
        finalVideoPath: film.finalVideoPath,
        isComplete: film.generationStage === "completed" && !!film.finalVideoPath,
        scenes: sceneStats,
        chapters: chapterStats,
        chapterDetails: chapters.map(c => {
          const chapterScenes = scenes.filter(s => s.chapterId === c.id);
          return {
            id: c.id,
            chapterNumber: c.chapterNumber,
            title: c.title,
            status: c.status,
            hasVideo: !!c.objectPath,
            videoUrl: c.videoUrl,
            duration: c.duration,
            totalScenes: chapterScenes.length,
            completedScenes: chapterScenes.filter(s => s.status === "completed").length,
            failedScenes: chapterScenes.filter(s => s.status === "failed").length
          };
        })
      });
    } catch (error) {
      console.error("Generation progress check error:", error);
      res.status(500).json({ error: "Failed to get generation progress" });
    }
  });

  // ============================================
  // Scene Video Generation using VideogenAPI
  // ============================================

  // Generate video for a single scene using VideogenAPI
  app.post("/api/scenes/:id/generate-video", async (req, res) => {
    try {
      const scene = await storage.getScene(req.params.id);
      if (!scene) {
        res.status(404).json({ error: "Scene not found" });
        return;
      }

      if (!scene.visualPrompt || scene.visualPrompt.trim() === "") {
        res.status(400).json({ error: "Scene has no visual prompt for video generation" });
        return;
      }

      const apiKey = process.env.VIDEOGEN_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "VIDEOGEN_API_KEY not configured" });
        return;
      }

      // Get the film to determine video settings
      const film = await storage.getFilm(scene.filmId);
      const model = film?.videoModel || "kling_21";
      const resolution = film?.frameSize || "1080p";
      const duration = scene.targetDuration || 15;

      await storage.updateScene(scene.id, { status: "generating_video" });

      // Start video generation
      const requestBody = {
        model,
        prompt: scene.visualPrompt,
        duration: Math.min(duration, 20), // Cap at 20 seconds for API limits
        resolution,
        aspect_ratio: "16:9"
      };

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
        console.error("VideogenAPI error for scene:", errorText);
        await storage.updateScene(scene.id, { 
          status: "failed",
          errorMessage: `Video generation failed: ${errorText}`
        });
        res.status(500).json({ error: "Video generation failed", details: errorText });
        return;
      }

      const result = await response.json();
      const externalId = result.id || result.video_id || result.generation_id;

      // Update scene with external ID for polling
      await storage.updateScene(scene.id, {
        externalVideoId: externalId,
        status: "generating_video"
      });

      res.json({
        sceneId: scene.id,
        externalId,
        status: "generating_video",
        message: "Video generation started"
      });
    } catch (error) {
      console.error("Scene video generation error:", error);
      await storage.updateScene(req.params.id, { 
        status: "failed",
        errorMessage: `Video generation error: ${error}`
      });
      res.status(500).json({ error: "Failed to generate video" });
    }
  });

  // Check video generation status for a scene
  app.get("/api/scenes/:id/video-status", async (req, res) => {
    try {
      const scene = await storage.getScene(req.params.id);
      if (!scene) {
        res.status(404).json({ error: "Scene not found" });
        return;
      }

      // If already completed or failed, return current status
      if (scene.status === "video_complete" || scene.status === "completed") {
        res.json({
          sceneId: scene.id,
          status: scene.status,
          videoUrl: scene.videoUrl,
          videoObjectPath: scene.videoObjectPath
        });
        return;
      }

      if (scene.status === "failed") {
        res.json({
          sceneId: scene.id,
          status: "failed",
          errorMessage: scene.errorMessage
        });
        return;
      }

      // If we have an external ID, check status with VideogenAPI
      if (scene.externalVideoId) {
        const apiKey = process.env.VIDEOGEN_API_KEY;
        if (!apiKey) {
          res.status(500).json({ error: "VIDEOGEN_API_KEY not configured" });
          return;
        }

        const response = await fetch(`https://videogenapi.com/api/v1/status/${scene.externalVideoId}`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const videoUrl = result.video_url || result.url;

          if (videoUrl) {
            // Upload video to object storage
            try {
              const objectStorageService = new ObjectStorageService();
              const objectPath = await objectStorageService.uploadVideoFromUrl(videoUrl);

              await storage.updateScene(scene.id, {
                videoUrl: videoUrl,
                videoObjectPath: objectPath,
                status: "video_complete"
              });

              res.json({
                sceneId: scene.id,
                status: "video_complete",
                videoUrl,
                videoObjectPath: objectPath
              });
              return;
            } catch (uploadError) {
              console.error("Failed to upload scene video to object storage:", uploadError);
              await storage.updateScene(scene.id, {
                videoUrl,
                status: "video_complete"
              });
              res.json({
                sceneId: scene.id,
                status: "video_complete",
                videoUrl
              });
              return;
            }
          }

          if (result.status === "failed" || result.status === "error") {
            await storage.updateScene(scene.id, {
              status: "failed",
              errorMessage: result.message || "Video generation failed"
            });
            res.json({
              sceneId: scene.id,
              status: "failed",
              errorMessage: result.message || "Video generation failed"
            });
            return;
          }

          // Still processing
          res.json({
            sceneId: scene.id,
            status: "generating_video",
            externalStatus: result.status || "processing"
          });
          return;
        }
      }

      res.json({
        sceneId: scene.id,
        status: scene.status
      });
    } catch (error) {
      console.error("Scene video status check error:", error);
      res.status(500).json({ error: "Failed to check video status" });
    }
  });

  // Generate videos for all scenes in a chapter
  app.post("/api/chapters/:id/generate-videos", async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }

      const scenes = await storage.getScenesByChapterId(chapter.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found. Please split chapter into scenes first." 
        });
        return;
      }

      const apiKey = process.env.VIDEOGEN_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "VIDEOGEN_API_KEY not configured" });
        return;
      }

      // Get film settings
      const film = await storage.getFilm(chapter.filmId);
      const model = film?.videoModel || "kling_21";
      const resolution = film?.frameSize || "1080p";

      await storage.updateChapter(chapter.id, { status: "generating_videos" });

      // Return immediately and process in background
      res.json({
        chapterId: chapter.id,
        message: "Video generation started for all scenes",
        totalScenes: scenes.length
      });

      // Process video generation in background
      (async () => {
        let successCount = 0;
        let failCount = 0;

        for (const scene of scenes) {
          // Skip scenes that already have video
          if (scene.videoUrl || scene.status === "video_complete" || scene.status === "completed") {
            console.log(`Scene ${scene.sceneNumber} already has video, skipping`);
            successCount++;
            continue;
          }

          if (!scene.visualPrompt || scene.visualPrompt.trim() === "") {
            console.log(`Scene ${scene.sceneNumber} has no visual prompt, skipping`);
            continue;
          }

          try {
            console.log(`Starting video generation for scene ${scene.sceneNumber}...`);
            await storage.updateScene(scene.id, { status: "generating_video" });

            const requestBody = {
              model,
              prompt: scene.visualPrompt,
              duration: Math.min(scene.targetDuration || 15, 20),
              resolution,
              aspect_ratio: "16:9"
            };

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
              console.error(`VideogenAPI error for scene ${scene.sceneNumber}:`, errorText);
              await storage.updateScene(scene.id, { 
                status: "failed",
                errorMessage: `Video generation failed: ${errorText}`
              });
              failCount++;
              continue;
            }

            const result = await response.json();
            const externalId = result.id || result.video_id || result.generation_id;

            // Poll for completion
            const pollResult = await pollVideoStatus(externalId, 120); // 10 minutes timeout

            if (pollResult.videoUrl) {
              // Upload to object storage
              try {
                const objectStorageService = new ObjectStorageService();
                const objectPath = await objectStorageService.uploadVideoFromUrl(pollResult.videoUrl);

                await storage.updateScene(scene.id, {
                  videoUrl: pollResult.videoUrl,
                  videoObjectPath: objectPath,
                  externalVideoId: externalId,
                  status: "video_complete"
                });
                successCount++;
                console.log(`Scene ${scene.sceneNumber} video generated successfully`);
              } catch (uploadError) {
                console.error(`Failed to upload scene ${scene.sceneNumber} video:`, uploadError);
                await storage.updateScene(scene.id, {
                  videoUrl: pollResult.videoUrl,
                  externalVideoId: externalId,
                  status: "video_complete"
                });
                successCount++;
              }
            } else {
              await storage.updateScene(scene.id, {
                status: "failed",
                errorMessage: `Video generation ${pollResult.status}`
              });
              failCount++;
            }
          } catch (error) {
            console.error(`Error generating video for scene ${scene.sceneNumber}:`, error);
            await storage.updateScene(scene.id, {
              status: "failed",
              errorMessage: `Error: ${error}`
            });
            failCount++;
          }
        }

        // Update chapter status
        await storage.updateChapter(chapter.id, {
          status: failCount > 0 && successCount === 0 ? "failed" : "videos_ready",
          completedScenes: successCount
        });

        console.log(`Chapter ${chapter.chapterNumber} video generation complete: ${successCount} success, ${failCount} failed`);
      })().catch(async (error) => {
        console.error("Chapter video generation error:", error);
        await storage.updateChapter(chapter.id, { status: "failed" });
      });
    } catch (error) {
      console.error("Start chapter video generation error:", error);
      res.status(500).json({ error: "Failed to start video generation" });
    }
  });

  // Generate videos for all scenes in a film
  app.post("/api/films/:id/generate-scene-videos", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const scenes = await storage.getScenesByFilmId(film.id);
      if (scenes.length === 0) {
        res.status(400).json({ 
          error: "No scenes found. Please split chapters into scenes first using /api/films/:id/split-scenes" 
        });
        return;
      }

      const apiKey = process.env.VIDEOGEN_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "VIDEOGEN_API_KEY not configured" });
        return;
      }

      // Update film stage
      await storage.updateFilm(film.id, { generationStage: "generating_videos" });

      // Return immediately and process in background
      res.json({
        filmId: film.id,
        message: "Video generation started for all film scenes",
        totalScenes: scenes.length
      });

      // Process video generation in background
      generateFilmSceneVideos(film.id).catch(async (error) => {
        console.error("Film video generation error:", error);
        await storage.updateFilm(film.id, { generationStage: "failed" });
      });
    } catch (error) {
      console.error("Start film video generation error:", error);
      res.status(500).json({ error: "Failed to start video generation" });
    }
  });

  // Get video generation progress for a film
  app.get("/api/films/:id/video-progress", async (req, res) => {
    try {
      const film = await storage.getFilm(req.params.id);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      const scenes = await storage.getScenesByFilmId(film.id);
      const chapters = await storage.getChaptersByFilmId(film.id);

      const videoComplete = scenes.filter(s => s.status === "video_complete" || s.status === "completed").length;
      const generating = scenes.filter(s => s.status === "generating_video").length;
      const failed = scenes.filter(s => s.status === "failed").length;
      const pending = scenes.filter(s => s.status === "pending" || s.status === "audio_complete").length;

      res.json({
        filmId: film.id,
        generationStage: film.generationStage,
        totalScenes: scenes.length,
        videoComplete,
        generating,
        failed,
        pending,
        percentComplete: scenes.length > 0 ? Math.round((videoComplete / scenes.length) * 100) : 0,
        chapters: chapters.map(ch => {
          const chapterScenes = scenes.filter(s => s.chapterId === ch.id);
          return {
            chapterId: ch.id,
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            totalScenes: chapterScenes.length,
            completedScenes: chapterScenes.filter(s => s.status === "video_complete" || s.status === "completed").length,
            status: ch.status
          };
        })
      });
    } catch (error) {
      console.error("Video progress check error:", error);
      res.status(500).json({ error: "Failed to get video progress" });
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

  // Track active pipelines to prevent duplicate starts
  const activePipelines = new Set<string>();

  // Start full film generation pipeline
  app.post("/api/films/:id/start-generation", async (req, res) => {
    try {
      const filmId = req.params.id;
      
      // Prevent duplicate pipeline starts
      if (activePipelines.has(filmId)) {
        res.json({ message: "Film generation already running", filmId });
        return;
      }
      
      const film = await storage.getFilm(filmId);
      if (!film) {
        res.status(404).json({ error: "Film not found" });
        return;
      }

      // Only allow starting if truly idle or failed
      const allowedStages = ["idle", "failed"];
      if (!allowedStages.includes(film.generationStage || "idle")) {
        res.json({ message: "Film generation already in progress", filmId });
        return;
      }

      // Mark as active before starting
      activePipelines.add(filmId);
      
      // Start the pipeline in background
      res.json({ message: "Film generation started", filmId: film.id });

      // Run the pipeline asynchronously
      runFilmGenerationPipeline(film.id)
        .catch(async (error) => {
          console.error("Pipeline error:", error);
          await storage.updateFilm(film.id, { generationStage: "failed" });
        })
        .finally(() => {
          activePipelines.delete(filmId);
        });
    } catch (error) {
      console.error("Start generation error:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection");
    
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "subscribe" && data.filmId) {
          // Subscribe client to film updates
          if (!filmClients.has(data.filmId)) {
            filmClients.set(data.filmId, new Set());
          }
          filmClients.get(data.filmId)!.add(ws);
          console.log(`Client subscribed to film ${data.filmId}`);
          
          // Send confirmation
          ws.send(JSON.stringify({ type: "subscribed", filmId: data.filmId }));
        }
        
        if (data.type === "unsubscribe" && data.filmId) {
          const clients = filmClients.get(data.filmId);
          if (clients) {
            clients.delete(ws);
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    ws.on("close", () => {
      // Remove client from all subscriptions
      filmClients.forEach((clients) => {
        clients.delete(ws);
      });
    });
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

// Main film generation pipeline with real-time WebSocket updates
async function runFilmGenerationPipeline(filmId: string) {
  console.log(`Starting film generation pipeline for film ${filmId}`);
  
  const apiKey = process.env.VIDEOGEN_API_KEY;
  if (!apiKey) {
    emitFilmEvent(filmId, "pipeline_error", { error: "VIDEOGEN_API_KEY not configured" });
    throw new Error("VIDEOGEN_API_KEY not configured");
  }

  // Step 1: Update stage to generating_chapters
  await storage.updateFilm(filmId, { generationStage: "generating_chapters" });
  emitFilmEvent(filmId, "stage_update", { stage: "generating_chapters", message: "Starting story generation..." });
  
  const film = await storage.getFilm(filmId);
  if (!film) throw new Error("Film not found");

  // Step 2: Check if framework exists, if not generate it
  let framework = await storage.getStoryFrameworkByFilmId(filmId);
  if (!framework) {
    console.log("Generating story framework...");
    emitFilmEvent(filmId, "framework_generating", { message: "AI is creating your story framework..." });
    
    const generatedFramework = await generateStoryFramework(film.title);
    
    // Map AI response to database schema (genres array -> genre string)
    const genre = Array.isArray(generatedFramework.genres) 
      ? generatedFramework.genres.join(", ") 
      : (generatedFramework.genre || "Drama");
    
    framework = await storage.createStoryFramework({
      filmId,
      premise: generatedFramework.premise,
      hook: generatedFramework.hook,
      genre,
      tone: generatedFramework.tone,
      setting: generatedFramework.setting,
      characters: generatedFramework.characters
    });
    
    emitFilmEvent(filmId, "framework_complete", { 
      message: "Story framework created!",
      framework: { premise: framework.premise, genre, tone: framework.tone }
    });
  }

  // Step 3: Check if chapters exist, if not generate them
  let chapters = await storage.getChaptersByFilmId(filmId);
  if (chapters.length === 0) {
    console.log("Generating chapters...");
    emitFilmEvent(filmId, "chapters_generating", { message: "AI is writing your screenplay chapters..." });
    
    const numberOfChapters = film.chapterCount || 5;
    const wordsPerChapter = film.wordsPerChapter || 500;
    
    try {
      const generatedChapters = await generateChapters(film.title, framework, numberOfChapters, wordsPerChapter);
      
      if (!generatedChapters || generatedChapters.length === 0) {
        console.error("Chapter generation returned empty result");
        await storage.updateFilm(filmId, { generationStage: "failed" });
        emitFilmEvent(filmId, "pipeline_error", { error: "Failed to generate chapters" });
        throw new Error("Failed to generate chapters - empty result");
      }
      
      for (let i = 0; i < generatedChapters.length; i++) {
        const chapter = generatedChapters[i];
        const createdChapter = await storage.createChapter({
          filmId,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          summary: chapter.summary,
          prompt: chapter.prompt,
          status: "pending"
        });
        
        // Emit chapter created event in real-time
        emitFilmEvent(filmId, "chapter_created", {
          chapterNumber: chapter.chapterNumber,
          chapterId: createdChapter.id,
          title: chapter.title,
          totalChapters: generatedChapters.length,
          progress: Math.round(((i + 1) / generatedChapters.length) * 100)
        });
      }
      chapters = await storage.getChaptersByFilmId(filmId);
      
      // Verify chapters were actually created
      if (chapters.length === 0) {
        console.error("Chapters were generated but not saved to database");
        await storage.updateFilm(filmId, { generationStage: "failed" });
        emitFilmEvent(filmId, "pipeline_error", { error: "Failed to save chapters" });
        throw new Error("Failed to save chapters to database");
      }
      
      console.log(`Successfully created ${chapters.length} chapters`);
      emitFilmEvent(filmId, "chapters_complete", { 
        message: `Created ${chapters.length} chapters!`,
        totalChapters: chapters.length 
      });
    } catch (error) {
      console.error("Chapter generation error:", error);
      await storage.updateFilm(filmId, { generationStage: "failed" });
      emitFilmEvent(filmId, "pipeline_error", { error: String(error) });
      throw error;
    }
  }

  // Step 4: Update stage to generating_prompts
  await storage.updateFilm(filmId, { generationStage: "generating_prompts" });
  emitFilmEvent(filmId, "stage_update", { stage: "generating_prompts", message: "Creating scene prompts..." });

  // Step 5 & 6: Process each chapter - generate prompts and immediately start video generation
  // This is the REAL-TIME streaming approach: prompt -> video -> next
  await storage.updateFilm(filmId, { generationStage: "generating_videos" });
  
  let totalScenes = 0;
  let completedScenes = 0;
  
  for (const chapter of chapters) {
    console.log(`Processing chapter ${chapter.chapterNumber}: ${chapter.title}`);
    
    // Generate scene prompts if not already done
    if (!chapter.scenePrompts || chapter.scenePrompts.length === 0) {
      console.log(`Generating scene prompts for chapter ${chapter.chapterNumber}...`);
      
      emitFilmEvent(filmId, "scene_prompts_generating", {
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.title,
        message: `Generating scene prompts for "${chapter.title}"...`
      });
      
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
        status: "generating_videos",
        totalScenes: scenePrompts.length
      });
      
      emitFilmEvent(filmId, "scene_prompts_ready", {
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        sceneCount: scenePrompts.length,
        prompts: scenePrompts
      });
      
      // Now immediately start generating videos for each scene
      for (let i = 0; i < videoFrames.length; i++) {
        const frame = videoFrames[i];
        totalScenes++;
        
        emitFilmEvent(filmId, "scene_video_started", {
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          sceneNumber: frame.frameNumber,
          prompt: frame.prompt,
          message: `Generating video for Chapter ${chapter.chapterNumber}, Scene ${frame.frameNumber}...`
        });
        
        try {
          // Start video generation
          console.log(`Starting video generation for chapter ${chapter.chapterNumber}, scene ${frame.frameNumber}...`);
          
          const generateResponse = await fetch("https://videogenapi.com/api/v1/generate", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prompt: frame.prompt,
              model: "higgsfield_v1",
              duration: 5 // higgsfield_v1 requires duration between 5-15 seconds
            })
          });

          if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            const statusCode = generateResponse.status;
            const statusText = generateResponse.statusText;
            console.error(`Video generation failed (${statusCode} ${statusText}): ${errorText || 'No error message'}`);
            console.error(`Request was: prompt="${frame.prompt.substring(0, 100)}...", model=higgsfield_v1, duration=4`);
            
            videoFrames[i] = { ...frame, status: "failed" };
            await storage.updateChapter(chapter.id, { videoFrames });
            
            emitFilmEvent(filmId, "scene_video_failed", {
              chapterId: chapter.id,
              chapterNumber: chapter.chapterNumber,
              sceneNumber: frame.frameNumber,
              error: `${statusCode}: ${errorText || statusText || 'Unknown error'}`
            });
            continue;
          }

          const generateResult = await generateResponse.json();
          const externalId = generateResult.id || generateResult.external_id || generateResult.video_id;
          
          // Poll for completion
          const pollResult = await pollVideoStatus(externalId);
          
          if (pollResult.videoUrl) {
            videoFrames[i] = { 
              ...frame, 
              status: "completed", 
              videoUrl: pollResult.videoUrl,
              externalId 
            };
            completedScenes++;
            
            await storage.updateChapter(chapter.id, { 
              videoFrames,
              completedScenes: videoFrames.filter((f: { status: string }) => f.status === "completed").length
            });
            
            // REAL-TIME: Emit video completed with URL for immediate preview
            emitFilmEvent(filmId, "scene_video_completed", {
              chapterId: chapter.id,
              chapterNumber: chapter.chapterNumber,
              sceneNumber: frame.frameNumber,
              videoUrl: pollResult.videoUrl,
              completedScenes,
              totalScenes,
              progress: Math.round((completedScenes / totalScenes) * 100),
              message: `Video ready! Chapter ${chapter.chapterNumber}, Scene ${frame.frameNumber}`
            });
            
            console.log(`Video completed for chapter ${chapter.chapterNumber}, scene ${frame.frameNumber}`);
          } else {
            videoFrames[i] = { ...frame, status: "failed" };
            await storage.updateChapter(chapter.id, { videoFrames });
            
            emitFilmEvent(filmId, "scene_video_failed", {
              chapterId: chapter.id,
              chapterNumber: chapter.chapterNumber,
              sceneNumber: frame.frameNumber,
              error: "Video generation timeout"
            });
          }
        } catch (error) {
          console.error(`Error generating video for scene ${frame.frameNumber}:`, error);
          videoFrames[i] = { ...frame, status: "failed" };
          await storage.updateChapter(chapter.id, { videoFrames });
          
          emitFilmEvent(filmId, "scene_video_failed", {
            chapterId: chapter.id,
            chapterNumber: chapter.chapterNumber,
            sceneNumber: frame.frameNumber,
            error: String(error)
          });
        }
      }
      
      // Update chapter as completed
      await storage.updateChapter(chapter.id, { status: "completed" });
      
      emitFilmEvent(filmId, "chapter_complete", {
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        message: `Chapter ${chapter.chapterNumber} complete!`
      });
    }
  }

  // Step 7: Merge chapter videos
  await storage.updateFilm(filmId, { generationStage: "merging_chapters" });
  emitFilmEvent(filmId, "stage_update", { stage: "merging_chapters", message: "Assembling chapter videos..." });
  
  chapters = await storage.getChaptersByFilmId(filmId);
  for (const chapter of chapters) {
    if (chapter.status === "completed" && chapter.videoFrames && chapter.videoFrames.length > 0) {
      try {
        console.log(`Merging videos for chapter ${chapter.chapterNumber}...`);
        emitFilmEvent(filmId, "chapter_merging", {
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          message: `Merging Chapter ${chapter.chapterNumber} videos...`
        });
        
        const mergeResult = await mergeChapterVideos(chapter);
        
        await storage.updateChapter(chapter.id, { 
          status: "completed",
          videoUrl: mergeResult.videoUrl,
          objectPath: mergeResult.objectPath,
          duration: `00:${String(mergeResult.duration).padStart(2, '0')}`
        });
        
        emitFilmEvent(filmId, "chapter_merged", {
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          videoUrl: mergeResult.videoUrl,
          message: `Chapter ${chapter.chapterNumber} merged!`
        });
        
        console.log(`Chapter ${chapter.chapterNumber} merged successfully: ${mergeResult.objectPath}`);
      } catch (mergeError) {
        console.error(`Failed to merge chapter ${chapter.chapterNumber}:`, mergeError);
        await storage.updateChapter(chapter.id, { status: "failed" });
        emitFilmEvent(filmId, "chapter_merge_failed", {
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          error: String(mergeError)
        });
      }
    }
  }

  // Step 8: Merge all chapter videos into final movie
  await storage.updateFilm(filmId, { generationStage: "merging_final" });
  emitFilmEvent(filmId, "stage_update", { stage: "merging_final", message: "Creating final movie..." });
  
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
      
      emitFilmEvent(filmId, "pipeline_complete", {
        message: "Your film is ready!",
        finalVideoUrl: finalResult.videoUrl,
        totalChapters: completedChapters.length
      });
      
      console.log(`Final movie merged successfully: ${finalResult.objectPath}`);
    } catch (finalMergeError) {
      console.error(`Failed to merge final movie:`, finalMergeError);
      await storage.updateFilm(filmId, { generationStage: "failed" });
      emitFilmEvent(filmId, "pipeline_error", { error: "Failed to merge final movie" });
    }
  } else {
    console.log(`No completed chapters to merge for final movie`);
    await storage.updateFilm(filmId, { generationStage: "completed" });
    emitFilmEvent(filmId, "pipeline_complete", {
      message: "Film generation completed (no videos to merge)",
      totalChapters: 0
    });
  }
  
  console.log(`Film generation pipeline completed for film ${filmId}`);
}
