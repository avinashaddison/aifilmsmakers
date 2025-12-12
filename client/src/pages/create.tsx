import { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Film, Copy, Check, ChevronDown, ChevronUp, Wand2, Bot, Loader2, BookOpen, Zap, FileText } from "lucide-react";
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

  const generateScenePrompts = async (chapter: Chapter, chapterIndex: number): Promise<ScenePrompt[]> => {
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

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      return data.prompts || [];
    } catch {
      const lines = chapter.summary.split(/[.!?]+/).filter(l => l.trim().length > 10).slice(0, 3);
      return lines.map((line, idx) => ({
        sceneNumber: idx + 1,
        lineReference: line.trim().substring(0, 100) + "...",
        visualPrompt: `Cinematic shot: ${line.trim()}. Professional lighting, 4K quality, dramatic atmosphere.`,
        mood: "dramatic",
        cameraWork: idx === 0 ? "Wide establishing shot" : idx === 1 ? "Medium tracking shot" : "Close-up"
      }));
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

    addActivity("thinking", `Starting generation for "${title}"...`, true);
    await new Promise(r => setTimeout(r, 500));

    addActivity("action", "Analyzing your title and conceptualizing the story world...", true);

    try {
      const frameworkId = addActivity("thinking", "I'm creating your story framework - genres, premise, and hook...", true);

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

      updateActivity(frameworkId, { type: "success", message: "Story framework created!", isActive: false });
      
      addActivity("info", `Genre: ${newFramework.genres.join(", ")}`);
      addActivity("success", "Framework complete! Now writing your chapters...");

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
                  `Writing Chapter ${data.chapterNumber} of ${chapterCount}...`, 
                  true
                );
              } else if (data.type === 'chapter') {
                if (currentChapterActivity) {
                  updateActivity(currentChapterActivity, { 
                    type: "success", 
                    message: `Chapter ${data.chapter.chapterNumber}: "${data.chapter.title}" complete!`,
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

      addActivity("success", `All ${generatedChapters.length} chapters written!`);
      await new Promise(r => setTimeout(r, 300));

      addActivity("action", "Now generating detailed scene prompts for each chapter...", true);

      for (let i = 0; i < generatedChapters.length; i++) {
        const chapter = generatedChapters[i];
        const promptActivityId = addActivity(
          "thinking", 
          `Creating scene prompts for Chapter ${chapter.chapterNumber}: "${chapter.title}"...`, 
          true
        );

        generatedChapters[i].isGeneratingPrompts = true;
        setChapters([...generatedChapters]);

        const prompts = await generateScenePrompts(chapter, i);
        generatedChapters[i].scenePrompts = prompts;
        generatedChapters[i].isGeneratingPrompts = false;
        setChapters([...generatedChapters]);

        updateActivity(promptActivityId, { 
          type: "success", 
          message: `Chapter ${chapter.chapterNumber} scene prompts ready (${prompts.length} scenes)`,
          isActive: false 
        });
      }

      addActivity("success", "All scene prompts generated! Your screenplay is ready.");
      toast({ title: "Generation Complete!", description: `Created ${generatedChapters.length} chapters with scene prompts.` });

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

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">AI Screenplay Generator</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold neon-gradient" data-testid="page-title">
            Create Your Film
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
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
                                      <p className="text-xs text-muted-foreground italic truncate">"{scene.lineReference}"</p>
                                      <p className="text-xs text-foreground/90">{scene.visualPrompt}</p>
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
      </div>
    </div>
  );
}
