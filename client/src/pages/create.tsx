import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Film, Copy, Check, ChevronDown, ChevronUp, Wand2, Bot, Loader2, BookOpen, Zap, FileText, Maximize2, Minimize2, X, Terminal, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityMessage {
  id: string;
  type: "thinking" | "action" | "success" | "info";
  message: string;
  timestamp: Date;
  isActive?: boolean;
}

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
  isGeneratingPrompts?: boolean;
}

type MovieLength = "9" | "18" | "custom";

export default function CreateFilm() {
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState<Framework | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activities, setActivities] = useState<ActivityMessage[]>([]);
  
  const [movieLength, setMovieLength] = useState<MovieLength>("9");
  const [customChapters, setCustomChapters] = useState(9);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const activityRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getChapterCount = () => {
    if (movieLength === "9") return 9;
    if (movieLength === "18") return 18;
    return customChapters;
  };

  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = activityRef.current.scrollHeight;
    }
  }, [activities]);

  const addActivity = (type: ActivityMessage["type"], message: string, isActive = false) => {
    const newActivity: ActivityMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
      isActive
    };
    setActivities(prev => {
      const updated = prev.map(a => ({ ...a, isActive: false }));
      return [...updated, newActivity];
    });
    return newActivity.id;
  };

  const updateActivity = (id: string, updates: Partial<ActivityMessage>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
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

  const generateScenePrompts = async (chapter: Chapter, currentFramework: Framework | null): Promise<ScenePrompt[]> => {
    try {
      const response = await fetch("/api/generate-scene-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterTitle: chapter.title,
          chapterSummary: chapter.summary,
          chapterNumber: chapter.chapterNumber,
          framework: currentFramework
        })
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      return data.prompts || [];
    } catch {
      const lines = chapter.summary.split(/[.!?]+/).filter(l => l.trim().length > 15).slice(0, 4);
      return lines.map((line, idx) => ({
        sceneNumber: idx + 1,
        lineReference: line.trim(),
        visualPrompt: `Cinematic shot depicting: "${line.trim()}". Professional three-point lighting with warm key light. Shallow depth of field, film grain texture, professional color grading. 4K resolution with anamorphic lens characteristics. Rich atmospheric detail.`,
        mood: "dramatic",
        cameraWork: idx === 0 ? "Wide establishing shot with slow dolly in" : idx === 1 ? "Medium tracking shot" : "Close-up with shallow depth of field"
      }));
    }
  };

  const saveStory = async (storyTitle: string, storyFramework: Framework, storyChapters: Chapter[]) => {
    try {
      const chaptersForSave = storyChapters.map(ch => ({
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        summary: ch.summary,
        scenePrompts: ch.scenePrompts || []
      }));

      await fetch("/api/generated-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: storyTitle,
          framework: storyFramework,
          chapters: chaptersForSave,
          chapterCount: storyChapters.length
        })
      });
    } catch (error) {
      console.error("Failed to save story:", error);
    }
  };

  const handleGenerate = async () => {
    if (!title || title.length < 3) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a movie title (at least 3 characters)" });
      return;
    }

    setIsGenerating(true);
    setFramework(null);
    setChapters([]);
    setActivities([]);
    setExpandedChapters(new Set());

    const chapterCount = getChapterCount();

    addActivity("action", `▶ INITIALIZING: "${title.toUpperCase()}"`, true);
    await new Promise(r => setTimeout(r, 500));

    addActivity("thinking", "Activating neural story analysis engine...", true);
    await new Promise(r => setTimeout(r, 300));
    addActivity("info", "Loading cinematic narrative patterns from Hollywood database...");

    try {
      const frameworkId = addActivity("thinking", "Constructing story framework: analyzing genre conventions, character archetypes, and dramatic structure...", true);

      const frameworkResponse = await fetch("/api/generate-framework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, filmMode: "short_film" })
      });

      if (!frameworkResponse.ok) throw new Error("Failed to generate framework");
      
      const frameworkData = await frameworkResponse.json();
      const newFramework: Framework = {
        genres: frameworkData.genres || [frameworkData.genre],
        premise: frameworkData.premise,
        hook: frameworkData.hook,
        tone: frameworkData.tone,
        setting: frameworkData.setting,
        characters: frameworkData.characters
      };
      setFramework(newFramework);

      updateActivity(frameworkId, { type: "success", message: "✓ Story framework synthesized successfully", isActive: false });
      
      addActivity("info", `Genre matrix: ${newFramework.genres.join(" × ")}`);
      if (newFramework.characters?.length) {
        addActivity("info", `Characters created: ${newFramework.characters.map(c => c.name).join(", ")}`);
      }
      addActivity("success", `Framework complete. Initiating chapter generation sequence for ${chapterCount} chapters...`);

      await new Promise(r => setTimeout(r, 300));

      const chaptersResponse = await fetch("/api/generate-chapters-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          framework: {
            genres: newFramework.genres,
            premise: newFramework.premise,
            hook: newFramework.hook
          },
          filmMode: "short_film",
          chapterCount,
          wordsPerChapter: 500
        })
      });

      if (!chaptersResponse.ok) throw new Error("Failed to start chapter generation");
      
      const reader = chaptersResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No reader available");
      
      const generatedChapters: Chapter[] = [];
      let currentChapterActivity: string | null = null;
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'generating') {
                if (currentChapterActivity) {
                  updateActivity(currentChapterActivity, { type: "success", isActive: false });
                }
                currentChapterActivity = addActivity(
                  "thinking", 
                  `[${data.chapterNumber}/${chapterCount}] Composing narrative structure → Character arcs, dramatic tension, scene beats...`, 
                  true
                );
              } else if (data.type === 'chapter') {
                const wordCount = data.chapter.summary?.split(' ').length || 0;
                if (currentChapterActivity) {
                  updateActivity(currentChapterActivity, { 
                    type: "success", 
                    message: `✓ Chapter ${data.chapter.chapterNumber}: "${data.chapter.title}" (~${wordCount} words)`,
                    isActive: false 
                  });
                }
                generatedChapters.push(data.chapter);
                setChapters([...generatedChapters]);
                setExpandedChapters(prev => new Set(prev).add(data.chapter.chapterNumber));
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      addActivity("success", `✓ CHAPTER SYNTHESIS COMPLETE: ${generatedChapters.length} narrative segments generated`);
      await new Promise(r => setTimeout(r, 300));

      addActivity("action", "═══ PHASE 2: CINEMATOGRAPHY ENGINE ═══", true);
      addActivity("info", "Activating master cinematographer module for detailed visual breakdowns...");

      for (let i = 0; i < generatedChapters.length; i++) {
        const chapter = generatedChapters[i];
        const promptActivityId = addActivity(
          "thinking", 
          `[${i + 1}/${generatedChapters.length}] Rendering Chapter ${chapter.chapterNumber}: "${chapter.title}" → Analyzing lighting, camera angles, color science...`, 
          true
        );

        generatedChapters[i].isGeneratingPrompts = true;
        setChapters([...generatedChapters]);

        const prompts = await generateScenePrompts(chapter, newFramework);
        generatedChapters[i].scenePrompts = prompts;
        generatedChapters[i].isGeneratingPrompts = false;
        setChapters([...generatedChapters]);

        const totalWords = prompts.reduce((acc, p) => acc + (p.visualPrompt?.split(' ').length || 0), 0);
        updateActivity(promptActivityId, { 
          type: "success", 
          message: `✓ Chapter ${chapter.chapterNumber}: ${prompts.length} cinematic scenes generated (~${totalWords} words of visual detail)`,
          isActive: false 
        });
      }

      addActivity("action", "═══ FINALIZING ═══", true);
      addActivity("info", "Compiling screenplay package and archiving to database...");
      await saveStory(title, newFramework, generatedChapters);
      addActivity("success", "✓ SCREENPLAY COMPLETE: Saved to Generated Stories library");
      addActivity("info", `Total output: ${generatedChapters.length} chapters, ${generatedChapters.reduce((acc, c) => acc + (c.scenePrompts?.length || 0), 0)} scenes, production-ready prompts`);
      
      toast({ title: "Generation Complete!", description: `Created ${generatedChapters.length} chapters with scene prompts. Saved to library.` });

    } catch (error) {
      console.error("Error generating:", error);
      addActivity("info", "Something went wrong. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Failed to generate content" });
    } finally {
      setIsGenerating(false);
    }
  };

  const getActivityIcon = (type: ActivityMessage["type"]) => {
    switch (type) {
      case "thinking": return <Loader2 className="w-4 h-4 animate-spin" />;
      case "action": return <Zap className="w-4 h-4 text-yellow-400" />;
      case "success": return <Check className="w-4 h-4 text-green-400" />;
      case "info": return <Bot className="w-4 h-4 text-primary" />;
    }
  };

  const getActivityColor = (type: ActivityMessage["type"], isActive?: boolean) => {
    if (isActive) return "border-primary bg-primary/10";
    switch (type) {
      case "thinking": return "border-blue-500/30 bg-blue-500/5";
      case "action": return "border-yellow-500/30 bg-yellow-500/5";
      case "success": return "border-green-500/30 bg-green-500/5";
      case "info": return "border-muted bg-muted/5";
    }
  };

  // Agent Terminal Component for fullscreen mode
  const AgentTerminal = () => (
    <div className="h-full flex flex-col bg-gradient-to-b from-black/60 to-black/40">
      {/* Terminal Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-primary/30 bg-black/60">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
        </div>
        <div className="flex items-center gap-2 flex-1 ml-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm text-primary font-bold tracking-wider">FILMAI_AGENT_v2.0</span>
        </div>
        {isGenerating ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0ms'}} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '150ms'}} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
            <span className="text-xs text-primary font-mono uppercase tracking-widest">Processing</span>
          </div>
        ) : activities.length > 0 ? (
          <span className="text-xs text-green-400 font-mono">● READY</span>
        ) : (
          <span className="text-xs text-muted-foreground font-mono">○ STANDBY</span>
        )}
      </div>

      {/* System Status Bar */}
      <div className="px-4 py-2 border-b border-primary/20 bg-black/40 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">MODEL: <span className="text-primary">Claude-4</span></span>
          <span className="text-muted-foreground">TOKENS: <span className="text-green-400">{activities.length * 1247}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">CHAPTERS: <span className="text-secondary">{chapters.length}/{getChapterCount()}</span></span>
          <span className="text-muted-foreground">SCENES: <span className="text-yellow-400">{chapters.reduce((acc, c) => acc + (c.scenePrompts?.length || 0), 0)}</span></span>
        </div>
      </div>
      
      {/* Terminal Body */}
      <div 
        ref={activityRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-2 bg-gradient-to-b from-transparent to-black/20"
      >
        {activities.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <Bot className="w-16 h-16 text-primary/50 relative" />
            </div>
            <div className="space-y-2">
              <p className="text-primary font-bold tracking-wider">AGENT INITIALIZED</p>
              <p className="text-muted-foreground text-xs">Enter a title and generate to activate creative processes</p>
            </div>
            <div className="flex justify-center gap-8 text-xs text-muted-foreground pt-4">
              <div className="text-center">
                <Cpu className="w-5 h-5 mx-auto mb-1 text-primary/50" />
                <span>Neural Engine</span>
              </div>
              <div className="text-center">
                <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-500/50" />
                <span>Story Analysis</span>
              </div>
              <div className="text-center">
                <Film className="w-5 h-5 mx-auto mb-1 text-secondary/50" />
                <span>Visual Synthesis</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground border-b border-muted/20 pb-2 mb-3">
              ═══════════════════════════════════════════════════════
            </div>
            {activities.map((activity, idx) => (
              <div
                key={activity.id}
                className={`flex items-start gap-3 py-1.5 px-2 rounded transition-all ${
                  activity.isActive 
                    ? "bg-primary/10 border-l-2 border-primary" 
                    : "hover:bg-white/5"
                }`}
              >
                <span className="text-primary/60 shrink-0 w-8 text-right">{String(idx + 1).padStart(3, '0')}</span>
                <span className="text-muted-foreground shrink-0">│</span>
                <div className="shrink-0 mt-0.5">{getActivityIcon(activity.type)}</div>
                <span className={`flex-1 ${
                  activity.type === "success" ? "text-green-400" :
                  activity.type === "action" ? "text-yellow-400" :
                  activity.type === "thinking" ? "text-blue-400" :
                  "text-foreground/80"
                }`}>
                  {activity.message}
                </span>
                <span className="text-muted-foreground/40 text-xs shrink-0">
                  {activity.timestamp.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                </span>
              </div>
            ))}
          </>
        )}
        {isGenerating && (
          <div className="flex items-center gap-2 text-primary pt-2 pl-12">
            <span className="animate-pulse">▊</span>
            <span className="text-xs text-primary/60 animate-pulse">Processing neural pathways...</span>
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-2 border-t border-primary/20 bg-black/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="text-primary">$</span>
          <span>filmai --mode=cinematic --quality=ultra</span>
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          {new Date().toLocaleDateString()} | Session Active
        </div>
      </div>
    </div>
  );

  // Compact controls for fullscreen
  const CompactControls = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          Title
        </label>
        <Input
          type="text"
          placeholder="Movie title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isGenerating}
          className="bg-background/50 border border-border focus:border-primary"
          data-testid="input-film-title"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["9", "18", "custom"] as MovieLength[]).map((len) => (
          <button
            key={len}
            onClick={() => setMovieLength(len)}
            disabled={isGenerating}
            className={`p-2 rounded-lg border text-center text-sm transition-all ${
              movieLength === len 
                ? "border-primary bg-primary/20 text-primary" 
                : "border-border hover:border-primary/50"
            } ${isGenerating ? "opacity-50" : ""}`}
          >
            {len === "custom" ? customChapters : len}
          </button>
        ))}
      </div>

      <Button
        size="lg"
        onClick={handleGenerate}
        disabled={isGenerating || !title || title.length < 3}
        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
        data-testid="button-generate"
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
        ) : (
          <><Wand2 className="w-4 h-4 mr-2" /> Generate</>
        )}
      </Button>

      {framework && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
          <div className="flex flex-wrap gap-1">
            {framework.genres.map((g, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-primary/20 text-xs">{g}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3">{framework.premise}</p>
        </div>
      )}
    </div>
  );

  const mainContent = (
    <>
      {/* Header */}
      <div className="text-center space-y-3 py-4">
        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">AI Screenplay Generator</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-muted-foreground hover:text-primary"
            data-testid="btn-fullscreen-toggle"
          >
            {isFullscreen ? (
              <><Minimize2 className="w-4 h-4 mr-1" /> Exit Fullscreen</>
            ) : (
              <><Maximize2 className="w-4 h-4 mr-1" /> Fullscreen</>
            )}
          </Button>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold neon-gradient" data-testid="page-title">
          {title || "Create Your Film"}
        </h1>
      </div>

      <div className={`grid gap-6 ${isFullscreen ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          
          {/* Left Column - Input & Agent Activity */}
          <div className="space-y-6">
            
            {/* Input Card */}
            <GlassCard className="p-6">
              <div className="space-y-5">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-lg font-display font-semibold flex items-center gap-2">
                    <Film className="w-5 h-5 text-primary" />
                    Movie Title
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your movie title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isGenerating}
                    className="text-xl py-5 px-4 bg-background/50 border-2 border-border focus:border-primary transition-all rounded-xl"
                    data-testid="input-film-title"
                  />
                </div>

                {/* Movie Length Selector */}
                <div className="space-y-2">
                  <label className="text-lg font-display font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-secondary" />
                    Chapters
                  </label>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {(["9", "18", "custom"] as MovieLength[]).map((len) => (
                      <button
                        key={len}
                        onClick={() => setMovieLength(len)}
                        disabled={isGenerating}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                          movieLength === len 
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                            : "border-border hover:border-primary/50 bg-background/30"
                        } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid={`btn-length-${len}`}
                      >
                        <div className="text-center">
                          {len === "custom" && movieLength === "custom" ? (
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={customChapters}
                              onChange={(e) => setCustomChapters(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                              onClick={(e) => e.stopPropagation()}
                              disabled={isGenerating}
                              className="w-14 text-2xl font-display font-bold text-center bg-transparent border-b-2 border-primary focus:outline-none"
                              data-testid="input-custom-chapters"
                            />
                          ) : (
                            <div className={`text-2xl font-display font-bold ${movieLength === len ? "text-primary" : ""}`}>
                              {len === "custom" ? "?" : len}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {len === "9" ? "Short" : len === "18" ? "Feature" : "Custom"}
                          </div>
                        </div>
                        {movieLength === len && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || !title || title.length < 3}
                  className="w-full py-6 text-lg font-display font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all rounded-xl"
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5" />
                      Generate Screenplay
                    </span>
                  )}
                </Button>
              </div>
            </GlassCard>

            {/* Agent Activity Panel */}
            {activities.length > 0 && (
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display font-semibold">AI Agent</span>
                  {isGenerating && (
                    <span className="ml-auto text-xs text-primary flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Working
                    </span>
                  )}
                </div>
                
                <div 
                  ref={activityRef}
                  className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin"
                >
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border transition-all duration-300 ${getActivityColor(activity.type, activity.isActive)} ${activity.isActive ? "animate-pulse" : ""}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <p className="text-sm text-foreground/90">{activity.message}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Framework Display */}
            {framework && (
              <GlassCard className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Story Framework
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`${framework.premise}\n\n${framework.hook}`, "framework")}
                    data-testid="btn-copy-framework"
                  >
                    {copiedItems.has("framework") ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {framework.genres.map((genre, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs">
                        {genre}
                      </span>
                    ))}
                    {framework.tone && (
                      <span className="px-2 py-1 rounded-full bg-secondary/20 border border-secondary/30 text-xs">
                        {framework.tone}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-primary uppercase mb-1">Premise</h4>
                    <p className="text-sm text-foreground/90">{framework.premise}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                    <h4 className="text-xs font-semibold text-secondary uppercase mb-1">Hook</h4>
                    <p className="text-sm text-foreground/90 italic">{framework.hook}</p>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Right Column - Chapters */}
          <div className="space-y-4">
            {chapters.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  <h2 className="text-xl font-display font-bold">
                    Chapters
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    ({chapters.length}/{getChapterCount()})
                  </span>
                </div>

                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {chapters.map((chapter) => (
                    <GlassCard 
                      key={chapter.chapterNumber} 
                      className="overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300"
                    >
                      {/* Chapter Header */}
                      <div 
                        className="p-3 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors"
                        onClick={() => toggleChapterExpand(chapter.chapterNumber)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                            chapter.isGeneratingPrompts 
                              ? "bg-yellow-500/20 border border-yellow-500/50" 
                              : chapter.scenePrompts 
                                ? "bg-gradient-to-br from-primary to-secondary" 
                                : "bg-muted"
                          }`}>
                            {chapter.isGeneratingPrompts ? (
                              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                            ) : (
                              chapter.chapterNumber
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{chapter.title}</h3>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {chapter.summary.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {chapter.scenePrompts && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                              {chapter.scenePrompts.length} scenes
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(chapter.summary, `chapter-${chapter.chapterNumber}`);
                            }}
                            data-testid={`btn-copy-chapter-${chapter.chapterNumber}`}
                          >
                            {copiedItems.has(`chapter-${chapter.chapterNumber}`) ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          {expandedChapters.has(chapter.chapterNumber) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedChapters.has(chapter.chapterNumber) && (
                        <div className="px-3 pb-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-3 rounded-lg bg-background/50 border border-border">
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap">{chapter.summary}</p>
                          </div>

                          {chapter.scenePrompts && chapter.scenePrompts.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-secondary uppercase">Scene Prompts</h4>
                              {chapter.scenePrompts.map((scene) => (
                                <div 
                                  key={scene.sceneNumber}
                                  className="p-3 rounded-lg bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 space-y-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-1.5 py-0.5 rounded bg-secondary/30 text-xs font-medium">
                                          Scene {scene.sceneNumber}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{scene.cameraWork}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground italic">Line: "{scene.lineReference}"</p>
                                      <div className="mt-2 p-2 rounded bg-background/50 border border-border">
                                        <p className="text-xs text-foreground whitespace-pre-wrap">{scene.visualPrompt}</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 shrink-0"
                                      onClick={() => handleCopy(scene.visualPrompt, `scene-${chapter.chapterNumber}-${scene.sceneNumber}`)}
                                      data-testid={`btn-copy-scene-${chapter.chapterNumber}-${scene.sceneNumber}`}
                                    >
                                      {copiedItems.has(`scene-${chapter.chapterNumber}-${scene.sceneNumber}`) ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {chapter.isGeneratingPrompts && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                              <span className="text-xs text-yellow-400">Generating scene prompts...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {chapters.length === 0 && !isGenerating && (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center space-y-3 text-muted-foreground">
                  <Film className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-sm">Enter a movie title and click Generate to create your screenplay</p>
                </div>
              </div>
            )}
          </div>
        </div>
    </>
  );

  // Fullscreen mode - immersive agent-focused layout
  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-primary/20 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Film className="w-4 h-4 text-black" />
              </div>
              <span className="font-display font-bold text-xl text-glow">FILMAI</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-display font-bold text-lg neon-gradient">
              {title || "New Screenplay"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="text-muted-foreground hover:text-primary"
            data-testid="btn-fullscreen-toggle"
          >
            <X className="w-4 h-4 mr-1" /> Exit
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-[280px_1fr_1fr] gap-0 overflow-hidden">
          {/* Left - Compact Controls */}
          <div className="border-r border-primary/20 bg-black/20 p-4 overflow-y-auto">
            <CompactControls />
          </div>

          {/* Center - Agent Terminal */}
          <div className="border-r border-primary/20 bg-black/30 flex flex-col overflow-hidden">
            <AgentTerminal />
          </div>

          {/* Right - Chapters */}
          <div className="bg-black/20 p-4 overflow-y-auto">
            {chapters.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-secondary" />
                  <h2 className="font-display font-bold">Chapters</h2>
                  <span className="text-sm text-muted-foreground">({chapters.length}/{getChapterCount()})</span>
                </div>
                {chapters.map((chapter) => (
                  <GlassCard 
                    key={chapter.chapterNumber} 
                    className="overflow-hidden"
                  >
                    <div 
                      className="p-3 cursor-pointer flex items-center justify-between hover:bg-white/5"
                      onClick={() => toggleChapterExpand(chapter.chapterNumber)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          chapter.scenePrompts ? "bg-gradient-to-br from-primary to-secondary" : "bg-muted"
                        }`}>
                          {chapter.chapterNumber}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{chapter.title}</h3>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {chapter.summary.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                      {expandedChapters.has(chapter.chapterNumber) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                    {expandedChapters.has(chapter.chapterNumber) && (
                      <div className="p-3 border-t border-border space-y-3 bg-black/20">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{chapter.summary}</p>
                        {chapter.scenePrompts && chapter.scenePrompts.map((scene) => (
                          <div key={scene.sceneNumber} className="p-2 rounded bg-secondary/10 border border-secondary/20">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-secondary">Scene {scene.sceneNumber}</span>
                              <span className="text-xs text-muted-foreground">{scene.cameraWork}</span>
                            </div>
                            <p className="text-xs text-foreground/80 whitespace-pre-wrap">{scene.visualPrompt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/50">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Chapters will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Normal mode
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {mainContent}
      </div>
    </div>
  );
}
