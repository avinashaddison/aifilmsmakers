import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit2, Check, Loader2, Plus } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function StoryFramework() {
  const [, params] = useRoute("/framework/:filmId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [framework, setFramework] = useState<any>(null);
  const [film, setFilm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.filmId) return;

      try {
        const [filmRes, frameworkRes] = await Promise.all([
          fetch(`/api/films/${params.filmId}`),
          fetch(`/api/films/${params.filmId}/framework`)
        ]);

        if (filmRes.ok) {
          setFilm(await filmRes.json());
        }

        if (frameworkRes.ok) {
          setFramework(await frameworkRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load story framework"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params?.filmId]);

  const handleGenerateChapters = async () => {
    if (!params?.filmId) return;

    setIsGeneratingChapters(true);
    try {
      const response = await fetch(`/api/films/${params.filmId}/generate-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberOfChapters: 5 })
      });

      if (!response.ok) {
        throw new Error("Failed to generate chapters");
      }

      toast({
        title: "Chapters Generated!",
        description: "Story chapters created successfully"
      });

      setLocation(`/chapters/${params.filmId}`);
    } catch (error) {
      console.error("Error generating chapters:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate chapters"
      });
      setIsGeneratingChapters(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Framework not found</p>
        <Link href="/create">
          <Button>Create New Film</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary font-medium mb-1 uppercase tracking-widest">Phase 1</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Story Framework</h1>
          {film && <p className="text-muted-foreground mt-1">{film.title}</p>}
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-primary hover:bg-primary/90 text-background font-bold"
            onClick={handleGenerateChapters}
            disabled={isGeneratingChapters}
            data-testid="button-generate-chapters"
          >
            {isGeneratingChapters ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                Generate Chapters <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Core Elements */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <h3 className="text-lg font-display font-bold text-white mb-4">Premise</h3>
            <p className="text-lg text-gray-300 leading-relaxed">
              {framework.premise}
            </p>
          </GlassCard>

          <GlassCard className="relative overflow-hidden bg-secondary/5 border-secondary/20">
             <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
            <h3 className="text-lg font-display font-bold text-white mb-2">The Hook</h3>
            <p className="text-2xl font-serif italic text-secondary-foreground/90">
              "{framework.hook}"
            </p>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase">Genre</h3>
              <div className="flex flex-wrap gap-2">
                {framework.genre.split(/[,\s]+/).filter(Boolean).map((g: string, i: number) => (
                   <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-sm">{g}</span>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase">Tone</h3>
              <p className="text-white text-lg">{framework.tone}</p>
            </GlassCard>
          </div>
          
          <GlassCard>
             <h3 className="text-lg font-display font-bold text-white mb-4">Setting</h3>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">LOCATION</span>
                  <span className="text-white">{framework.setting.location}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">TIME</span>
                  <span className="text-white">{framework.setting.time}</span>
                </div>
                <div>
                   <span className="text-xs text-muted-foreground block mb-1">WEATHER</span>
                   <span className="text-white">{framework.setting.weather}</span>
                </div>
                 <div>
                   <span className="text-xs text-muted-foreground block mb-1">ATMOSPHERE</span>
                   <span className="text-white">{framework.setting.atmosphere}</span>
                </div>
             </div>
          </GlassCard>
        </div>

        {/* Right Column - Characters */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-white">Cast & Characters</h2>
          
          {framework.characters.map((char: any, idx: number) => (
            <GlassCard key={idx} className="group hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg text-white">{char.name}</h3>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">{char.role}</span>
                </div>
                <span className="text-sm text-muted-foreground">{char.age}y</span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{char.description}</p>
              <div className="text-xs text-muted-foreground pt-2 border-t border-white/5 flex items-center gap-2">
                <span className="opacity-50">REFERENCE:</span>
                <span className="text-white">{char.actor}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
