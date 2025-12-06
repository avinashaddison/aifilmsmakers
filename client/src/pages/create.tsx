import { useState } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, ArrowRight, Zap, Film, Mic, Clock, Hash, Video, ArrowLeft, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NARRATOR_VOICES, STORY_LENGTHS, VIDEO_MODELS } from "@shared/schema";

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

export default function CreateFilm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<StoryPreview | null>(null);
  
  const [narratorVoice, setNarratorVoice] = useState("male-narrator");
  const [storyLength, setStoryLength] = useState("medium");
  const [chapterCount, setChapterCount] = useState(5);
  const [wordsPerChapter, setWordsPerChapter] = useState(500);
  const [videoModel, setVideoModel] = useState("sora-2");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handlePreview = async () => {
    if (!title) return;
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/preview-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });

      if (!response.ok) {
        throw new Error("Failed to generate preview");
      }

      const previewData = await response.json();
      setPreview(previewData);
      setStep(2);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate preview"
      });
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!title || !preview) return;
    setIsGenerating(true);
    
    try {
      const filmResponse = await fetch("/api/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          status: "draft",
          narratorVoice,
          storyLength,
          chapterCount,
          wordsPerChapter,
          videoModel
        })
      });

      if (!filmResponse.ok) {
        throw new Error("Failed to create film");
      }

      const film = await filmResponse.json();

      const frameworkResponse = await fetch(`/api/films/${film.id}/framework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!frameworkResponse.ok) {
        throw new Error("Failed to generate framework");
      }

      toast({
        title: "Film Created!",
        description: "Story framework generated successfully"
      });

      setLocation(`/framework/${film.id}`);
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

  if (step === 1) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-full max-w-3xl text-center space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4 animate-pulse-slow">
              <Zap className="w-3 h-3" /> AI Story Engine v2.0
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white pb-2 text-glow tracking-tight">
              What is your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">story?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Enter a title and let our neural network craft the cinematic universe.
            </p>
          </div>

          <div className="animate-float">
            <GlassCard variant="neo" className="p-8 md:p-10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
              
              <div className="flex flex-col md:flex-row gap-4 relative z-10">
                <Input 
                  placeholder="e.g. Pregnant Single Mom Bought Her Late Mother's Storage Unit" 
                  className="h-16 text-xl px-6 bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePreview()}
                  data-testid="input-film-title"
                />
                <Button 
                  size="lg" 
                  className="h-16 px-10 text-lg bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_40px_rgba(0,243,255,0.5)] transition-all min-w-[200px] tracking-wide"
                  onClick={handlePreview}
                  disabled={isLoading || !title}
                  data-testid="button-preview-story"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-6 w-6" /> Next
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="font-mono text-xs opacity-50 uppercase tracking-widest pt-1">Suggestions:</span>
            <button onClick={() => setTitle("The Silent Horizon")} className="hover:text-primary transition-colors hover:scale-105 transform duration-200 border-b border-transparent hover:border-primary/50 pb-0.5">"The Silent Horizon"</button>
            <span className="opacity-20">•</span>
            <button onClick={() => setTitle("Cyberpunk 2099")} className="hover:text-secondary transition-colors hover:scale-105 transform duration-200 border-b border-transparent hover:border-secondary/50 pb-0.5">"Cyberpunk 2099"</button>
            <span className="opacity-20">•</span>
            <button onClick={() => setTitle("Midnight in Tokyo")} className="hover:text-primary transition-colors hover:scale-105 transform duration-200 border-b border-transparent hover:border-primary/50 pb-0.5">"Midnight in Tokyo"</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setStep(1)}
            className="text-muted-foreground hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold tracking-widest uppercase">
            <Film className="w-3 h-3" /> Step 2: Configure
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white text-glow">
            {title}
          </h1>
          <p className="text-muted-foreground">Configure your film before generating</p>
        </div>

        {preview && (
          <GlassCard variant="neo" className="p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI-Generated Preview
            </h2>
            
            <div className="grid gap-6 md:grid-cols-3">
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
                <p className="text-white/90 leading-relaxed" data-testid="preview-premise">
                  {preview.premise}
                </p>
              </div>
              
              <div className="space-y-2 md:col-span-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Opening Hook</Label>
                <p className="text-lg text-secondary/90 italic border-l-2 border-secondary/50 pl-4" data-testid="preview-hook">
                  "{preview.openingHook}"
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
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

          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
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

          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
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

          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-secondary" /> Chapters
              <span className="ml-auto text-2xl font-bold text-primary">{chapterCount}</span>
            </h3>
            <div className="space-y-4">
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
                <span>1 chapter</span>
                <span>18 chapters</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 md:col-span-2">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Words Per Chapter
              <span className="ml-auto text-2xl font-bold text-secondary">{wordsPerChapter}</span>
            </h3>
            <div className="space-y-4">
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
                <span>100 words (Brief)</span>
                <span>500 words (Standard)</span>
                <span>1000 words (Detailed)</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Total estimated content: <span className="text-white font-bold">{chapterCount * wordsPerChapter}</span> words across <span className="text-white font-bold">{chapterCount}</span> chapters
          </div>
          
          <Button 
            size="lg" 
            className="h-16 px-12 text-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-background font-bold shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:shadow-[0_0_50px_rgba(0,243,255,0.6)] transition-all tracking-wide"
            onClick={handleGenerate}
            disabled={isGenerating}
            data-testid="button-generate-film"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-3 h-7 w-7 animate-spin" /> Generating Film...
              </>
            ) : (
              <>
                <Sparkles className="mr-3 h-7 w-7" /> Generate Film
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
