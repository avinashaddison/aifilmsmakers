import { useState } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";

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
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-2">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 pb-2">
            What is your story?
          </h1>
          <p className="text-xl text-muted-foreground">
            Enter a title and let our AI craft the cinematic universe.
          </p>
        </div>

        <GlassCard className="p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
          
          <div className="flex flex-col md:flex-row gap-4">
            <Input 
              placeholder="e.g. The Last Echo" 
              className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary/50 focus:ring-primary/20"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all min-w-[200px]"
              onClick={handleGenerate}
              disabled={isLoading || !title}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Generate
                </>
              )}
            </Button>
          </div>
        </GlassCard>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span>Suggestions:</span>
          <button onClick={() => setTitle("The Silent Horizon")} className="hover:text-primary transition-colors">"The Silent Horizon"</button>
          <span className="opacity-20">•</span>
          <button onClick={() => setTitle("Cyberpunk 2099")} className="hover:text-secondary transition-colors">"Cyberpunk 2099"</button>
          <span className="opacity-20">•</span>
          <button onClick={() => setTitle("Midnight in Tokyo")} className="hover:text-primary transition-colors">"Midnight in Tokyo"</button>
        </div>
      </div>
    </div>
  );
}
