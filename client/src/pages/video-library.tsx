import { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Video, Download, Play, Clock, Loader2, Film, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoData {
  id: string;
  prompt: string;
  videoUrl: string | null;
  objectPath: string | null;
  status: string;
  duration: number;
  resolution: string;
  model: string;
  createdAt: string;
}

export default function VideoLibrary() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);
  const { toast } = useToast();
  const pollingIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const checkVideoStatus = useCallback(async (videoId: string, showToast = false) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/check-status`);
      if (!response.ok) {
        throw new Error('Failed to check status');
      }
      
      const data = await response.json();
      
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, status: data.status, videoUrl: data.videoUrl || v.videoUrl, objectPath: data.objectPath || v.objectPath }
          : v
      ));
      
      setSelectedVideo(prev => 
        prev?.id === videoId 
          ? { ...prev, status: data.status, videoUrl: data.videoUrl || prev.videoUrl, objectPath: data.objectPath || prev.objectPath } 
          : prev
      );
      
      if (data.status === "completed") {
        const interval = pollingIntervalsRef.current.get(videoId);
        if (interval) {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(videoId);
        }
        
        if (showToast) {
          toast({
            title: "Video Ready",
            description: "Your video has finished processing and is ready to view!",
          });
        }
      } else if (data.status === "failed") {
        const interval = pollingIntervalsRef.current.get(videoId);
        if (interval) {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(videoId);
        }
        
        if (showToast) {
          toast({
            variant: "destructive",
            title: "Video Failed",
            description: "Video generation failed. Please try again.",
          });
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error checking video status:', error);
      return null;
    }
  }, [toast]);

  const startPollingForVideo = useCallback((videoId: string) => {
    if (pollingIntervalsRef.current.has(videoId)) {
      return;
    }
    
    const interval = setInterval(() => {
      checkVideoStatus(videoId, true);
    }, 5000);
    
    pollingIntervalsRef.current.set(videoId, interval);
  }, [checkVideoStatus]);

  useEffect(() => {
    fetchVideos();
    
    return () => {
      pollingIntervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
      pollingIntervalsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const processingVideos = videos.filter(v => v.status === "processing");
    
    processingVideos.forEach(video => {
      if (!pollingIntervalsRef.current.has(video.id)) {
        startPollingForVideo(video.id);
      }
    });
    
    pollingIntervalsRef.current.forEach((interval, videoId) => {
      const video = videos.find(v => v.id === videoId);
      if (!video || video.status !== "processing") {
        clearInterval(interval);
        pollingIntervalsRef.current.delete(videoId);
      }
    });
  }, [videos, startPollingForVideo]);

  const handleManualStatusCheck = async (videoId: string) => {
    setCheckingStatus(videoId);
    await checkVideoStatus(videoId, true);
    setCheckingStatus(null);
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/videos');
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(data);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast({
        variant: "destructive",
        title: "Failed to load videos",
        description: error.message || "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoSrc = (video: VideoData): string | null => {
    if (video.objectPath) {
      return video.objectPath;
    }
    return video.videoUrl;
  };

  const handleDownload = async (video: VideoData) => {
    try {
      setDownloadingVideo(video.id);
      
      const response = await fetch(`/api/videos/${video.id}/download-url`);
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }
      
      const data = await response.json();
      
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = `video-${video.id}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your video download has started.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download video. Please try again.",
      });
    } finally {
      setDownloadingVideo(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      processing: { label: 'Processing', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' },
      completed: { label: 'Ready', className: 'bg-green-500/20 text-green-400 border-green-500/20' },
      failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400 border-red-500/20' },
    };
    return statusMap[status] || statusMap.processing;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            Video <span className="text-primary neon-gradient">Library</span>
          </h1>
          <p className="text-muted-foreground text-lg">All your generated videos in one place</p>
        </div>
        <Button 
          onClick={fetchVideos}
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          data-testid="button-refresh"
        >
          <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        </div>
      ) : videos.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
            <Film className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-2">No videos yet</h3>
          <p className="text-muted-foreground max-w-md">
            Generate your first video using the Text to Video feature. All your generated videos will appear here.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xl font-bold text-white">
              {videos.length} Video{videos.length !== 1 ? 's' : ''}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => {
                const statusBadge = getStatusBadge(video.status);
                const videoSrc = getVideoSrc(video);
                
                return (
                  <GlassCard 
                    key={video.id}
                    hoverEffect
                    className={`cursor-pointer transition-all ${selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedVideo(video)}
                    data-testid={`card-video-${video.id}`}
                  >
                    <div className="aspect-video bg-black/50 rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                      {videoSrc && video.status === "completed" ? (
                        <video 
                          src={videoSrc} 
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                          data-testid={`thumbnail-${video.id}`}
                        />
                      ) : (
                        <Video className="w-12 h-12 text-white/20" />
                      )}
                      
                      {video.status === "processing" && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <span className="text-xs text-primary/80">Generating...</span>
                        </div>
                      )}
                      
                      {videoSrc && video.status === "completed" && (
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-white line-clamp-2" data-testid={`text-prompt-${video.id}`}>
                        {video.prompt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{video.resolution}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {video.duration}s
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <GlassCard className="sticky top-6">
              <h2 className="font-display text-xl font-bold text-white mb-4">Preview</h2>
              
              {selectedVideo ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    {(() => {
                      const videoSrc = getVideoSrc(selectedVideo);
                      if (videoSrc && selectedVideo.status === "completed") {
                        return (
                          <video 
                            key={videoSrc}
                            src={videoSrc} 
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                            data-testid="video-preview"
                          />
                        );
                      }
                      return (
                        <div className="w-full h-full flex items-center justify-center">
                          {selectedVideo.status === "processing" ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-10 h-10 text-primary animate-spin" />
                              <p className="text-sm text-muted-foreground">Generating video...</p>
                              <p className="text-xs text-muted-foreground/60">This may take a few minutes</p>
                            </div>
                          ) : (
                            <Video className="w-12 h-12 text-white/20" />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Prompt</p>
                      <p className="text-sm text-white">{selectedVideo.prompt}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
                        <p className="text-sm text-white">{selectedVideo.duration}s</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</p>
                        <p className="text-sm text-white">{selectedVideo.resolution}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Model</p>
                        <p className="text-sm text-white">{selectedVideo.model}</p>
                      </div>
                    </div>
                    
                    {selectedVideo.objectPath && (
                      <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                        Stored in App Storage
                      </div>
                    )}
                    
                    {selectedVideo.status === "processing" && (
                      <Button 
                        onClick={() => handleManualStatusCheck(selectedVideo.id)}
                        disabled={checkingStatus === selectedVideo.id}
                        variant="outline"
                        className="w-full border-primary/50 text-primary hover:bg-primary/10"
                        data-testid="button-check-status"
                      >
                        {checkingStatus === selectedVideo.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Check Status
                          </>
                        )}
                      </Button>
                    )}
                    
                    {selectedVideo.status === "completed" && (getVideoSrc(selectedVideo)) && (
                      <Button 
                        onClick={() => handleDownload(selectedVideo)}
                        disabled={downloadingVideo === selectedVideo.id}
                        className="w-full bg-primary hover:bg-primary/90 text-background font-bold"
                        data-testid="button-download"
                      >
                        {downloadingVideo === selectedVideo.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing Download...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Video
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-black/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-12 h-12 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Select a video to preview</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
