import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, FileText, RefreshCw } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: number;
  filmId: number;
  chapterNumber: number;
  title: string;
  summary: string;
  prompt: string;
  status: string;
  videoUrl: string | null;
  duration: number | null;
  metadata: any;
}

export default function Chapters() {
  const [, params] = useRoute("/chapters/:filmId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const filmId = params?.filmId;

  useEffect(() => {
    if (filmId) {
      fetchChapters();
    }
  }, [filmId]);

  const fetchChapters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/films/${filmId}/chapters`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }

      const data = await response.json();
      setChapters(data);
    } catch (error: any) {
      console.error('Error fetching chapters:', error);
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

      await fetchChapters();
    } catch (error: any) {
      console.error('Error regenerating chapters:', error);
      toast({
        variant: "destructive",
        title: "Failed to regenerate chapters",
        description: error.message || "Please try again",
      });
    }
  };

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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Chapter Breakdown</h1>
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

      <div className="grid gap-6">
        {chapters.map((chapter, idx) => (
          <GlassCard 
            key={chapter.id} 
            className="group hover:bg-card/40 transition-all relative overflow-hidden"
            data-testid={`card-chapter-${chapter.id}`}
          >
             {/* Status Indicator Line */}
             <div className={cn(
               "absolute left-0 top-0 bottom-0 w-1",
               chapter.videoUrl ? "bg-primary" : "bg-white/10"
             )} />

            <div className="flex flex-col md:flex-row md:items-center gap-6 pl-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                   <span 
                     className="font-mono text-2xl font-bold text-white/20"
                     data-testid={`text-chapter-number-${chapter.id}`}
                   >
                     {String(chapter.chapterNumber).padStart(2, '0')}
                   </span>
                   <h3 
                     className="font-display text-xl font-bold text-white"
                     data-testid={`text-chapter-title-${chapter.id}`}
                   >
                     {chapter.title}
                   </h3>
                   {chapter.videoUrl && (
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 uppercase tracking-wider border border-green-500/20">Ready</span>
                   )}
                </div>
                <p 
                  className="text-gray-400 text-sm md:text-base max-w-3xl"
                  data-testid={`text-chapter-summary-${chapter.id}`}
                >
                  {chapter.summary}
                </p>
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
                        idx === 0 
                          ? "bg-primary text-background hover:bg-primary/90" 
                          : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                      )}
                      data-testid={`button-generate-video-${chapter.id}`}
                    >
                      {idx === 0 ? <><Play className="w-4 h-4 mr-2" /> Generate Video</> : "Queue"}
                    </Button>
                 </Link>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
