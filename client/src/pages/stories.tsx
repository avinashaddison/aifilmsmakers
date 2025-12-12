import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronUp, Copy, Check, Trash2, Calendar, Film, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScenePrompt {
  sceneNumber: number;
  lineReference: string;
  visualPrompt: string;
  mood: string;
  cameraWork: string;
  characters?: string[];
  setting?: string;
}

interface Chapter {
  chapterNumber: number;
  title: string;
  summary: string;
  scenePrompts: ScenePrompt[];
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
    appearance?: string;
    personality?: string;
  }>;
}

interface GeneratedStory {
  id: string;
  title: string;
  framework: Framework;
  chapters: Chapter[];
  chapterCount: number;
  createdAt: string;
}

export default function StoriesPage() {
  const { toast } = useToast();
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const { data: stories, isLoading, refetch } = useQuery<GeneratedStory[]>({
    queryKey: ["generated-stories"],
    queryFn: async () => {
      const res = await fetch("/api/generated-stories");
      if (!res.ok) throw new Error("Failed to fetch stories");
      return res.json();
    }
  });

  const toggleStory = (id: string) => {
    setExpandedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleChapter = (storyId: string, chapterNum: number) => {
    const key = `${storyId}-${chapterNum}`;
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
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

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/generated-stories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Story deleted" });
      refetch();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete story" });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold neon-gradient" data-testid="page-title">
              Generated Stories
            </h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {stories?.length || 0} stories saved
          </span>
        </div>

        {/* Stories List */}
        {(!stories || stories.length === 0) ? (
          <GlassCard className="p-12 text-center">
            <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-display font-semibold mb-2">No Stories Yet</h3>
            <p className="text-muted-foreground">
              Create your first screenplay from the Create Film page
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <GlassCard key={story.id} className="overflow-hidden">
                {/* Story Header */}
                <div 
                  className="p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors"
                  onClick={() => toggleStory(story.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Film className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold">{story.title}</h2>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{story.chapterCount} chapters</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(story.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(story.id);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      data-testid={`btn-delete-story-${story.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedStories.has(story.id) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Story Content */}
                {expandedStories.has(story.id) && (
                  <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Framework */}
                    <div className="p-4 rounded-xl bg-background/50 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-display font-semibold text-primary">Story Framework</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(
                            `${story.framework.premise}\n\nHook: ${story.framework.hook}`,
                            `framework-${story.id}`
                          )}
                          data-testid={`btn-copy-framework-${story.id}`}
                        >
                          {copiedItems.has(`framework-${story.id}`) ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {story.framework.genres.map((genre, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs">
                              {genre}
                            </span>
                          ))}
                          {story.framework.tone && (
                            <span className="px-2 py-1 rounded-full bg-secondary/20 border border-secondary/30 text-xs">
                              {story.framework.tone}
                            </span>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Premise</h4>
                          <p className="text-sm">{story.framework.premise}</p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
                          <h4 className="text-xs font-semibold text-secondary uppercase mb-1">Hook</h4>
                          <p className="text-sm italic">{story.framework.hook}</p>
                        </div>

                        {/* Characters */}
                        {story.framework.characters && story.framework.characters.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Characters</h4>
                            <div className="grid md:grid-cols-2 gap-2">
                              {story.framework.characters.map((char, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-background/50 border border-border text-sm">
                                  <div className="font-semibold text-primary">{char.name}</div>
                                  <div className="text-xs text-muted-foreground">{char.role} • Age {char.age}</div>
                                  <div className="text-xs mt-1">{char.description}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chapters */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-display font-semibold">Chapters</h3>
                      {story.chapters.map((chapter) => (
                        <div key={chapter.chapterNumber} className="rounded-lg border border-border overflow-hidden">
                          {/* Chapter Header */}
                          <div 
                            className="p-3 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors bg-background/30"
                            onClick={() => toggleChapter(story.id, chapter.chapterNumber)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold">
                                {chapter.chapterNumber}
                              </div>
                              <div>
                                <h4 className="font-semibold">{chapter.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {chapter.scenePrompts?.length || 0} scene prompts
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(chapter.summary, `chapter-${story.id}-${chapter.chapterNumber}`);
                                }}
                                data-testid={`btn-copy-chapter-${story.id}-${chapter.chapterNumber}`}
                              >
                                {copiedItems.has(`chapter-${story.id}-${chapter.chapterNumber}`) ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                              {expandedChapters.has(`${story.id}-${chapter.chapterNumber}`) ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Chapter */}
                          {expandedChapters.has(`${story.id}-${chapter.chapterNumber}`) && (
                            <div className="p-3 space-y-3 bg-background/20 animate-in fade-in duration-200">
                              {/* Full Summary */}
                              <div className="p-3 rounded-lg bg-background/50 border border-border">
                                <h5 className="text-xs font-semibold text-primary uppercase mb-2">Full Summary</h5>
                                <p className="text-sm whitespace-pre-wrap">{chapter.summary}</p>
                              </div>

                              {/* Scene Prompts */}
                              {chapter.scenePrompts && chapter.scenePrompts.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="text-xs font-semibold text-secondary uppercase">Scene Prompts</h5>
                                  {chapter.scenePrompts.map((scene) => (
                                    <div 
                                      key={scene.sceneNumber}
                                      className="p-3 rounded-lg bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded bg-secondary/30 text-xs font-medium">
                                              Scene {scene.sceneNumber}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{scene.cameraWork}</span>
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                              {scene.mood}
                                            </span>
                                          </div>
                                          
                                          {scene.lineReference && (
                                            <p className="text-xs text-muted-foreground italic">
                                              Line: "{scene.lineReference}"
                                            </p>
                                          )}
                                          
                                          {/* FULL Visual Prompt - Not Truncated */}
                                          <div className="p-2 rounded bg-background/50 border border-border">
                                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                              {scene.visualPrompt}
                                            </p>
                                          </div>
                                          
                                          {/* Extra metadata */}
                                          {(scene.characters || scene.setting) && (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                              {scene.characters && scene.characters.length > 0 && (
                                                <span className="text-muted-foreground">
                                                  Characters: {scene.characters.join(", ")}
                                                </span>
                                              )}
                                              {scene.setting && (
                                                <span className="text-muted-foreground">
                                                  Setting: {scene.setting}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 shrink-0"
                                          onClick={() => handleCopy(
                                            scene.visualPrompt, 
                                            `scene-${story.id}-${chapter.chapterNumber}-${scene.sceneNumber}`
                                          )}
                                          data-testid={`btn-copy-scene-${story.id}-${chapter.chapterNumber}-${scene.sceneNumber}`}
                                        >
                                          {copiedItems.has(`scene-${story.id}-${chapter.chapterNumber}-${scene.sceneNumber}`) ? (
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
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
