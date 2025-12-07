import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, Zap, Film, Mic, Clock, Hash, Video, BookOpen, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NARRATOR_VOICES, STORY_LENGTHS, VIDEO_MODELS, FRAME_SIZES } from "@shared/schema";

interface StoryPreview {
  genres: string[];
  premise: string;
  openingHook: string;
}

const NARRATOR_VOICE_LABELS: Record<string, string> = {
  "male-narrator": "Male Narrator",
  "female-narrator": "Female Narrator",
  "dramatic-male": "Dramatic Male",
  "dramatic-female": "Dramatic Female",
  "neutral": "Neutral Voice",
  "documentary": "Documentary Style"
};

const STORY_LENGTH_LABELS: Record<string, { label: string; range: string }> = {
  "short": { label: "Short Film", range: "3-5 chapters" },
  "medium": { label: "Medium Film", range: "6-12 chapters" },
  "long": { label: "Feature Film", range: "13-18 chapters" },
  "custom": { label: "Custom", range: "Set your own" }
};

const VIDEO_MODEL_LABELS: Record<string, { label: string; quality: string }> = {
  "sora-2": { label: "Sora 2", quality: "Ultra HD" },
  "minimax-video-01": { label: "Minimax Video", quality: "High Quality" },
  "veo-2": { label: "Veo 2", quality: "Premium" },
  "kling-video": { label: "Kling Video", quality: "Fast" },
  "runway-gen-3": { label: "Runway Gen-3", quality: "Creative" }
};

const FRAME_SIZE_LABELS: Record<string, { label: string; resolution: string }> = {
  "720p": { label: "HD", resolution: "1280x720" },
  "1080p": { label: "Full HD", resolution: "1920x1080" },
  "4K": { label: "4K Ultra HD", resolution: "3840x2160" }
};

export default function CreateFilm() {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<StoryPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  const [narratorVoice, setNarratorVoice] = useState("male-narrator");
  const [storyLength, setStoryLength] = useState("medium");
  const [chapterCount, setChapterCount] = useState(5);
  const [wordsPerChapter, setWordsPerChapter] = useState(500);
  const [videoModel, setVideoModel] = useState("sora-2");
  const [frameSize, setFrameSize] = useState("1080p");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const fetchPreview = useCallback(async (filmTitle: string) => {
    if (!filmTitle || filmTitle.length < 3) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    
    setIsLoadingPreview(true);
    setPreviewError(null);
    
    try {
      const response = await fetch("/api/preview-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: filmTitle })
      });

      if (!response.ok) {
        throw new Error("Failed to generate preview");
      }

      const previewData = await response.json();
      setPreview(previewData);
    } catch (error) {
      console.error("Error generating preview:", error);
      setPreviewError("Failed to generate preview. Please try again.");
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (title.length >= 3) {
        fetchPreview(title);
      }
    }, 800);

    return () => clearTimeout(debounceTimer);
  }, [title, fetchPreview]);

  const handleGenerate = async () => {
    if (!title) return;
    setIsGenerating(true);
    
    try {
      const filmResponse = await fetch("/api/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          status: "generating",
          generationStage: "generating_chapters",
          narratorVoice,
          storyLength,
          chapterCount,
          wordsPerChapter,
          videoModel,
          frameSize
        })
      });

      if (!filmResponse.ok) {
        throw new Error("Failed to create film");
      }

      const film = await filmResponse.json();

      toast({
        title: "Film Creation Started!",
        description: "Generating your cinematic masterpiece..."
      });

      setLocation(`/progress/${film.id}`);
    } catch (error) {
      console.error("Error creating film:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create film"
      });
      setIsGenerating(false);
    }
  };

  const getChapterCountForLength = (length: string): number => {
    switch (length) {
      case "short": return 5;
      case "medium": return 8;
      case "long": return 18;
      default: return chapterCount;
    }
  };

  const handleStoryLengthChange = (value: string) => {
    setStoryLength(value);
    if (value !== "custom") {
      setChapterCount(getChapterCountForLength(value));
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4 animate-pulse-slow">
            <Zap className="w-3 h-3" /> AI Story Engine v2.0
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white pb-2 text-glow tracking-tight">
            Create Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Film</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Enter a title and configure your cinematic experience
          </p>
        </div>

        <GlassCard variant="neo" className="p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" /> Film Title
              </Label>
              <Input 
                placeholder="e.g. Pregnant Single Mom Bought Her Late Mother's Storage Unit" 
                className="h-14 text-lg px-5 bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-film-title"
              />
              {title.length > 0 && title.length < 3 && (
                <p className="text-xs text-muted-foreground">Enter at least 3 characters to generate preview</p>
              )}
            </div>

            {isLoadingPreview && (
              <div className="flex items-center justify-center py-8 text-primary">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                <span className="text-sm">Generating AI preview...</span>
              </div>
            )}

            {previewError && (
              <div className="text-center py-4 text-red-400 text-sm">
                {previewError}
              </div>
            )}

            {preview && !isLoadingPreview && (
              <div className="border-t border-white/10 pt-6">
                <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> AI-Generated Preview
                </h2>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Genres</Label>
                    <div className="flex flex-wrap gap-2" data-testid="preview-genres">
                      {preview.genres.map((genre, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-medium"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Premise</Label>
                    <p className="text-white/90 leading-relaxed text-sm" data-testid="preview-premise">
                      {preview.premise}
                    </p>
                  </div>
                  
                  <div className="space-y-2 md:col-span-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Opening Hook</Label>
                    <p className="text-secondary/90 italic border-l-2 border-secondary/50 pl-4" data-testid="preview-hook">
                      "{preview.openingHook}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <GlassCard className="p-5">
            <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" /> Narrator Voice
            </h3>
            <Select value={narratorVoice} onValueChange={setNarratorVoice}>
              <SelectTrigger className="w-full bg-black/40 border-white/10" data-testid="select-narrator-voice">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {NARRATOR_VOICES.map((voice) => (
                  <SelectItem key={voice} value={voice}>
                    {NARRATOR_VOICE_LABELS[voice]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-secondary" /> Video Model
            </h3>
            <Select value={videoModel} onValueChange={setVideoModel}>
              <SelectTrigger className="w-full bg-black/40 border-white/10" data-testid="select-video-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{VIDEO_MODEL_LABELS[model].label}</span>
                      <span className="text-xs text-muted-foreground">{VIDEO_MODEL_LABELS[model].quality}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" /> Frame Size
            </h3>
            <Select value={frameSize} onValueChange={setFrameSize}>
              <SelectTrigger className="w-full bg-black/40 border-white/10" data-testid="select-frame-size">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                {FRAME_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{FRAME_SIZE_LABELS[size].label}</span>
                      <span className="text-xs text-muted-foreground">{FRAME_SIZE_LABELS[size].resolution}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Story Length
            </h3>
            <Select value={storyLength} onValueChange={handleStoryLengthChange}>
              <SelectTrigger className="w-full bg-black/40 border-white/10" data-testid="select-story-length">
                <SelectValue placeholder="Select length" />
              </SelectTrigger>
              <SelectContent>
                {STORY_LENGTHS.map((length) => (
                  <SelectItem key={length} value={length}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{STORY_LENGTH_LABELS[length].label}</span>
                      <span className="text-xs text-muted-foreground">{STORY_LENGTH_LABELS[length].range}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-secondary" /> Chapters
              <span className="ml-auto text-xl font-bold text-primary">{chapterCount}</span>
            </h3>
            <div className="space-y-3">
              <Slider
                value={[chapterCount]}
                onValueChange={(value) => {
                  setChapterCount(value[0]);
                  setStoryLength("custom");
                }}
                min={1}
                max={18}
                step={1}
                className="w-full"
                data-testid="slider-chapter-count"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>18</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Words/Chapter
              <span className="ml-auto text-xl font-bold text-secondary">{wordsPerChapter}</span>
            </h3>
            <div className="space-y-3">
              <Slider
                value={[wordsPerChapter]}
                onValueChange={(value) => setWordsPerChapter(value[0])}
                min={100}
                max={1000}
                step={50}
                className="w-full"
                data-testid="slider-words-per-chapter"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>1000</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-4 bg-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="text-muted-foreground">
              <span className="text-white font-bold">{chapterCount}</span> chapters × <span className="text-white font-bold">{wordsPerChapter}</span> words = <span className="text-primary font-bold">{(chapterCount * wordsPerChapter).toLocaleString()}</span> total words
            </div>
            <div className="text-muted-foreground">
              Resolution: <span className="text-secondary font-bold">{FRAME_SIZE_LABELS[frameSize]?.resolution}</span>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-col items-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-background font-bold shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:shadow-[0_0_50px_rgba(0,243,255,0.6)] transition-all tracking-wide"
            onClick={handleGenerate}
            disabled={isGenerating || !title || title.length < 3}
            data-testid="button-generate-film"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-3 h-7 w-7 animate-spin" /> Starting Generation...
              </>
            ) : (
              <>
                <Sparkles className="mr-3 h-7 w-7" /> Generate Film
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center max-w-md">
            This will generate chapters, create video prompts, generate videos for each scene, and merge them into a complete film.
          </p>
        </div>
      </div>
    </div>
  );
}
