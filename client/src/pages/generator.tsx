import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, RefreshCw, Download, Settings2, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Link } from "wouter";
import { mockChapters } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function VideoGenerator() {
  const [activeChapter, setActiveChapter] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return p + 1;
      });
    }, 50);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}>
             <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-widest">Chapter {activeChapter + 1} of {mockChapters.length}</p>
            <h1 className="font-display text-2xl font-bold text-white">{mockChapters[activeChapter].title.split(": ")[1]}</h1>
          </div>
           <Button variant="ghost" size="icon" onClick={() => setActiveChapter(Math.min(mockChapters.length - 1, activeChapter + 1))}>
             <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <Link href="/assembly">
          <Button className="bg-secondary hover:bg-secondary/90 text-white font-bold">
            Go to Assembly <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
           <GlassCard className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Prompt</Label>
                <Textarea 
                  className="bg-background/50 border-white/10 focus:border-primary/50 min-h-[120px] text-sm" 
                  defaultValue="Cinematic tracking shot, dark rainy cyberpunk street, neon reflections, protagonist walking away from camera, hooded figure, high contrast, 8k, unreal engine 5 style."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Style</Label>
                   <Select defaultValue="cinematic">
                      <SelectTrigger className="bg-background/50 border-white/10">
                        <SelectValue placeholder="Select Style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">Cinematic Realism</SelectItem>
                        <SelectItem value="anime">Anime Style</SelectItem>
                        <SelectItem value="noir">Film Noir</SelectItem>
                        <SelectItem value="3d">3D Animation</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                 <div className="space-y-2">
                   <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Camera</Label>
                   <Select defaultValue="tracking">
                      <SelectTrigger className="bg-background/50 border-white/10">
                        <SelectValue placeholder="Select Camera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tracking">Tracking Shot</SelectItem>
                        <SelectItem value="drone">Drone View</SelectItem>
                        <SelectItem value="closeup">Extreme Close-up</SelectItem>
                        <SelectItem value="pan">Slow Pan</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                       <span>Motion Scale</span>
                       <span>High</span>
                    </div>
                    <Slider defaultValue={[75]} max={100} step={1} className="cursor-pointer" />
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                       <span>Creativity</span>
                       <span>Precise</span>
                    </div>
                    <Slider defaultValue={[40]} max={100} step={1} className="cursor-pointer" />
                 </div>
              </div>

              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-background font-bold h-12 mt-4 shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                 {isGenerating ? "Generating..." : "Generate Video Clip"}
              </Button>
           </GlassCard>

           <GlassCard className="flex-1">
              <h3 className="text-sm font-bold text-white mb-3">History</h3>
              <div className="space-y-3">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors group">
                      <div className="w-16 h-10 bg-black rounded border border-white/10 relative overflow-hidden">
                        {/* Placeholder image */}
                         <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-xs text-white font-medium truncate">Attempt #{i} - Tracking Shot</p>
                         <p className="text-[10px] text-muted-foreground">4s • 1080p</p>
                      </div>
                   </div>
                 ))}
              </div>
           </GlassCard>
        </div>

        {/* Center/Right Panel: Preview */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
          <div className="flex-1 bg-black/50 rounded-xl border border-white/10 relative overflow-hidden group flex items-center justify-center shadow-2xl">
             {/* Video Player Placeholder */}
             {isGenerating ? (
                <div className="flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
                   <div className="text-primary font-mono text-lg">{progress}%</div>
                   <p className="text-sm text-muted-foreground animate-pulse">Rendering frames...</p>
                </div>
             ) : (
                <>
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e63?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
                  <Button size="icon" className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white z-10 transition-transform hover:scale-110">
                     <Play className="w-8 h-8 ml-1" />
                  </Button>
                  
                  <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex items-center justify-between">
                        <div className="text-white text-sm font-mono">00:00 / 00:04</div>
                        <div className="flex gap-2">
                           <Button size="icon" variant="ghost" className="text-white hover:bg-white/10"><Maximize2 className="w-4 h-4" /></Button>
                        </div>
                     </div>
                     {/* Scrubber */}
                     <div className="w-full h-1 bg-white/20 mt-4 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all">
                        <div className="w-1/3 h-full bg-primary" />
                     </div>
                  </div>
                </>
             )}
          </div>

          {/* Actions */}
          <div className="h-20 shrink-0 grid grid-cols-3 gap-4">
             <Button variant="outline" className="h-full border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-white">
                <RefreshCw className="w-5 h-5" />
                <span className="text-xs">Regenerate</span>
             </Button>
             <Button variant="outline" className="h-full border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-white">
                <Settings2 className="w-5 h-5" />
                <span className="text-xs">Adjust Params</span>
             </Button>
             <Button className="h-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 flex flex-col items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                <span className="text-xs">Save Clip</span>
             </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
