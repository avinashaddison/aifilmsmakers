import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, RefreshCw, Download, Settings2, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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

export default function VideoGenerator() {
  const [, params] = useRoute("/generator/:filmId");
  const [location] = useLocation();
  const filmId = params?.filmId;
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("seedance");
  const [resolution, setResolution] = useState("720p");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (filmId) {
      fetchChapters();
    }
  }, [filmId]);

  useEffect(() => {
    // Get chapter number from URL query if provided
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const chapterParam = urlParams.get('chapter');
    if (chapterParam && chapters.length > 0) {
      const chapterIndex = chapters.findIndex(c => c.chapterNumber === parseInt(chapterParam));
      if (chapterIndex !== -1) {
        setActiveChapter(chapterIndex);
      }
    }
  }, [location, chapters]);

  useEffect(() => {
    if (chapters[activeChapter]) {
      setPrompt(chapters[activeChapter].prompt || "Cinematic tracking shot, dark rainy cyberpunk street, neon reflections, protagonist walking away from camera, hooded figure, high contrast, 8k, unreal engine 5 style.");
      setGeneratedVideoUrl(chapters[activeChapter].videoUrl);
    }
  }, [activeChapter, chapters]);

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

  const handleGenerate = async () => {
    if (!chapters[activeChapter]) return;

    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideoUrl(null);

    try {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 90) return 90;
          return p + 5;
        });
      }, 500);

      const response = await fetch(`/api/chapters/${chapters[activeChapter].id}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          model: model,
          resolution: resolution,
          duration: 10
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setProgress(100);
      
      if (data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        toast({
          title: "Video Generated!",
          description: "Your video has been generated successfully",
        });
        
        // Update chapter in list
        setChapters(prev => prev.map((ch, idx) => 
          idx === activeChapter 
            ? { ...ch, videoUrl: data.videoUrl, status: 'completed' }
            : ch
        ));
      }

    } catch (error: any) {
      console.error("Generation failed:", error);
      setProgress(0);
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Please try again",
      });
      
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-6">
          <div className="cyber-spinner" />
          <div className="text-center">
            <p className="text-primary font-display font-bold mb-1">Loading Chapters</p>
            <p className="text-muted-foreground text-sm animate-pulse">Preparing your screenplay...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No chapters found</p>
          <Link href={`/chapters/${filmId}`}>
            <Button>Go to Chapters</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}
            disabled={activeChapter === 0}
            data-testid="button-previous-chapter"
          >
             <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-widest" data-testid="text-chapter-info">
              Chapter {activeChapter + 1} of {chapters.length}
            </p>
            <h1 className="font-display text-2xl font-bold text-white" data-testid="text-chapter-title">
              {chapters[activeChapter]?.title || 'Loading...'}
            </h1>
          </div>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={() => setActiveChapter(Math.min(chapters.length - 1, activeChapter + 1))}
             disabled={activeChapter === chapters.length - 1}
             data-testid="button-next-chapter"
           >
             <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <Link href={`/assembly/${filmId}`}>
          <Button className="bg-secondary hover:bg-secondary/90 text-white font-bold" data-testid="button-go-to-assembly">
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
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  data-testid="input-video-prompt"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Model</Label>
                   <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-model">
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seedance">Seedance (v1)</SelectItem>
                        <SelectItem value="gen-2">Gen-2</SelectItem>
                        <SelectItem value="zeroscope">Zeroscope</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                 <div className="space-y-2">
                   <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Resolution</Label>
                   <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-resolution">
                        <SelectValue placeholder="Select Res" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">HD (720p)</SelectItem>
                        <SelectItem value="1080p">Full HD (1080p)</SelectItem>
                        <SelectItem value="4k">4K UHD</SelectItem>
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
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-background font-bold h-12 mt-4 shadow-[0_0_20px_rgba(0,243,255,0.4)] cyber-button relative overflow-hidden group"
                onClick={handleGenerate}
                disabled={isGenerating}
                data-testid="button-generate-video"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Generate Video Clip
                    </>
                  )}
                </span>
              </Button>
           </GlassCard>

           <GlassCard className="flex-1">
              <h3 className="text-sm font-bold text-white mb-3">Chapter Summary</h3>
              <p className="text-sm text-gray-400">{chapters[activeChapter]?.summary}</p>
           </GlassCard>
        </div>

        {/* Center/Right Panel: Preview */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
          <div className="flex-1 bg-black/50 rounded-xl border border-white/10 relative overflow-hidden group flex items-center justify-center shadow-2xl" data-testid="video-preview-container">
             {/* Video Player */}
             {isGenerating ? (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="text-center space-y-6 p-8">
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                        <circle cx="50" cy="50" r="45" stroke="url(#gen-gradient)" strokeWidth="6" fill="none" strokeLinecap="round" 
                          strokeDasharray={`${progress * 2.83} 283`} className="transition-all duration-500" />
                        <defs>
                          <linearGradient id="gen-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00f3ff" />
                            <stop offset="100%" stopColor="#bc13fe" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-3xl font-bold text-white text-glow">{progress}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-primary font-display font-bold uppercase tracking-wider text-sm">Generating Video</p>
                      <p className="text-muted-foreground text-sm animate-pulse">AI is creating your cinematic scene...</p>
                    </div>
                    <div className="wave-loader justify-center flex gap-1">
                      <span className="w-1 bg-gradient-to-t from-primary to-secondary rounded animate-pulse" style={{height: '20px', animationDelay: '0s'}} />
                      <span className="w-1 bg-gradient-to-t from-primary to-secondary rounded animate-pulse" style={{height: '25px', animationDelay: '0.1s'}} />
                      <span className="w-1 bg-gradient-to-t from-primary to-secondary rounded animate-pulse" style={{height: '15px', animationDelay: '0.2s'}} />
                      <span className="w-1 bg-gradient-to-t from-primary to-secondary rounded animate-pulse" style={{height: '30px', animationDelay: '0.3s'}} />
                      <span className="w-1 bg-gradient-to-t from-primary to-secondary rounded animate-pulse" style={{height: '18px', animationDelay: '0.4s'}} />
                    </div>
                  </div>
                </div>
             ) : generatedVideoUrl ? (
                <video 
                  src={generatedVideoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain"
                  data-testid="video-player"
                />
             ) : (
                <>
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e63?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
                  <Button size="icon" className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white z-10 transition-transform hover:scale-110" data-testid="button-play-placeholder">
                     <Play className="w-8 h-8 ml-1" />
                  </Button>
                  
                  <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex items-center justify-between">
                        <div className="text-white text-sm font-mono">00:00 / 00:10</div>
                        <div className="flex gap-2">
                           <Button size="icon" variant="ghost" className="text-white hover:bg-white/10"><Maximize2 className="w-4 h-4" /></Button>
                        </div>
                     </div>
                     <div className="w-full h-1 bg-white/20 mt-4 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all">
                        <div className="w-1/3 h-full bg-primary" />
                     </div>
                  </div>
                </>
             )}
          </div>

          {/* Actions */}
          <div className="h-20 shrink-0 grid grid-cols-3 gap-4">
             <Button 
               variant="outline" 
               className="h-full border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-white"
               onClick={handleGenerate}
               disabled={isGenerating}
               data-testid="button-regenerate"
             >
                <RefreshCw className="w-5 h-5" />
                <span className="text-xs">Regenerate</span>
             </Button>
             <Button 
               variant="outline" 
               className="h-full border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-white"
               data-testid="button-adjust-params"
             >
                <Settings2 className="w-5 h-5" />
                <span className="text-xs">Adjust Params</span>
             </Button>
             <Button 
               className="h-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 flex flex-col items-center justify-center gap-2"
               disabled={!generatedVideoUrl}
               data-testid="button-save-clip"
             >
                <Download className="w-5 h-5" />
                <span className="text-xs">Save Clip</span>
             </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
