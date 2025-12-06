import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Video, Sparkles, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoResult {
  id: string;
  status: string;
  videoUrl?: string;
  message?: string;
}

export default function TextToVideo() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("10");
  const [resolution, setResolution] = useState("1080p");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const { toast } = useToast();

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
      const response = await fetch('/api/text-to-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration: parseInt(duration),
          resolution,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate video');
      }

      setVideoResult(data);
      toast({
        title: "Video generation started",
        description: data.message || "Your video is being generated",
      });
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Text to <span className="text-primary neon-gradient">Video</span>
        </h1>
        <p className="text-muted-foreground text-lg">Transform your ideas into cinematic videos with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-primary/50"
                data-testid="input-video-prompt"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-white font-medium">Duration (seconds)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger 
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="select-duration"
                  >
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="20">20 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-white font-medium">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger 
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="select-resolution"
                  >
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all"
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
        </GlassCard>

        <GlassCard className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Preview</h2>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[300px] rounded-xl bg-black/30 border border-white/10 overflow-hidden">
            {isGenerating ? (
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
            ) : videoResult ? (
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Video Generation {videoResult.status}</p>
                  <p className="text-muted-foreground text-sm">{videoResult.message}</p>
                  {videoResult.id && (
                    <p className="text-xs text-white/40 mt-2">ID: {videoResult.id}</p>
                  )}
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
