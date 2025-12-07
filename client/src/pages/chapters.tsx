import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, FileText, RefreshCw, Sparkles, BookOpen } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Artifact {
  name: string;
  description: string;
  significance: string;
}

interface Chapter {
  id: number;
  filmId: number;
  chapterNumber: number;
  chapterType?: string;
  title: string;
  summary: string;
  prompt: string;
  artifact?: Artifact;
  status: string;
  videoUrl: string | null;
  duration: number | null;
  metadata: any;
}

interface Film {
  id: string;
  title: string;
  filmMode: string;
  status: string;
}

interface HollywoodChapterConfig {
  type: string;
  title: string;
  wordCount: number;
  phase: string;
  description: string;
}

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Opening": { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  "Act 1 - World Building": { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  "Act 1 - Inciting Incident": { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  "Act 2 - Rising Action": { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" },
  "Act 2 - Midpoint": { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
  "Act 2 - Major Revelation": { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },
  "Act 3 - Rising to Climax": { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
  "Act 3 - Climax": { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400" },
  "Resolution": { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400" },
};

export default function Chapters() {
  const [, params] = useRoute("/chapters/:filmId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [film, setFilm] = useState<Film | null>(null);
  const [chapterConfig, setChapterConfig] = useState<HollywoodChapterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArtifact, setExpandedArtifact] = useState<number | null>(null);
  const filmId = params?.filmId;

  useEffect(() => {
    if (filmId) {
      fetchData();
    }
  }, [filmId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [chaptersRes, filmRes, configRes] = await Promise.all([
        fetch(`/api/films/${filmId}/chapters`),
        fetch(`/api/films/${filmId}`),
        fetch('/api/hollywood-chapters-config')
      ]);
      
      if (!chaptersRes.ok || !filmRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [chaptersData, filmData, configData] = await Promise.all([
        chaptersRes.json(),
        filmRes.json(),
        configRes.json()
      ]);
      
      setChapters(chaptersData);
      setFilm(filmData);
      setChapterConfig(configData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load chapters",
        description: error.message || "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      const response = await fetch(`/api/films/${filmId}/generate-chapters`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate chapters');
      }

      toast({
        title: "Chapters regenerated",
        description: "Your chapters have been regenerated successfully",
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error regenerating chapters:', error);
      toast({
        variant: "destructive",
        title: "Failed to regenerate chapters",
        description: error.message || "Please try again",
      });
    }
  };

  const getChapterConfig = (chapterType?: string): HollywoodChapterConfig | undefined => {
    if (!chapterType) return undefined;
    return chapterConfig.find(c => c.type === chapterType);
  };

  const isHollywoodMode = film?.filmMode === "hollywood_screenplay";

  const groupedChapters = isHollywoodMode 
    ? chapters.reduce((acc, chapter) => {
        const config = getChapterConfig(chapter.chapterType);
        const phase = config?.phase || "Unknown";
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(chapter);
        return acc;
      }, {} as Record<string, Chapter[]>)
    : { "All Chapters": chapters };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
          <p className="text-muted-foreground">Loading chapters...</p>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No chapters found</p>
          <Button onClick={() => setLocation(`/framework/${filmId}`)}>
            Go back to Framework
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary font-medium mb-1 uppercase tracking-widest">Phase 2</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
            {film?.title || "Chapter Breakdown"}
          </h1>
          {isHollywoodMode && (
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Hollywood Screenplay Mode
              </span>
              <span className="text-muted-foreground text-sm">
                18 Chapters • ~15,000 Words
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
           <Button 
             variant="outline" 
             className="border-white/10 hover:bg-white/5 text-white"
             onClick={handleRegenerate}
             data-testid="button-regenerate-chapters"
           >
            <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
          </Button>
          <Link href={`/generator/${filmId}`}>
            <Button 
              className="bg-primary hover:bg-primary/90 text-background font-bold"
              data-testid="button-start-generation"
            >
              Start Video Generation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {Object.entries(groupedChapters).map(([phase, phaseChapters]) => {
        const phaseColors = PHASE_COLORS[phase] || { bg: "bg-white/5", border: "border-white/10", text: "text-gray-400" };
        
        return (
          <div key={phase} className="space-y-4">
            {isHollywoodMode && (
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg",
                phaseColors.bg,
                "border",
                phaseColors.border
              )}>
                <BookOpen className={cn("w-5 h-5", phaseColors.text)} />
                <h2 className={cn("font-display text-lg font-bold", phaseColors.text)}>
                  {phase}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {phaseChapters.length} chapter{phaseChapters.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            <div className="grid gap-4">
              {phaseChapters.map((chapter, idx) => {
                const config = getChapterConfig(chapter.chapterType);
                
                return (
                  <GlassCard 
                    key={chapter.id} 
                    className="group hover:bg-card/40 transition-all relative overflow-hidden"
                    data-testid={`card-chapter-${chapter.id}`}
                  >
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      chapter.videoUrl ? "bg-primary" : "bg-white/10"
                    )} />

                    <div className="flex flex-col gap-4 pl-4">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span 
                              className="font-mono text-2xl font-bold text-white/20"
                              data-testid={`text-chapter-number-${chapter.id}`}
                            >
                              {String(chapter.chapterNumber).padStart(2, '0')}
                            </span>
                            
                            {config && (
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                phaseColors.bg,
                                phaseColors.border,
                                phaseColors.text
                              )}>
                                {config.title}
                              </span>
                            )}
                            
                            <h3 
                              className="font-display text-xl font-bold text-white"
                              data-testid={`text-chapter-title-${chapter.id}`}
                            >
                              {chapter.title}
                            </h3>
                            
                            {chapter.videoUrl && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 uppercase tracking-wider border border-green-500/20">
                                Ready
                              </span>
                            )}
                          </div>
                          
                          {config && (
                            <p className="text-xs text-muted-foreground mb-2 italic">
                              {config.description} • Target: {config.wordCount} words
                            </p>
                          )}
                          
                          <p 
                            className="text-gray-400 text-sm md:text-base max-w-3xl line-clamp-3"
                            data-testid={`text-chapter-summary-${chapter.id}`}
                          >
                            {chapter.summary}
                          </p>
                          
                          {chapter.artifact && (
                            <div className="mt-3">
                              <button
                                onClick={() => setExpandedArtifact(
                                  expandedArtifact === chapter.id ? null : chapter.id
                                )}
                                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                data-testid={`button-artifact-${chapter.id}`}
                              >
                                <Sparkles className="w-3 h-3" />
                                Artifact: {chapter.artifact.name}
                              </button>
                              
                              {expandedArtifact === chapter.id && (
                                <div className="mt-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                  <p className="text-sm text-gray-300">
                                    <strong className="text-purple-300">Description:</strong> {chapter.artifact.description}
                                  </p>
                                  <p className="text-sm text-gray-300 mt-1">
                                    <strong className="text-purple-300">Significance:</strong> {chapter.artifact.significance}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col items-end mr-4 hidden md:flex">
                            <span className="text-xs text-muted-foreground">EST. DURATION</span>
                            <span className="text-sm font-mono text-white">
                              {chapter.duration ? `${chapter.duration}s` : '10s'}
                            </span>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white"
                            data-testid={`button-view-prompt-${chapter.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          
                          <Link href={`/generator/${filmId}?chapter=${chapter.chapterNumber}`}>
                            <Button 
                              size="sm" 
                              className={cn(
                                "font-semibold", 
                                idx === 0 && phase === Object.keys(groupedChapters)[0]
                                  ? "bg-primary text-background hover:bg-primary/90" 
                                  : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                              )}
                              data-testid={`button-generate-video-${chapter.id}`}
                            >
                              {idx === 0 && phase === Object.keys(groupedChapters)[0] 
                                ? <><Play className="w-4 h-4 mr-2" /> Generate Video</> 
                                : "Queue"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
