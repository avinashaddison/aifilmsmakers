import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Film, Copy, Check, ChevronDown, ChevronUp, Zap, Play, BookOpen, FileText, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Framework {
  genres: string[];
  premise: string;
  hook: string;
  tone?: string;
  setting?: {
    location: string;
    time: string;
    weather: string;
    atmosphere: string;
  };
  characters?: Array<{
    name: string;
    age: number;
    role: string;
    description: string;
    actor?: string;
  }>;
}

interface ScenePrompt {
  sceneNumber: number;
  lineReference: string;
  visualPrompt: string;
  mood: string;
  cameraWork: string;
}

interface Chapter {
  chapterNumber: number;
  title: string;
  summary: string;
  prompt: string;
  scenePrompts?: ScenePrompt[];
}

type MovieLength = "9" | "18" | "custom";

export default function CreateFilm() {
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState<Framework | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<"idle" | "framework" | "chapters" | "prompts" | "complete">("idle");
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentPromptChapter, setCurrentPromptChapter] = useState(0);
  
  const [movieLength, setMovieLength] = useState<MovieLength>("9");
  const [customChapters, setCustomChapters] = useState(9);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const getChapterCount = () => {
    if (movieLength === "9") return 9;
    if (movieLength === "18") return 18;
    return customChapters;
  };

  const toggleChapterExpand = (chapterNumber: number) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterNumber)) {
        newSet.delete(chapterNumber);
      } else {
        newSet.add(chapterNumber);
      }
      return newSet;
    });
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItems(prev => new Set(prev).add(id));
    setTimeout(() => {
      setCopiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 2000);
  };

  const generateScenePrompts = async (chapter: Chapter): Promise<ScenePrompt[]> => {
    try {
      const response = await fetch("/api/generate-scene-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterTitle: chapter.title,
          chapterSummary: chapter.summary,
          chapterNumber: chapter.chapterNumber
        })
      });

      if (!response.ok) {
        const lines = chapter.summary.split(/[.!?]+/).filter(l => l.trim().length > 10).slice(0, 3);
        return lines.map((line, idx) => ({
          sceneNumber: idx + 1,
          lineReference: line.trim().substring(0, 100) + "...",
          visualPrompt: `Cinematic shot: ${line.trim()}. Professional lighting, 4K quality, dramatic atmosphere.`,
          mood: "dramatic",
          cameraWork: idx === 0 ? "Wide establishing shot" : idx === 1 ? "Medium tracking shot" : "Close-up with shallow depth of field"
        }));
      }

      const data = await response.json();
      return data.prompts || [];
    } catch (error) {
      const lines = chapter.summary.split(/[.!?]+/).filter(l => l.trim().length > 10).slice(0, 3);
      return lines.map((line, idx) => ({
        sceneNumber: idx + 1,
        lineReference: line.trim().substring(0, 100) + "...",
        visualPrompt: `Cinematic shot: ${line.trim()}. Professional lighting, 4K quality, dramatic atmosphere.`,
        mood: "dramatic",
        cameraWork: idx === 0 ? "Wide establishing shot" : idx === 1 ? "Medium tracking shot" : "Close-up with shallow depth of field"
      }));
    }
  };

  const handleGenerate = async () => {
    if (!title || title.length < 3) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a movie title (at least 3 characters)" });
      return;
    }

    setIsGenerating(true);
    setGenerationPhase("framework");
    setFramework(null);
    setChapters([]);
    setExpandedChapters(new Set());

    try {
      const frameworkResponse = await fetch("/api/generate-framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, filmMode: "short_film" })
      });

      if (!frameworkResponse.ok) throw new Error("Failed to generate framework");
      
      const frameworkData = await frameworkResponse.json();
      setFramework({
        genres: frameworkData.genres || [frameworkData.genre],
        premise: frameworkData.premise,
        hook: frameworkData.hook,
        tone: frameworkData.tone,
        setting: frameworkData.setting,
        characters: frameworkData.characters
      });

      setGenerationPhase("chapters");

      const chaptersResponse = await fetch("/api/generate-chapters-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          framework: {
            genres: frameworkData.genres || [frameworkData.genre],
            premise: frameworkData.premise,
            hook: frameworkData.hook
          },
          filmMode: "short_film",
          chapterCount: getChapterCount(),
          wordsPerChapter: 500
        })
      });

      if (!chaptersResponse.ok) throw new Error("Failed to start chapter generation");
      
      const reader = chaptersResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No reader available");
      
      const generatedChapters: Chapter[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'generating') {
                setCurrentChapter(data.chapterNumber);
              } else if (data.type === 'chapter') {
                generatedChapters.push(data.chapter);
                setChapters([...generatedChapters]);
              } else if (data.type === 'complete') {
                // Chapters done
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setGenerationPhase("prompts");
      
      for (let i = 0; i < generatedChapters.length; i++) {
        setCurrentPromptChapter(i + 1);
        const prompts = await generateScenePrompts(generatedChapters[i]);
        generatedChapters[i].scenePrompts = prompts;
        setChapters([...generatedChapters]);
      }

      setGenerationPhase("complete");
      toast({ title: "Generation Complete!", description: `Created ${generatedChapters.length} chapters with scene prompts.` });

    } catch (error) {
      console.error("Error generating:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate content" });
      setGenerationPhase("idle");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartFilm = async () => {
    if (!framework || chapters.length === 0) return;

    try {
      const filmResponse = await fetch("/api/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          status: "draft",
          generationStage: "idle",
          filmMode: "short_film",
          narratorVoice: "male-narrator",
          storyLength: "custom",
          chapterCount: chapters.length,
          wordsPerChapter: 500,
          videoModel: "nanobanana-video",
          frameSize: "1080p"
        })
      });

      if (!filmResponse.ok) throw new Error("Failed to create film");
      const film = await filmResponse.json();

      await fetch(`/api/films/${film.id}/framework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premise: framework.premise,
          hook: framework.hook,
          genres: framework.genres,
          tone: framework.tone || "dramatic",
          themes: ["drama"],
          setting: framework.setting || { location: "Unknown", time: "Present", weather: "Clear", atmosphere: "Dramatic" },
          characters: framework.characters || []
        })
      });

      await Promise.all(chapters.map(chapter => 
        fetch(`/api/films/${film.id}/chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            summary: chapter.summary,
            prompt: chapter.prompt,
            scenePrompts: chapter.scenePrompts?.map(sp => sp.visualPrompt) || [],
            status: "pending"
          })
        })
      ));

      await fetch(`/api/films/${film.id}/start-generation`, { method: "POST" });
      
      setLocation(`/progress/${film.id}`);
    } catch (error) {
      console.error("Error starting film:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to start film generation" });
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Hero Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">AI-Powered Cinema</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold neon-gradient" data-testid="page-title">
            Create Your Film
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enter your movie title and watch AI craft a complete screenplay with cinematic scene prompts
          </p>
        </div>

        {/* Main Input Section */}
        <GlassCard className="p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
          
          <div className="relative space-y-8">
            {/* Title Input */}
            <div className="space-y-4">
              <label className="text-xl font-display font-semibold flex items-center gap-2">
                <Film className="w-6 h-6 text-primary" />
                Movie Title
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your movie title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl py-6 px-6 bg-background/50 border-2 border-border focus:border-primary transition-all duration-300 rounded-xl"
                  data-testid="input-film-title"
                />
                {title && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Movie Length Selector */}
            <div className="space-y-4">
              <label className="text-xl font-display font-semibold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-secondary" />
                Movie Length
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 9 Chapters */}
                <button
                  onClick={() => setMovieLength("9")}
                  className={`group relative p-6 rounded-xl border-2 transition-all duration-300 ${
                    movieLength === "9" 
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                      : "border-border hover:border-primary/50 bg-background/30"
                  }`}
                  data-testid="btn-length-9"
                >
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-display font-bold text-primary">9</div>
                    <div className="text-sm font-medium">Chapters</div>
                    <div className="text-xs text-muted-foreground">Short Film (~45 min)</div>
                  </div>
                  {movieLength === "9" && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  )}
                </button>

                {/* 18 Chapters */}
                <button
                  onClick={() => setMovieLength("18")}
                  className={`group relative p-6 rounded-xl border-2 transition-all duration-300 ${
                    movieLength === "18" 
                      ? "border-secondary bg-secondary/10 shadow-lg shadow-secondary/20" 
                      : "border-border hover:border-secondary/50 bg-background/30"
                  }`}
                  data-testid="btn-length-18"
                >
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-display font-bold text-secondary">18</div>
                    <div className="text-sm font-medium">Chapters</div>
                    <div className="text-xs text-muted-foreground">Feature Film (~90 min)</div>
                  </div>
                  {movieLength === "18" && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                {/* Custom */}
                <button
                  onClick={() => setMovieLength("custom")}
                  className={`group relative p-6 rounded-xl border-2 transition-all duration-300 ${
                    movieLength === "custom" 
                      ? "border-primary bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg" 
                      : "border-border hover:border-primary/50 bg-background/30"
                  }`}
                  data-testid="btn-length-custom"
                >
                  <div className="text-center space-y-2">
                    {movieLength === "custom" ? (
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={customChapters}
                        onChange={(e) => setCustomChapters(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 text-4xl font-display font-bold text-center bg-transparent border-b-2 border-primary focus:outline-none"
                        data-testid="input-custom-chapters"
                      />
                    ) : (
                      <div className="text-4xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">?</div>
                    )}
                    <div className="text-sm font-medium">Custom</div>
                    <div className="text-xs text-muted-foreground">Your choice</div>
                  </div>
                  {movieLength === "custom" && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating || !title || title.length < 3}
                className="px-12 py-6 text-lg font-display font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300 rounded-xl relative overflow-hidden group"
                data-testid="button-generate"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                <span className="relative flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <div className="cyber-spinner w-5 h-5" />
                      {generationPhase === "framework" && "Generating Framework..."}
                      {generationPhase === "chapters" && `Writing Chapter ${currentChapter}...`}
                      {generationPhase === "prompts" && `Creating Scene Prompts ${currentPromptChapter}/${chapters.length}...`}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Generate Movie
                    </>
                  )}
                </span>
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Framework Display */}
        {framework && (
          <GlassCard className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Story Framework
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(`${framework.premise}\n\n${framework.hook}`, "framework")}
                className="gap-2"
              >
                {copiedItems.has("framework") ? (
                  <><Check className="w-4 h-4 text-green-500" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy</>
                )}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Genres */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {framework.genres.map((genre, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tone */}
              {framework.tone && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Tone</h3>
                  <p className="text-foreground">{framework.tone}</p>
                </div>
              )}

              {/* Premise */}
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Premise</h3>
                <p className="text-foreground leading-relaxed">{framework.premise}</p>
              </div>

              {/* Hook */}
              <div className="md:col-span-2 space-y-2 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Hook</h3>
                <p className="text-foreground leading-relaxed italic">{framework.hook}</p>
              </div>

              {/* Characters */}
              {framework.characters && framework.characters.length > 0 && (
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Characters</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {framework.characters.map((char, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border">
                        <div className="font-semibold text-primary">{char.name}</div>
                        <div className="text-xs text-muted-foreground">{char.role} • Age {char.age}</div>
                        {char.actor && <div className="text-xs text-secondary mt-1">Cast: {char.actor}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Chapters Display */}
        {chapters.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-secondary" />
                Chapters
                <span className="text-lg text-muted-foreground">({chapters.length}/{getChapterCount()})</span>
              </h2>
            </div>

            <div className="space-y-4">
              {chapters.map((chapter) => (
                <GlassCard 
                  key={chapter.chapterNumber} 
                  className="overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300"
                  style={{ animationDelay: `${chapter.chapterNumber * 50}ms` }}
                >
                  {/* Chapter Header */}
                  <div 
                    className="p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors"
                    onClick={() => toggleChapterExpand(chapter.chapterNumber)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-display font-bold">
                        {chapter.chapterNumber}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{chapter.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{chapter.summary.substring(0, 100)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {chapter.scenePrompts && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                          {chapter.scenePrompts.length} scenes
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(chapter.summary, `chapter-${chapter.chapterNumber}`);
                        }}
                      >
                        {copiedItems.has(`chapter-${chapter.chapterNumber}`) ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      {expandedChapters.has(chapter.chapterNumber) ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedChapters.has(chapter.chapterNumber) && (
                    <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Full Summary */}
                      <div className="p-4 rounded-lg bg-background/50 border border-border">
                        <h4 className="text-sm font-semibold text-primary mb-2">Full Summary</h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{chapter.summary}</p>
                      </div>

                      {/* Scene Prompts */}
                      {chapter.scenePrompts && chapter.scenePrompts.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider">Scene Prompts</h4>
                          {chapter.scenePrompts.map((scene) => (
                            <div 
                              key={scene.sceneNumber}
                              className="p-4 rounded-lg bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-secondary/30 text-xs font-medium">
                                      Scene {scene.sceneNumber}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{scene.cameraWork}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground italic">"{scene.lineReference}"</p>
                                  <p className="text-sm text-foreground">{scene.visualPrompt}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(scene.visualPrompt, `scene-${chapter.chapterNumber}-${scene.sceneNumber}`)}
                                  className="shrink-0"
                                >
                                  {copiedItems.has(`scene-${chapter.chapterNumber}-${scene.sceneNumber}`) ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Start Film Button */}
        {generationPhase === "complete" && chapters.length > 0 && (
          <div className="flex justify-center py-8 animate-in fade-in zoom-in duration-500">
            <Button
              size="lg"
              onClick={handleStartFilm}
              className="px-16 py-8 text-xl font-display font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all duration-300 rounded-2xl shadow-2xl shadow-green-500/30 relative overflow-hidden group"
              data-testid="button-start-film"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/50 to-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
              <span className="relative flex items-center gap-3">
                <Play className="w-6 h-6" />
                Start Film Generation
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
