import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Play, GripVertical, Scissors, Trash2, Download, Loader2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Assembly() {
  const [, params] = useRoute("/assembly/:filmId");
  const filmId = params?.filmId ? parseInt(params.filmId) : null;
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!filmId) return;

    const fetchChapters = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/films/${filmId}/chapters`);
        if (!response.ok) throw new Error("Failed to fetch chapters");
        const data = await response.json();
        setChapters(data);
      } catch (error) {
        console.error("Error fetching chapters:", error);
        toast({ variant: "destructive", title: "Failed to load chapters" });
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [filmId, toast]);
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-700">
       <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <p className="text-sm text-primary font-medium mb-1 uppercase tracking-widest">Phase 4</p>
          <h1 className="font-display text-3xl font-bold text-white">Film Assembly</h1>
        </div>
        <Link href="/download">
          <Button className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
             Render & Export <Download className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-black rounded-xl border border-white/10 relative overflow-hidden mb-6 shadow-2xl">
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 hover:scale-110 transition-transform cursor-pointer">
                 <Play className="w-8 h-8 text-white ml-1" />
               </div>
               <p className="text-muted-foreground">Preview Full Sequence</p>
            </div>
         </div>
         
         {/* Timecode Overlay */}
         <div className="absolute top-6 right-6 font-mono text-2xl text-white/80 drop-shadow-lg">
           00:00:00:00
         </div>
      </div>

      {/* Timeline Area */}
      <div className="h-64 shrink-0 bg-card/30 backdrop-blur-xl border-t border-white/10 -mx-6 -mb-6 p-6 flex flex-col gap-4">
         {/* Tools */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Button size="sm" variant="ghost" className="text-white hover:bg-white/10"><Scissors className="w-4 h-4 mr-2" /> Split</Button>
               <Button size="sm" variant="ghost" className="text-white hover:bg-white/10"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-xs text-muted-foreground">Zoom</span>
               <div className="w-32 h-1 bg-white/10 rounded-full">
                  <div className="w-1/2 h-full bg-white/30 rounded-full" />
               </div>
            </div>
         </div>

         {/* Tracks */}
         <div className="flex-1 overflow-x-auto custom-scrollbar relative bg-black/20 rounded-lg border border-white/5 p-2">
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 left-[20%] w-0.5 bg-primary z-50 shadow-[0_0_10px_rgba(0,243,255,0.8)]">
               <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-primary rotate-45" />
            </div>

            <div className="flex gap-1 h-full">
               {loading ? (
                 <div className="flex items-center justify-center w-full">
                   <Loader2 className="h-6 w-6 text-primary animate-spin" />
                 </div>
               ) : chapters.length === 0 ? (
                 <div className="flex items-center justify-center w-full">
                   <p className="text-sm text-muted-foreground">No chapters available</p>
                 </div>
               ) : (
                 chapters.map((chapter) => (
                   <div 
                    key={chapter.id} 
                    data-testid={`timeline-chapter-${chapter.id}`}
                    className={cn(
                      "h-full rounded border border-white/10 relative group cursor-move hover:border-primary/50 transition-colors overflow-hidden",
                      "min-w-[180px] bg-card/50" 
                    )}
                   >
                      {/* Thumbnail Strip (Fake) */}
                      <div className="absolute inset-0 flex opacity-30">
                         <div className="flex-1 bg-gray-800" />
                         <div className="flex-1 bg-gray-700" />
                         <div className="flex-1 bg-gray-600" />
                      </div>
                      
                      <div className="absolute inset-0 p-2 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                           <span className="text-[10px] font-bold text-white bg-black/50 px-1 rounded backdrop-blur">CH {chapter.chapterNumber}</span>
                           <GripVertical className="w-3 h-3 text-white/50" />
                         </div>
                         <span className="text-[10px] text-white/70 truncate">{chapter.title}</span>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
