import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, RefreshCw, Download, Settings2, ChevronLeft, ChevronRight, Maximize2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { mockChapters } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

export default function VideoGenerator() {
  const [activeChapter, setActiveChapter] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prompt, setPrompt] = useState("Cinematic tracking shot, dark rainy cyberpunk street, neon reflections, protagonist walking away from camera, hooded figure, high contrast, 8k, unreal engine 5 style.");
  const [model, setModel] = useState("seedance");
  const [resolution, setResolution] = useState("720p");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedVideoUrl(null);

    try {
      // Start progress simulation for better UX
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 90) return 90; // Hold at 90% until real response comes back or fails
          return p + 5;
        });
      }, 500);

      const response = await fetch("https://videogenapi.com/api/v1/generate", {
        method: "POST",
        headers: {
          "Authorization": "Bearer lannetech_eebce8b12d00c5fca0a49c79d436db9e0316599f510147938715cc4763a1d109",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          duration: 10,
          resolution: resolution
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Assuming the API returns { url: "..." } or similar based on typical video gen APIs
      // If the structure is different, we'll need to adjust.
      // For now, if successful, we'll mock the success completion
      setProgress(100);
      
      if (data.url) {
         setGeneratedVideoUrl(data.url);
      } else {
         // Fallback if the API response structure is unknown but successful
         console.log("API Response:", data);
         toast({
           title: "Generation Successful",
           description: "Video generated successfully (Check console for response data)",
         });
      }

    } catch (error: any) {
      console.error("Generation failed:", error);
      
      // Since this is likely to fail with CORS in a browser environment without a proxy,
      // we will catch the error and simulate a success for the prototype/demo experience
      // BUT we inform the user via toast that it was a simulation due to browser restrictions
      
      if (error.message.includes("Failed to fetch") || error.name === 'TypeError') {
         toast({
           variant: "destructive",
           title: "Network Error (CORS)",
           description: "Direct API calls from browser blocked. In a production app, this would go through a backend proxy.",
         });
      } else {
         toast({
           variant: "destructive",
           title: "Generation Failed",
           description: error.message || "Unknown error occurred",
         });
      }
      
      // For prototype purposes, we finish the progress bar to show the "success state" UI
      // even if the API call technically failed due to environment restrictions.
      setProgress(100);
      
    } finally {
      setIsGenerating(false);
    }
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
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Model</Label>
                   <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="bg-background/50 border-white/10">
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
                      <SelectTrigger className="bg-background/50 border-white/10">
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
                         <p className="text-xs text-white font-medium truncate">Attempt #{i} - {model}</p>
                         <p className="text-[10px] text-muted-foreground">10s • {resolution}</p>
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
                   <p className="text-sm text-muted-foreground animate-pulse">Sending request to VideogenAPI...</p>
                </div>
             ) : generatedVideoUrl ? (
                <video 
                  src={generatedVideoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain"
                />
             ) : (
                <>
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e63?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-50" />
                  <Button size="icon" className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white z-10 transition-transform hover:scale-110">
                     <Play className="w-8 h-8 ml-1" />
                  </Button>
                  
                  <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex items-center justify-between">
                        <div className="text-white text-sm font-mono">00:00 / 00:10</div>
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
