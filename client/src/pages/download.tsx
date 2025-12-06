import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Download, Play, Share2, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function DownloadPage() {
  return (
    <div className="h-[80vh] flex items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-3xl space-y-8 text-center">
        
        <div className="mb-12">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(0,243,255,0.3)] animate-bounce">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2">
            Masterpiece Created
          </h1>
          <p className="text-xl text-muted-foreground">
            "The Last Echo" is ready for the premiere.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
           <GlassCard className="p-0 overflow-hidden group relative">
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-70 group-hover:scale-105 transition-transform duration-700" />
             <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
             </div>
           </GlassCard>
           
           <div className="flex flex-col gap-4 justify-center">
              <GlassCard className="py-4 px-6 flex justify-between items-center">
                 <div>
                   <p className="text-xs text-muted-foreground uppercase tracking-wider">Format</p>
                   <p className="text-white font-mono">MP4 (H.264)</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-muted-foreground uppercase tracking-wider">Size</p>
                   <p className="text-white font-mono">2.4 GB</p>
                 </div>
              </GlassCard>
              
              <GlassCard className="py-4 px-6 flex justify-between items-center">
                 <div>
                   <p className="text-xs text-muted-foreground uppercase tracking-wider">Resolution</p>
                   <p className="text-white font-mono">4K (3840x2160)</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
                   <p className="text-white font-mono">03:45</p>
                 </div>
              </GlassCard>

              <Button size="lg" className="w-full h-14 bg-primary hover:bg-primary/90 text-background font-bold text-lg shadow-[0_0_20px_rgba(0,243,255,0.3)] mt-4">
                <Download className="mr-2 h-5 w-5" /> Download Film
              </Button>
              
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5">
                  <Share2 className="mr-2 h-4 w-4" /> Share Link
                </Button>
                <Link href="/">
                  <Button variant="ghost" className="flex-1 text-muted-foreground hover:text-white">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
