import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Film, BookOpen, Video, Merge, Play, Download } from "lucide-react";

interface Film {
  id: string;
  title: string;
  status: string;
  generationStage: string;
  chapterCount: number;
  finalVideoUrl?: string;
  finalVideoPath?: string;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
  videoUrl?: string;
  objectPath?: string;
  videoFrames?: Array<{
    frameNumber: number;
    status: string;
    videoUrl?: string;
  }>;
}

const STAGE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  "idle": { label: "Starting...", icon: <Loader2 className="w-5 h-5 animate-spin" /> },
  "generating_chapters": { label: "Generating Chapters", icon: <BookOpen className="w-5 h-5" /> },
  "generating_prompts": { label: "Creating Video Prompts", icon: <Film className="w-5 h-5" /> },
  "generating_videos": { label: "Generating Videos", icon: <Video className="w-5 h-5" /> },
  "merging_chapters": { label: "Merging Chapter Videos", icon: <Merge className="w-5 h-5" /> },
  "merging_final": { label: "Creating Final Movie", icon: <Film className="w-5 h-5" /> },
  "completed": { label: "Completed!", icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
  "failed": { label: "Failed", icon: <XCircle className="w-5 h-5 text-red-500" /> }
};

const STAGE_ORDER = [
  "generating_chapters",
  "generating_prompts", 
  "generating_videos",
  "merging_chapters",
  "merging_final",
  "completed"
];

export default function ProgressPage() {
  const { filmId } = useParams<{ filmId: string }>();
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);

  const { data: film, refetch: refetchFilm } = useQuery<Film>({
    queryKey: [`/api/films/${filmId}`],
    refetchInterval: 2000,
  });

  const { data: chapters = [], refetch: refetchChapters } = useQuery<Chapter[]>({
    queryKey: [`/api/films/${filmId}/chapters`],
    refetchInterval: 2000,
  });

  useEffect(() => {
    const startGeneration = async () => {
      if (!film || isStarting) return;
      
      if (film.generationStage === "generating_chapters" && chapters.length === 0) {
        setIsStarting(true);
        try {
          await fetch(`/api/films/${filmId}/start-generation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          refetchFilm();
          refetchChapters();
        } catch (error) {
          console.error("Error starting generation:", error);
        } finally {
          setIsStarting(false);
        }
      }
    };

    startGeneration();
  }, [film, filmId, chapters.length, isStarting, refetchFilm, refetchChapters]);

  const getCurrentStageIndex = () => {
    if (!film?.generationStage) return 0;
    return STAGE_ORDER.indexOf(film.generationStage);
  };

  const getOverallProgress = () => {
    const stageIndex = getCurrentStageIndex();
    if (stageIndex === -1) return 0;
    return Math.round((stageIndex / (STAGE_ORDER.length - 1)) * 100);
  };

  const getChapterProgress = (chapter: Chapter) => {
    if (chapter.status === "completed") return 100;
    if (chapter.status === "pending") return 0;
    if (chapter.status === "generating_prompts") return 20;
    if (chapter.status === "generating_videos") {
      if (!chapter.videoFrames || chapter.videoFrames.length === 0) return 30;
      const completed = chapter.videoFrames.filter(f => f.status === "completed").length;
      return 30 + Math.round((completed / chapter.videoFrames.length) * 50);
    }
    if (chapter.status === "merging") return 90;
    return 50;
  };

  if (!film) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isComplete = film.generationStage === "completed";
  const isFailed = film.generationStage === "failed";

  return (
    <div className="min-h-screen py-8 px-4 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white text-glow">
            {film.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-xl">
            {STAGE_LABELS[film.generationStage]?.icon}
            <span className={isComplete ? "text-green-400" : isFailed ? "text-red-400" : "text-primary"}>
              {STAGE_LABELS[film.generationStage]?.label || "Processing..."}
            </span>
          </div>
        </div>

        <GlassCard variant="neo" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold text-primary">{getOverallProgress()}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-3" />
            
            <div className="flex justify-between mt-4">
              {STAGE_ORDER.slice(0, -1).map((stage, index) => {
                const currentIndex = getCurrentStageIndex();
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                
                return (
                  <div key={stage} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-green-500" : isActive ? "bg-primary animate-pulse" : "bg-white/10"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin text-background" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {STAGE_LABELS[stage]?.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> 
            Chapters ({chapters.filter(c => c.status === "completed").length}/{film.chapterCount})
          </h2>
          
          <div className="grid gap-3">
            {chapters.length === 0 ? (
              <GlassCard className="p-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating chapters...</span>
                </div>
              </GlassCard>
            ) : (
              chapters.map((chapter) => (
                <GlassCard key={chapter.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      chapter.status === "completed" ? "bg-green-500/20 text-green-400" :
                      chapter.status === "pending" ? "bg-white/10 text-muted-foreground" :
                      "bg-primary/20 text-primary"
                    }`}>
                      {chapter.chapterNumber}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-white truncate">{chapter.title}</h3>
                        <span className="text-xs text-muted-foreground capitalize">
                          {chapter.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <Progress value={getChapterProgress(chapter)} className="h-2" />
                    </div>
                    
                    {chapter.status === "completed" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    {chapter.status !== "completed" && chapter.status !== "pending" && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                    )}
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>

        {isComplete && (
          <GlassCard variant="neo" className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Your Film is Ready!
            </h2>
            <p className="text-muted-foreground mb-6">
              All chapters have been generated and merged into your final movie.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setLocation(`/download/${filmId}`)}
                data-testid="button-view-film"
              >
                <Play className="mr-2 h-5 w-5" /> Watch Film
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setLocation(`/download/${filmId}`)}
                data-testid="button-download-film"
              >
                <Download className="mr-2 h-5 w-5" /> Download
              </Button>
            </div>
          </GlassCard>
        )}

        {isFailed && (
          <GlassCard variant="neo" className="p-8 text-center border-red-500/30">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              Generation Failed
            </h2>
            <p className="text-muted-foreground mb-6">
              Something went wrong during the generation process. Please try again.
            </p>
            <Button 
              size="lg" 
              variant="destructive"
              onClick={() => setLocation("/create")}
            >
              Try Again
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
