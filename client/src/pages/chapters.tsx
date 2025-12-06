import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, FileText, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { mockChapters } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Chapters() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary font-medium mb-1 uppercase tracking-widest">Phase 2</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Chapter Breakdown</h1>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
          </Button>
          <Link href="/generator">
            <Button className="bg-primary hover:bg-primary/90 text-background font-bold">
              Start Video Generation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        {mockChapters.map((chapter, idx) => (
          <GlassCard key={idx} className="group hover:bg-card/40 transition-all relative overflow-hidden">
             {/* Status Indicator Line */}
             <div className={cn(
               "absolute left-0 top-0 bottom-0 w-1",
               chapter.status === "completed" ? "bg-primary" : "bg-white/10"
             )} />

            <div className="flex flex-col md:flex-row md:items-center gap-6 pl-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                   <span className="font-mono text-2xl font-bold text-white/20">0{chapter.id}</span>
                   <h3 className="font-display text-xl font-bold text-white">{chapter.title.split(": ")[1]}</h3>
                   {chapter.status === "completed" && (
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 uppercase tracking-wider border border-green-500/20">Ready</span>
                   )}
                </div>
                <p className="text-gray-400 text-sm md:text-base max-w-3xl">
                  {chapter.summary}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                 <div className="flex flex-col items-end mr-4 hidden md:flex">
                    <span className="text-xs text-muted-foreground">EST. DURATION</span>
                    <span className="text-sm font-mono text-white">{chapter.duration}</span>
                 </div>
                 
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white">
                    <FileText className="w-4 h-4" />
                 </Button>
                 
                 <Link href="/generator">
                    <Button size="sm" className={cn(
                      "font-semibold", 
                      idx === 0 ? "bg-primary text-background hover:bg-primary/90" : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                    )}>
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
