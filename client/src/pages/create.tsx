import { useState } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, ArrowRight, Zap } from "lucide-react";

export default function CreateFilm() {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [, setLocation] = useLocation();

  const handleGenerate = () => {
    if (!title) return;
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/framework");
    }, 2000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-full max-w-3xl text-center space-y-10">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4 animate-pulse-slow">
              <Zap className="w-3 h-3" /> AI Story Engine v2.0
           </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white pb-2 text-glow tracking-tight">
            What is your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">story?</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Enter a title and let our neural network craft the cinematic universe.
          </p>
        </div>

        <div className="animate-float">
          <GlassCard variant="neo" className="p-8 md:p-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            
            <div className="flex flex-col md:flex-row gap-4 relative z-10">
              <Input 
                placeholder="e.g. The Last Echo" 
                className="h-16 text-xl px-6 bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <Button 
                size="lg" 
                className="h-16 px-10 text-lg bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_40px_rgba(0,243,255,0.5)] transition-all min-w-[200px] tracking-wide"
                onClick={handleGenerate}
                disabled={isLoading || !title}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-6 w-6" /> Generate
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <span className="font-mono text-xs opacity-50 uppercase tracking-widest pt-1">Suggestions:</span>
          <button onClick={() => setTitle("The Silent Horizon")} className="hover:text-primary transition-colors hover:scale-105 transform duration-200 border-b border-transparent hover:border-primary/50 pb-0.5">"The Silent Horizon"</button>
          <span className="opacity-20">•</span>
          <button onClick={() => setTitle("Cyberpunk 2099")} className="hover:text-secondary transition-colors hover:scale-105 transform duration-200 border-b border-transparent hover:border-secondary/50 pb-0.5">"Cyberpunk 2099"</button>
          <span className="opacity-20">•</span>
          <button onClick={() => setTitle("Midnight in Tokyo")} className="hover:text-primary transition-colors hover:scale-105 transform duration-200 border-b border-transparent hover:border-primary/50 pb-0.5">"Midnight in Tokyo"</button>
        </div>
      </div>
    </div>
  );
}
