import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Film, BookOpen, Video, Merge, Play, Download, Volume2, Scissors, Clock } from "lucide-react";

interface GenerationProgress {
  filmId: string;
  filmTitle: string;
  filmMode: string;
  generationStage: string;
  status: string;
  overallProgress: number;
  estimatedDuration: string;
  finalVideoUrl?: string;
  finalVideoPath?: string;
  isComplete: boolean;
  scenes: {
    total: number;
    pending: number;
    generatingVideo: number;
    videoComplete: number;
    generatingAudio: number;
    audioComplete: number;
    assembling: number;
    completed: number;
    failed: number;
  };
  chapters: {
    total: number;
    pending: number;
    splittingScenes: number;
    scenesReady: number;
    generatingAudio: number;
    generatingVideos: number;
    assembling: number;
    merging: number;
    completed: number;
    failed: number;
  };
  chapterDetails: Array<{
    id: string;
    chapterNumber: number;
    title: string;
    status: string;
    hasVideo: boolean;
    videoUrl?: string;
    duration?: string;
    totalScenes: number;
    completedScenes: number;
    failedScenes: number;
  }>;
}

const STAGE_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  "idle": { label: "Starting...", icon: <Loader2 className="w-5 h-5 animate-spin" />, description: "Initializing generation pipeline" },
  "generating_chapters": { label: "Writing Story", icon: <BookOpen className="w-5 h-5" />, description: "AI is crafting your screenplay chapters" },
  "splitting_scenes": { label: "Breaking Down Scenes", icon: <Scissors className="w-5 h-5" />, description: "Splitting chapters into visual scenes" },
  "scenes_ready": { label: "Scenes Ready", icon: <Film className="w-5 h-5" />, description: "Scene prompts prepared for generation" },
  "generating_audio": { label: "Recording Narration", icon: <Volume2 className="w-5 h-5" />, description: "Generating voice-over for each scene" },
  "generating_videos": { label: "Creating Visuals", icon: <Video className="w-5 h-5" />, description: "AI is generating video for each scene" },
  "assembling_scenes": { label: "Assembling Scenes", icon: <Merge className="w-5 h-5" />, description: "Combining audio and video for scenes" },
  "assembling_chapters": { label: "Building Chapters", icon: <Merge className="w-5 h-5" />, description: "Merging scenes into complete chapters" },
  "chapters_ready": { label: "Chapters Complete", icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, description: "All chapters ready for final merge" },
  "merging_final": { label: "Creating Film", icon: <Film className="w-5 h-5" />, description: "Merging all chapters into your final movie" },
  "completed": { label: "Film Complete!", icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, description: "Your cinematic masterpiece is ready" },
  "failed": { label: "Generation Failed", icon: <XCircle className="w-5 h-5 text-red-500" />, description: "Something went wrong during generation" }
};

const STAGE_ORDER = [
  "generating_chapters",
  "splitting_scenes",
  "scenes_ready",
  "generating_audio",
  "generating_videos",
  "assembling_scenes",
  "assembling_chapters",
  "chapters_ready",
  "merging_final",
  "completed"
];

export default function ProgressPage() {
  const { filmId } = useParams<{ filmId: string }>();
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);

  const { data: progress, refetch: refetchProgress } = useQuery<GenerationProgress>({
    queryKey: [`/api/films/${filmId}/generation-progress`],
    refetchInterval: 2000,
  });

  useEffect(() => {
    const startGeneration = async () => {
      if (!progress || isStarting) return;
      
      // Auto-start if:
      // 1. Stage is "idle" - film needs to start generation
      // 2. Stage is "generating_chapters" with no chapters - needs to start
      // 3. Skip if already completed or failed
      const shouldStart = 
        progress.generationStage === "idle" ||
        (progress.generationStage === "generating_chapters" && progress.chapters.total === 0);
      
      if (shouldStart && progress.generationStage !== "completed" && progress.generationStage !== "failed") {
        setIsStarting(true);
        try {
          await fetch(`/api/films/${filmId}/start-generation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          refetchProgress();
        } catch (error) {
          console.error("Error starting generation:", error);
        } finally {
          setIsStarting(false);
        }
      }
    };

    startGeneration();
  }, [progress, filmId, isStarting, refetchProgress]);

  const getCurrentStageIndex = () => {
    if (!progress?.generationStage) return 0;
    const index = STAGE_ORDER.indexOf(progress.generationStage);
    return index >= 0 ? index : 0;
  };

  const getChapterProgress = (chapter: GenerationProgress['chapterDetails'][0]) => {
    if (chapter.status === "completed") return 100;
    if (chapter.status === "pending") return 0;
    if (chapter.status === "splitting_scenes") return 10;
    if (chapter.status === "scenes_ready") return 20;
    if (chapter.status === "generating_audio") return 35;
    if (chapter.status === "generating_videos") {
      if (chapter.totalScenes === 0) return 40;
      return 40 + Math.round((chapter.completedScenes / chapter.totalScenes) * 30);
    }
    if (chapter.status === "assembling") return 80;
    if (chapter.status === "merging") return 90;
    return 50;
  };

  const getChapterStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Waiting",
      splitting_scenes: "Splitting",
      scenes_ready: "Ready",
      generating_audio: "Audio",
      generating_videos: "Videos",
      assembling: "Assembling",
      merging: "Merging",
      completed: "Done",
      failed: "Failed"
    };
    return labels[status] || status.replace(/_/g, " ");
  };

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isComplete = progress.isComplete;
  const isFailed = progress.generationStage === "failed";
  const currentStageInfo = STAGE_LABELS[progress.generationStage] || STAGE_LABELS.idle;

  return (
    <div className="min-h-screen py-8 px-4 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white text-glow" data-testid="text-film-title">
            {progress.filmTitle}
          </h1>
          <div className="flex items-center justify-center gap-3 text-xl">
            {currentStageInfo.icon}
            <span className={isComplete ? "text-green-400" : isFailed ? "text-red-400" : "text-primary"} data-testid="text-stage-label">
              {currentStageInfo.label}
            </span>
          </div>
          <p className="text-muted-foreground" data-testid="text-stage-description">{currentStageInfo.description}</p>
        </div>

        <GlassCard variant="neo" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold text-primary" data-testid="text-overall-progress">{progress.overallProgress}%</span>
            </div>
            <Progress value={progress.overallProgress} className="h-3" data-testid="progress-overall" />
            
            {progress.estimatedDuration && progress.estimatedDuration !== "00:00" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="w-4 h-4" />
                <span>Estimated duration: <span className="text-white font-mono" data-testid="text-estimated-duration">{progress.estimatedDuration}</span></span>
              </div>
            )}
            
            <div className="flex justify-between mt-6 overflow-x-auto pb-2">
              {STAGE_ORDER.slice(0, -1).map((stage, index) => {
                const currentIndex = getCurrentStageIndex();
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                const stageInfo = STAGE_LABELS[stage];
                
                return (
                  <div key={stage} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
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
                    <span className={`text-[10px] text-center ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {stageInfo?.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {progress.scenes.total > 0 && (
          <GlassCard className="p-4">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground flex items-center gap-2">
                <Video className="w-4 h-4" /> Scene Progress
              </span>
              <span className="font-mono text-white" data-testid="text-scene-progress">
                {progress.scenes.completed}/{progress.scenes.total}
              </span>
            </div>
            <Progress 
              value={progress.scenes.total > 0 ? (progress.scenes.completed / progress.scenes.total) * 100 : 0} 
              className="h-2"
              data-testid="progress-scenes"
            />
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              {progress.scenes.generatingVideo > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  {progress.scenes.generatingVideo} generating video
                </span>
              )}
              {progress.scenes.generatingAudio > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  {progress.scenes.generatingAudio} generating audio
                </span>
              )}
              {progress.scenes.assembling > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  {progress.scenes.assembling} assembling
                </span>
              )}
              {progress.scenes.failed > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {progress.scenes.failed} failed
                </span>
              )}
            </div>
          </GlassCard>
        )}

        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> 
            Chapters ({progress.chapters.completed}/{progress.chapters.total})
          </h2>
          
          <div className="grid gap-3">
            {progress.chapterDetails.length === 0 ? (
              <GlassCard className="p-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating chapters...</span>
                </div>
              </GlassCard>
            ) : (
              progress.chapterDetails.map((chapter) => (
                <GlassCard key={chapter.id} className="p-4" data-testid={`card-chapter-${chapter.chapterNumber}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      chapter.status === "completed" ? "bg-green-500/20 text-green-400" :
                      chapter.status === "failed" ? "bg-red-500/20 text-red-400" :
                      chapter.status === "pending" ? "bg-white/10 text-muted-foreground" :
                      "bg-primary/20 text-primary"
                    }`}>
                      {chapter.chapterNumber}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-white truncate text-sm">{chapter.title}</h3>
                        <div className="flex items-center gap-2">
                          {chapter.totalScenes > 0 && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {chapter.completedScenes}/{chapter.totalScenes}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            chapter.status === "completed" ? "bg-green-500/20 text-green-400" :
                            chapter.status === "failed" ? "bg-red-500/20 text-red-400" :
                            chapter.status === "pending" ? "bg-white/10 text-muted-foreground" :
                            "bg-primary/20 text-primary"
                          }`}>
                            {getChapterStatusLabel(chapter.status)}
                          </span>
                        </div>
                      </div>
                      <Progress value={getChapterProgress(chapter)} className="h-2" />
                      {chapter.duration && chapter.status === "completed" && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono">{chapter.duration}</span>
                        </div>
                      )}
                    </div>
                    
                    {chapter.status === "completed" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    {chapter.status === "failed" && (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    {chapter.status !== "completed" && chapter.status !== "pending" && chapter.status !== "failed" && (
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
            <p className="text-muted-foreground mb-2">
              All chapters have been generated and merged into your final movie.
            </p>
            {progress.estimatedDuration && (
              <p className="text-white font-mono mb-6" data-testid="text-final-duration">
                Total runtime: {progress.estimatedDuration}
              </p>
            )}
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
            <p className="text-muted-foreground mb-4">
              Something went wrong during the generation process.
            </p>
            {progress.scenes.failed > 0 && (
              <p className="text-red-400 text-sm mb-4">
                {progress.scenes.failed} scene(s) failed to generate
              </p>
            )}
            {progress.chapters.failed > 0 && (
              <p className="text-red-400 text-sm mb-4">
                {progress.chapters.failed} chapter(s) failed to process
              </p>
            )}
            <Button 
              size="lg" 
              variant="destructive"
              onClick={() => setLocation("/create")}
              data-testid="button-try-again"
            >
              Try Again
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
