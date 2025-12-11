import { useState } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, Film, Mic, Hash, Video, BookOpen, Monitor, Check, Clapperboard, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NARRATOR_VOICES, VIDEO_MODELS, FRAME_SIZES, FILM_MODES, type FilmMode } from "@shared/schema";

const FILM_MODE_INFO: Record<FilmMode, { label: string; description: string; chapters: number; words: number }> = {
  "short_film": { 
    label: "Short Film", 
    description: "A compact 5-chapter narrative with quick pacing. Perfect for testing ideas or creating short content.",
    chapters: 5,
    words: 500
  },
  "hollywood_screenplay": { 
    label: "Hollywood Screenplay", 
    description: "Full 18-chapter cinematic structure following professional screenplay format. Includes Hook, Introduction, Development, Plot Twist, Climax, and Resolution phases.",
    chapters: 18,
    words: 800
  }
};

const NARRATOR_VOICE_LABELS: Record<string, string> = {
  "male-narrator": "Male Narrator",
  "female-narrator": "Female Narrator",
  "dramatic-male": "Dramatic Male",
  "dramatic-female": "Dramatic Female",
  "neutral": "Neutral Voice",
  "documentary": "Documentary Style"
};

const VIDEO_MODEL_LABELS: Record<string, { label: string; quality: string }> = {
  "kling_21": { label: "Kling 2.1", quality: "Free - Fast" },
  "kling_25": { label: "Kling 2.5 Pro", quality: "Premium" },
  "higgsfield_v1": { label: "Higgsfield", quality: "Free" },
  "seedance": { label: "Seedance", quality: "Free - Fast" },
  "ltxv-13b": { label: "LTX-Video 13B", quality: "Free" },
  "veo_3": { label: "Veo 3", quality: "Premium" },
  "veo_31": { label: "Veo 3.1", quality: "Premium" },
  "hailuo_2": { label: "Hailuo 2", quality: "Premium" },
  "sora_2": { label: "Sora 2", quality: "Premium" }
};

const FRAME_SIZE_LABELS: Record<string, { label: string; resolution: string }> = {
  "720p": { label: "HD", resolution: "1280x720" },
  "1080p": { label: "Full HD", resolution: "1920x1080" },
  "4K": { label: "4K Ultra HD", resolution: "3840x2160" }
};

interface Framework {
  genres: string[];
  premise: string;
  hook: string;
}

interface Chapter {
  chapterNumber: number;
  title: string;
  summary: string;
  prompt: string;
}

export default function CreateFilm() {
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState<Framework | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isGeneratingFramework, setIsGeneratingFramework] = useState(false);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [currentGeneratingChapter, setCurrentGeneratingChapter] = useState(0);
  const [isGeneratingFilm, setIsGeneratingFilm] = useState(false);
  
  const [filmMode, setFilmMode] = useState<FilmMode>("short_film");
  const [narratorVoice, setNarratorVoice] = useState("male-narrator");
  const [chapterCount, setChapterCount] = useState(5);
  const [wordsPerChapter, setWordsPerChapter] = useState(500);
  const [videoModel, setVideoModel] = useState("kling_21");
  const [frameSize, setFrameSize] = useState("1080p");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  const toggleChapterExpand = (chapterNumber: number) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterNumber)) {
        newSet.delete(chapterNumber);
      } else {
        newSet.add(chapterNumber);
      }
      return newSet;
    });
  };

  const handleFilmModeChange = (mode: FilmMode) => {
    setFilmMode(mode);
    const modeInfo = FILM_MODE_INFO[mode];
    setChapterCount(modeInfo.chapters);
    setWordsPerChapter(modeInfo.words);
    if (chapters.length > 0) setChapters([]);
  };

  const handleGenerateFramework = async () => {
    if (!title || title.length < 3) return;
    setIsGeneratingFramework(true);
    setChapters([]);
    
    try {
      const response = await fetch("/api/generate-framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, filmMode })
      });

      if (!response.ok) throw new Error("Failed to generate framework");
      
      const data = await response.json();
      setFramework({
        genres: data.genres || [data.genre],
        premise: data.premise,
        hook: data.hook
      });
      
      toast({ title: "Framework Generated!", description: "Configure settings and generate chapters." });
    } catch (error) {
      console.error("Error generating framework:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate framework" });
    } finally {
      setIsGeneratingFramework(false);
    }
  };

  const handleGenerateChapters = async () => {
    if (!title || !framework) return;
    setIsGeneratingChapters(true);
    setChapters([]);
    setCurrentGeneratingChapter(0);
    
    try {
      const response = await fetch("/api/generate-chapters-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          framework,
          filmMode,
          chapterCount,
          wordsPerChapter
        })
      });

      if (!response.ok) throw new Error("Failed to start chapter generation");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No reader available");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'generating') {
                setCurrentGeneratingChapter(data.chapterNumber);
              } else if (data.type === 'chapter') {
                setChapters(prev => [...prev, data.chapter]);
              } else if (data.type === 'complete') {
                toast({ title: "Chapters Generated!", description: `All ${data.totalChapters} chapters are ready.` });
              } else if (data.type === 'error') {
                console.error("Chapter generation error:", data);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating chapters:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate chapters" });
    } finally {
      setIsGeneratingChapters(false);
      setCurrentGeneratingChapter(0);
    }
  };

  const handleGenerateFilm = async () => {
    if (!title || !framework || chapters.length === 0) return;
    setIsGeneratingFilm(true);
    
    try {
      // Step 1: Create the film with idle stage
      const filmResponse = await fetch("/api/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          status: "draft",
          generationStage: "idle",
          filmMode,
          narratorVoice,
          storyLength: "custom",
          chapterCount: chapters.length,
          wordsPerChapter,
          videoModel,
          frameSize
        })
      });

      if (!filmResponse.ok) throw new Error("Failed to create film");
      const film = await filmResponse.json();

      // Step 2: Save the framework to the database
      const frameworkResponse = await fetch(`/api/films/${film.id}/framework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...framework,
          genre: framework.genres?.join(", ") || "Drama"
        })
      });
      
      if (!frameworkResponse.ok) {
        console.error("Failed to save framework, continuing anyway");
      }

      // Step 3: Save each chapter to the database
      for (const chapter of chapters) {
        const chapterResponse = await fetch(`/api/films/${film.id}/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            summary: chapter.summary,
            prompt: chapter.prompt,
            status: "pending"
          })
        });
        
        if (!chapterResponse.ok) {
          console.error(`Failed to save chapter ${chapter.chapterNumber}`);
        }
      }

      // Step 4: Start the generation pipeline
      const startResponse = await fetch(`/api/films/${film.id}/start-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!startResponse.ok) {
        console.error("Failed to start generation");
      }

      toast({ title: "Film Creation Started!", description: "Generating videos for your film..." });
      setLocation(`/progress/${film.id}`);
    } catch (error) {
      console.error("Error creating film:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create film" });
      setIsGeneratingFilm(false);
    }
  };

  const chaptersComplete = chapters.length === chapterCount && !isGeneratingChapters;

  return (
    <div className="py-8 space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Film</h1>
        <p className="text-muted-foreground">Enter a title and generate your story</p>
      </div>

      <GlassCard className="p-6">
        <Label className="text-sm font-medium mb-3 flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-primary" /> Film Mode
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FILM_MODES.map((mode) => {
            const info = FILM_MODE_INFO[mode];
            const isSelected = filmMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleFilmModeChange(mode)}
                disabled={isGeneratingChapters || isGeneratingFramework}
                data-testid={`button-mode-${mode}`}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 bg-background/50'
                } ${isGeneratingChapters || isGeneratingFramework ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {mode === 'short_film' ? (
                    <FileText className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  ) : (
                    <Film className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                  <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {info.label}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {info.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  {info.chapters} chapters · ~{info.words} words each
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" /> Film Title
        </Label>
        <div className="flex gap-3">
          <Input 
            placeholder="e.g. The Wolf Has No Friend" 
            className="flex-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="input-film-title"
          />
          <Button 
            onClick={handleGenerateFramework}
            disabled={isGeneratingFramework || !title || title.length < 3}
            data-testid="button-generate-framework"
          >
            {isGeneratingFramework ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Generate Framework</>
            )}
          </Button>
        </div>
      </GlassCard>

      {framework && (
        <>
          <GlassCard className="p-6">
            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Title</p>
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Genres</p>
                <div className="space-y-1">
                  {framework.genres.map((genre, index) => (
                    <p key={index} className="text-foreground">{genre}</p>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Premise</p>
                <p className="text-foreground leading-relaxed">{framework.premise}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Hook</p>
                <p className="text-foreground leading-relaxed">{framework.hook}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4">Generation Settings</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-primary" /> Narrator Voice
                </Label>
                <Select value={narratorVoice} onValueChange={setNarratorVoice}>
                  <SelectTrigger data-testid="select-narrator-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NARRATOR_VOICES.map((voice) => (
                      <SelectItem key={voice} value={voice}>{NARRATOR_VOICE_LABELS[voice]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-primary" /> Video Model
                </Label>
                <Select value={videoModel} onValueChange={setVideoModel}>
                  <SelectTrigger data-testid="select-video-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {VIDEO_MODEL_LABELS[model].label} - {VIDEO_MODEL_LABELS[model].quality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-primary" /> Frame Size
                </Label>
                <Select value={frameSize} onValueChange={setFrameSize}>
                  <SelectTrigger data-testid="select-frame-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAME_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {FRAME_SIZE_LABELS[size].label} - {FRAME_SIZE_LABELS[size].resolution}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filmMode === "short_film" ? (
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div>
                  <Label className="text-sm flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-primary" /> Chapters: {chapterCount}
                  </Label>
                  <Slider
                    value={[chapterCount]}
                    onValueChange={(value) => {
                      setChapterCount(value[0]);
                      if (chapters.length > 0) setChapters([]);
                    }}
                    min={1}
                    max={18}
                    step={1}
                    disabled={isGeneratingChapters}
                    data-testid="slider-chapter-count"
                  />
                </div>

                <div>
                  <Label className="text-sm flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Words/Chapter: {wordsPerChapter}
                  </Label>
                  <Slider
                    value={[wordsPerChapter]}
                    onValueChange={(value) => {
                      setWordsPerChapter(value[0]);
                      if (chapters.length > 0) setChapters([]);
                    }}
                    min={100}
                    max={1000}
                    step={50}
                    disabled={isGeneratingChapters}
                    data-testid="slider-words-per-chapter"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clapperboard className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Hollywood Screenplay Structure</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  18 chapters following professional screenplay format: Hook → Introduction (3) → Inciting Incident → Development (6) → Plot Twist → Climax Build (3) → Climax → Resolution (2)
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Target: ~15,000-16,000 total words
                </div>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              {chapterCount} chapters × ~{wordsPerChapter} words = ~{(chapterCount * wordsPerChapter).toLocaleString()} total words
            </div>

            {chapters.length === 0 && (
              <div className="mt-6 text-center">
                <Button 
                  size="lg"
                  onClick={handleGenerateChapters}
                  disabled={isGeneratingChapters}
                  className="px-8"
                  data-testid="button-generate-chapters"
                >
                  {isGeneratingChapters ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Chapter {currentGeneratingChapter}...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" /> Generate Chapters</>
                  )}
                </Button>
              </div>
            )}
          </GlassCard>

          {(chapters.length > 0 || isGeneratingChapters) && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Chapters</h2>
                <span className="text-sm text-muted-foreground">
                  {chapters.length} / {chapterCount} generated
                </span>
              </div>
              
              <div className="space-y-4">
                {chapters.map((chapter) => (
                  <div 
                    key={chapter.chapterNumber} 
                    className="border border-border rounded-lg p-4"
                    data-testid={`chapter-card-${chapter.chapterNumber}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">
                          Chapter {chapter.chapterNumber}: {chapter.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {chapter.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isGeneratingChapters && currentGeneratingChapter > 0 && (
                  <div className="border border-border rounded-lg p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-muted-foreground">
                          Generating Chapter {currentGeneratingChapter}...
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Creating narrative content...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {chaptersComplete && (
            <div className="text-center">
              <Button 
                size="lg"
                onClick={handleGenerateFilm}
                disabled={isGeneratingFilm}
                className="px-8"
                data-testid="button-generate-film"
              >
                {isGeneratingFilm ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting Film Generation...</>
                ) : (
                  <><Film className="mr-2 h-5 w-5" /> Generate Film</>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
