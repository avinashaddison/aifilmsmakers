import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Video, Sparkles, Download, Loader2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoResult {
  id: string;
  externalId?: string;
  status: string;
  videoUrl?: string;
  message?: string;
}

const AVAILABLE_MODELS = [
  { value: "kling_21", label: "Kling 2.1", resolution: "1080p", duration: "5-10s", tier: "free" },
  { value: "kling_25", label: "Kling 2.5 Pro", resolution: "1080p", duration: "5-10s", tier: "premium" },
  { value: "higgsfield_v1", label: "Higgsfield", resolution: "1080p", duration: "5-15s", tier: "free" },
  { value: "seedance", label: "Seedance", resolution: "1080p", duration: "5-10s", tier: "free" },
  { value: "ltxv-13b", label: "LTX-Video 13B", resolution: "480p", duration: "5-30s", tier: "free" },
  { value: "veo_3", label: "Veo 3", resolution: "1080p", duration: "8s", tier: "premium" },
  { value: "veo_31", label: "Veo 3.1", resolution: "1080p", duration: "8s", tier: "premium" },
  { value: "hailuo_2", label: "Hailuo 2", resolution: "1080p", duration: "5-10s", tier: "premium" },
  { value: "sora_2", label: "Sora 2", resolution: "1080p", duration: "10s", tier: "premium" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:3", label: "4:3 (Standard)" },
  { value: "3:4", label: "3:4 (Portrait Standard)" },
];

const RESOLUTIONS = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
  { value: "4K", label: "4K" },
];

export default function TextToVideo() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("10");
  const [resolution, setResolution] = useState("1080p");
  const [model, setModel] = useState("kling_21");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const { toast } = useToast();

  const selectedModel = AVAILABLE_MODELS.find(m => m.value === model);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a description for your video",
      });
      return;
    }

    setIsGenerating(true);
    setVideoResult(null);

    try {
      const requestBody: any = {
        prompt: prompt.trim(),
        duration: parseInt(duration),
        resolution,
        model,
        aspect_ratio: aspectRatio,
      };

      if (imageUrl.trim()) {
        requestBody.image_url = imageUrl.trim();
      }

      const response = await fetch('/api/text-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate video');
      }

      setVideoResult(data);
      toast({
        title: "Video generation started",
        description: data.message || "Your video is being generated",
      });

      // Start polling for status if video is processing
      if (data.status === "processing" && data.id) {
        pollVideoStatus(data.id);
      }
    } catch (error: any) {
      console.error('Error generating video:', error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/check-status`);
        const data = await response.json();

        if (data.status === "completed" && data.videoUrl) {
          setVideoResult(prev => prev ? { ...prev, ...data } : data);
          toast({
            title: "Video ready!",
            description: "Your video has been generated successfully",
          });
          return;
        }

        if (data.status === "failed") {
          setVideoResult(prev => prev ? { ...prev, status: "failed" } : data);
          toast({
            variant: "destructive",
            title: "Generation failed",
            description: "The video generation failed. Please try again.",
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    };

    setTimeout(checkStatus, 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Text to <span className="text-primary neon-gradient">Video</span>
        </h1>
        <p className="text-muted-foreground text-lg">Transform your ideas into cinematic videos with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <GlassCard className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-white">Create Your Video</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-white font-medium">Video Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the video you want to create... (e.g., A beautiful sunset over mountains with golden light)"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary/50"
                  data-testid="input-video-prompt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model" className="text-white font-medium">AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger 
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="select-model"
                  >
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Free Models</div>
                    {AVAILABLE_MODELS.filter(m => m.tier === "free").map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label} ({m.resolution}, {m.duration})
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Premium Models</div>
                    {AVAILABLE_MODELS.filter(m => m.tier === "premium").map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label} ({m.resolution}, {m.duration})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModel && (
                  <p className="text-xs text-muted-foreground">
                    {selectedModel.tier === "premium" ? "⭐ Premium" : "Free"} • {selectedModel.resolution} • {selectedModel.duration}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-white font-medium">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-duration">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 8, 10, 15, 20, 30].map(d => (
                        <SelectItem key={d} value={d.toString()}>{d}s</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution" className="text-white font-medium">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-resolution">
                      <SelectValue placeholder="Resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aspect" className="text-white font-medium">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-aspect">
                      <SelectValue placeholder="Aspect" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Image className="w-4 h-4 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Image to Video (Optional)</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-white/80 text-sm">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                data-testid="input-image-url"
              />
              <p className="text-xs text-muted-foreground">Provide an image URL to generate video from that image</p>
            </div>
          </GlassCard>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all h-12 text-lg"
            data-testid="button-generate-video"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Video
              </>
            )}
          </Button>
        </div>

        <GlassCard className="flex flex-col h-fit sticky top-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Preview</h2>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[350px] rounded-xl bg-black/30 border border-white/10 overflow-hidden">
            {isGenerating || (videoResult?.status === "processing") ? (
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
                <div>
                  <p className="text-white font-medium mb-1">Generating your video...</p>
                  <p className="text-muted-foreground text-sm">This may take a few minutes</p>
                </div>
              </div>
            ) : videoResult?.videoUrl ? (
              <div className="w-full h-full flex flex-col">
                <video 
                  src={videoResult.videoUrl} 
                  controls 
                  className="w-full flex-1 object-contain bg-black"
                  data-testid="video-result"
                />
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <a 
                    href={videoResult.videoUrl} 
                    download 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" data-testid="button-download-video">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </a>
                </div>
              </div>
            ) : videoResult?.status === "failed" ? (
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Video className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Generation Failed</p>
                  <p className="text-muted-foreground text-sm">Please try again with different settings</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Video className="w-8 h-8 text-white/30" />
                </div>
                <div>
                  <p className="text-white/50 font-medium">No video yet</p>
                  <p className="text-muted-foreground text-sm">Enter a prompt and click generate</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
