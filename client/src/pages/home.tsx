import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Clock, Film, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2">
            Welcome Back, <span className="text-primary">Director</span>
          </h1>
          <p className="text-muted-foreground text-lg">Ready to create your next masterpiece?</p>
        </div>
        <Link href="/create">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all">
            <Plus className="mr-2 h-5 w-5" /> Create New Film
          </Button>
        </Link>
      </div>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white font-semibold">Recent Projects</h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80">View All</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project Card 1 */}
          <GlassCard hoverEffect className="group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40" />
            
            <div className="relative z-20 flex flex-col h-48 justify-end">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/20">Sci-Fi</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 text-white">In Progress</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">The Last Echo</h3>
              <p className="text-sm text-gray-300 line-clamp-2">A deaf musician discovers a recording that could save humanity.</p>
            </div>
          </GlassCard>

          {/* Project Card 2 */}
          <GlassCard hoverEffect className="group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509347528160-9a9e33742cd4?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40" />
            
            <div className="relative z-20 flex flex-col h-48 justify-end">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-secondary/20 text-secondary border border-secondary/20">Horror</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 text-white">Draft</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-1 group-hover:text-secondary transition-colors">Midnight Station</h3>
              <p className="text-sm text-gray-300 line-clamp-2">The last train never arrives at its destination.</p>
            </div>
          </GlassCard>

           {/* Project Card 3 */}
           <GlassCard hoverEffect className="group cursor-pointer relative overflow-hidden border-dashed border-white/20 flex items-center justify-center bg-white/5">
             <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
               <Plus className="w-12 h-12 mb-2 opacity-50 group-hover:opacity-100" />
               <span className="font-medium">Start New Project</span>
             </div>
          </GlassCard>
        </div>
      </section>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Films</p>
            <p className="text-2xl font-display font-bold text-white">12</p>
          </div>
        </GlassCard>
        
        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Generation Time</p>
            <p className="text-2xl font-display font-bold text-white">14m</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Credits Left</p>
            <p className="text-2xl font-display font-bold text-white">850</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
