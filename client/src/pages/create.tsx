import { useState } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, Film, Mic, Hash, Video, BookOpen, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NARRATOR_VOICES, VIDEO_MODELS, FRAME_SIZES } from "@shared/schema";

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

export default function CreateFilm() {
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState<Framework | null>(null);
  const [isGeneratingFramework, setIsGeneratingFramework] = useState(false);
  const [isGeneratingFilm, setIsGeneratingFilm] = useState(false);
  
  const [narratorVoice, setNarratorVoice] = useState("male-narrator");
  const [chapterCount, setChapterCount] = useState(5);
  const [wordsPerChapter, setWordsPerChapter] = useState(500);
  const [videoModel, setVideoModel] = useState("kling_21");
  const [frameSize, setFrameSize] = useState("1080p");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleGenerateFramework = async () => {
    if (!title || title.length < 3) return;
    setIsGeneratingFramework(true);
    
    try {
      const response = await fetch("/api/generate-framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });

      if (!response.ok) throw new Error("Failed to generate framework");
      
      const data = await response.json();
      setFramework({
        genres: data.genres || [data.genre],
        premise: data.premise,
        hook: data.hook
      });
      
      toast({ title: "Framework Generated!", description: "Review and customize your story settings below." });
    } catch (error) {
      console.error("Error generating framework:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate framework" });
    } finally {
      setIsGeneratingFramework(false);
    }
  };

  const handleGenerateFilm = async () => {
    if (!title || !framework) return;
    setIsGeneratingFilm(true);
    
    try {
      const filmResponse = await fetch("/api/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          status: "generating",
          generationStage: "generating_chapters",
          narratorVoice,
          storyLength: "custom",
          chapterCount,
          wordsPerChapter,
          videoModel,
          frameSize
        })
      });

      if (!filmResponse.ok) throw new Error("Failed to create film");
      const film = await filmResponse.json();

      toast({ title: "Film Creation Started!", description: "Generating your cinematic masterpiece..." });
      setLocation(`/progress/${film.id}`);
    } catch (error) {
      console.error("Error creating film:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create film" });
      setIsGeneratingFilm(false);
    }
  };

  return (
    <div className="py-8 space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Film</h1>
        <p className="text-muted-foreground">Enter a title and generate your story framework</p>
      </div>

      <GlassCard className="p-6">
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" /> Film Title
        </Label>
        <div className="flex gap-3">
          <Input 
            placeholder="e.g. Pregnant Single Mom Bought Her Late Mother's Storage Unit" 
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
            <h2 className="text-xl font-bold mb-4">Video Generation Settings</h2>
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

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div>
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-primary" /> Chapters: {chapterCount}
                </Label>
                <Slider
                  value={[chapterCount]}
                  onValueChange={(value) => setChapterCount(value[0])}
                  min={1}
                  max={18}
                  step={1}
                  data-testid="slider-chapter-count"
                />
              </div>

              <div>
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Words/Chapter: {wordsPerChapter}
                </Label>
                <Slider
                  value={[wordsPerChapter]}
                  onValueChange={(value) => setWordsPerChapter(value[0])}
                  min={100}
                  max={1000}
                  step={50}
                  data-testid="slider-words-per-chapter"
                />
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              {chapterCount} chapters × {wordsPerChapter} words = {(chapterCount * wordsPerChapter).toLocaleString()} total words
            </div>
          </GlassCard>

          <div className="text-center">
            <Button 
              size="lg"
              onClick={handleGenerateFilm}
              disabled={isGeneratingFilm}
              className="px-8"
              data-testid="button-generate-film"
            >
              {isGeneratingFilm ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting Generation...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> Generate Film</>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
