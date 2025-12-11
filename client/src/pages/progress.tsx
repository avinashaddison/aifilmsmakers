import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CyberSpinner, WaveLoader, ProgressRing } from "@/components/ui/loading-effects";
import { Loader2, CheckCircle2, XCircle, Film, BookOpen, Video, Merge, Play, Download, Volume2, Scissors, Clock, Sparkles, Wifi, WifiOff } from "lucide-react";

// Real-time WebSocket event types
interface RealtimeEvent {
  type: string;
  filmId: string;
  timestamp: number;
  message?: string;
  chapterId?: string;
  chapterNumber?: number;
  sceneNumber?: number;
  videoUrl?: string;
  progress?: number;
  completedScenes?: number;
  totalScenes?: number;
  error?: string;
}

// Completed scene video for preview
interface CompletedScene {
  chapterNumber: number;
  sceneNumber: number;
  videoUrl: string;
  timestamp: number;
}

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
  const queryClient = useQueryClient();
  
  // Real-time state
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeMessage, setRealtimeMessage] = useState<string>("");
  const [completedVideos, setCompletedVideos] = useState<CompletedScene[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<{ chapter: number; scene: number; prompt?: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: progress, refetch: refetchProgress } = useQuery<GenerationProgress>({
    queryKey: [`/api/films/${filmId}/generation-progress`],
    refetchInterval: wsConnected ? 5000 : 2000, // Poll less frequently when WebSocket is connected
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!filmId) return;
    
    let isActive = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      if (!isActive) return;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          if (!isActive) {
            ws.close();
            return;
          }
          console.log("WebSocket connected");
          setWsConnected(true);
          ws.send(JSON.stringify({ type: "subscribe", filmId }));
        };
        
        ws.onmessage = (event) => {
          if (!isActive) return;
          
          try {
            const data: RealtimeEvent = JSON.parse(event.data);
            console.log("WebSocket event:", data);
            
            if (data.message) {
              setRealtimeMessage(data.message);
            }
            
            switch (data.type) {
              case "scene_video_started":
                setCurrentlyGenerating({
                  chapter: data.chapterNumber || 0,
                  scene: data.sceneNumber || 0,
                  prompt: (data as any).prompt
                });
                break;
                
              case "scene_video_completed":
                if (data.videoUrl && data.chapterNumber && data.sceneNumber) {
                  setCompletedVideos(prev => [
                    ...prev,
                    {
                      chapterNumber: data.chapterNumber!,
                      sceneNumber: data.sceneNumber!,
                      videoUrl: data.videoUrl!,
                      timestamp: data.timestamp
                    }
                  ]);
                  setCurrentlyGenerating(null);
                }
                queryClient.invalidateQueries({ queryKey: [`/api/films/${filmId}/generation-progress`] });
                break;
                
              case "scene_video_failed":
                setCurrentlyGenerating(null);
                break;
                
              case "chapter_complete":
              case "pipeline_complete":
              case "stage_update":
                queryClient.invalidateQueries({ queryKey: [`/api/films/${filmId}/generation-progress`] });
                break;
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };
        
        ws.onclose = () => {
          if (!isActive) return;
          console.log("WebSocket disconnected");
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          if (!isActive) return;
          console.error("WebSocket error:", error);
          setWsConnected(false);
        };
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to connect WebSocket:", error);
        setWsConnected(false);
      }
    };
    
    connectWebSocket();
    
    return () => {
      isActive = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [filmId, queryClient]);

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
        <div className="text-center space-y-6">
          <CyberSpinner size="lg" />
          <p className="text-muted-foreground animate-pulse">Loading progress...</p>
        </div>
      </div>
    );
  }

  const isComplete = progress.isComplete;
  const isFailed = progress.generationStage === "failed";
  const currentStageInfo = STAGE_LABELS[progress.generationStage] || STAGE_LABELS.idle;

  return (
    <div className="min-h-screen py-8 px-4 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-8 stagger-children">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-display">AI Generation in Progress</span>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            {wsConnected ? (
              <span className="flex items-center gap-1 text-xs text-green-400 ml-2">
                <Wifi className="w-3 h-3" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <WifiOff className="w-3 h-3" />
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white text-glow neon-gradient" data-testid="text-film-title">
            {progress.filmTitle}
          </h1>
          <div className="flex items-center justify-center gap-3 text-xl">
            <div className={!isComplete && !isFailed ? "animate-pulse" : ""}>
              {currentStageInfo.icon}
            </div>
            <span className={isComplete ? "text-green-400 text-glow" : isFailed ? "text-red-400" : "text-primary text-glow"} data-testid="text-stage-label">
              {currentStageInfo.label}
            </span>
          </div>
          <p className="text-muted-foreground" data-testid="text-stage-description">{currentStageInfo.description}</p>
          
          {realtimeMessage && !isComplete && (
            <div className="mt-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg inline-flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary" data-testid="text-realtime-message">{realtimeMessage}</span>
            </div>
          )}
        </div>

        {/* Real-time Video Preview Section */}
        {(currentlyGenerating || completedVideos.length > 0) && !isComplete && (
          <GlassCard variant="neo" className="p-5">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Real-Time Preview
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">LIVE</span>
            </h3>
            
            {/* Currently Generating */}
            {currentlyGenerating && (
              <div className="mb-4 p-4 rounded-lg bg-black/30 border border-primary/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center pulse-glow">
                    <Loader2 className="w-4 h-4 animate-spin text-background" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Generating Chapter {currentlyGenerating.chapter}, Scene {currentlyGenerating.scene}
                    </p>
                    <p className="text-xs text-muted-foreground">AI is creating this video...</p>
                  </div>
                </div>
                {currentlyGenerating.prompt && (
                  <p className="text-xs text-muted-foreground bg-black/30 p-2 rounded italic">
                    "{currentlyGenerating.prompt.substring(0, 150)}..."
                  </p>
                )}
                <WaveLoader className="mt-3" />
              </div>
            )}
            
            {/* Completed Videos Preview */}
            {completedVideos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {completedVideos.slice(-6).map((video, index) => (
                  <div 
                    key={`${video.chapterNumber}-${video.sceneNumber}-${video.timestamp}`}
                    className="relative rounded-lg overflow-hidden border border-white/10 bg-black/50 group"
                    data-testid={`video-preview-${video.chapterNumber}-${video.sceneNumber}`}
                  >
                    <video 
                      src={video.videoUrl}
                      className="w-full aspect-video object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs text-white font-medium">
                        Ch.{video.chapterNumber} • Scene {video.sceneNumber}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Done
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {completedVideos.length > 6 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{completedVideos.length - 6} more videos generated
              </p>
            )}
          </GlassCard>
        )}

        <GlassCard variant="glow" className="p-6 relative overflow-hidden">
          <div className="absolute inset-0 holographic opacity-30 pointer-events-none" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Overall Progress</span>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-2xl text-glow text-primary" data-testid="text-overall-progress">{progress.overallProgress}%</span>
                <ProgressRing progress={progress.overallProgress} size={40} strokeWidth={3} />
              </div>
            </div>
            <div className="relative">
              <Progress value={progress.overallProgress} className="h-4" data-testid="progress-overall" />
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <div 
                  className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
            </div>
            
            {progress.estimatedDuration && progress.estimatedDuration !== "00:00" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="w-4 h-4" />
                <span>Estimated duration: <span className="text-white font-mono" data-testid="text-estimated-duration">{progress.estimatedDuration}</span></span>
              </div>
            )}
            
            <div className="flex justify-between mt-6 overflow-x-auto pb-2 px-2">
              {STAGE_ORDER.slice(0, -1).map((stage, index) => {
                const currentIndex = getCurrentStageIndex();
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                const stageInfo = STAGE_LABELS[stage];
                
                return (
                  <div key={stage} className="flex flex-col items-center gap-2 min-w-[70px] relative">
                    {index > 0 && (
                      <div className={`absolute top-4 -left-1/2 w-full h-0.5 ${
                        index <= currentIndex ? "bg-gradient-to-r from-primary to-secondary" : "bg-white/10"
                      }`} />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative z-10 ${
                      isCompleted 
                        ? "bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30" 
                        : isActive 
                          ? "bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/50 pulse-glow" 
                          : "bg-white/10 border border-white/10"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin text-background" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-[10px] text-center font-medium ${
                      isCompleted ? "text-green-400" : isActive ? "text-primary text-glow" : "text-muted-foreground"
                    }`}>
                      {stageInfo?.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {progress.scenes.total > 0 && (
          <GlassCard variant="neo" className="p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20">
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Scene Progress</p>
                  <p className="text-xs text-muted-foreground">Video clips being generated</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-xl text-white" data-testid="text-scene-progress">
                  {progress.scenes.completed}<span className="text-muted-foreground text-sm">/{progress.scenes.total}</span>
                </span>
              </div>
            </div>
            <Progress 
              value={progress.scenes.total > 0 ? (progress.scenes.completed / progress.scenes.total) * 100 : 0} 
              className="h-2"
              data-testid="progress-scenes"
            />
            <div className="flex flex-wrap gap-3 mt-4">
              {progress.scenes.generatingVideo > 0 && (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  {progress.scenes.generatingVideo} generating video
                </span>
              )}
              {progress.scenes.generatingAudio > 0 && (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  {progress.scenes.generatingAudio} generating audio
                </span>
              )}
              {progress.scenes.assembling > 0 && (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  {progress.scenes.assembling} assembling
                </span>
              )}
              {progress.scenes.failed > 0 && (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400">
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
          <GlassCard variant="glow" className="p-8 text-center relative overflow-hidden success-burst">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-transparent to-green-500/10 animate-pulse" />
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/50">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-display text-3xl font-bold text-white mb-2 text-glow">
                Your Film is Ready!
              </h2>
              <p className="text-muted-foreground mb-2">
                All chapters have been generated and merged into your final movie.
              </p>
              {progress.estimatedDuration && (
                <p className="text-white font-display text-xl mb-6" data-testid="text-final-duration">
                  Total runtime: <span className="text-primary text-glow">{progress.estimatedDuration}</span>
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-background font-bold shadow-lg shadow-primary/30 cyber-button"
                  onClick={() => setLocation(`/download/${filmId}`)}
                  data-testid="button-view-film"
                >
                  <Play className="mr-2 h-5 w-5" /> Watch Film
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white/20 hover:bg-white/5"
                  onClick={() => setLocation(`/download/${filmId}`)}
                  data-testid="button-download-film"
                >
                  <Download className="mr-2 h-5 w-5" /> Download
                </Button>
              </div>
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
