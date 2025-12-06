import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Clock, Film, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            Welcome Back, <span className="text-primary neon-gradient">Director</span>
          </h1>
          <p className="text-muted-foreground text-lg">Ready to create your next masterpiece?</p>
        </div>
        <Link href="/create">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus className="mr-2 h-5 w-5 relative z-10" /> <span className="relative z-10">Create New Film</span>
          </Button>
        </Link>
      </div>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white font-semibold tracking-wide">Recent Projects</h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10">View All</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Project Card 1 */}
          <GlassCard hoverEffect variant="neo" className="group cursor-pointer relative overflow-hidden min-h-[220px]">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40 mix-blend-overlay" />
            
            <div className="relative z-20 flex flex-col h-full justify-end">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-primary/20 text-primary border border-primary/20 uppercase shadow-[0_0_10px_rgba(0,243,255,0.2)]">Sci-Fi</span>
                <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-white/10 text-white border border-white/10 uppercase">In Progress</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors text-glow">The Last Echo</h3>
              <p className="text-sm text-gray-400 line-clamp-2 mb-4 group-hover:text-gray-300 transition-colors">A deaf musician discovers a recording that could save humanity.</p>
              
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-3/4 shadow-[0_0_10px_#00f3ff]" />
              </div>
            </div>
          </GlassCard>

          {/* Project Card 2 */}
          <GlassCard hoverEffect variant="neo" className="group cursor-pointer relative overflow-hidden min-h-[220px]">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509347528160-9a9e33742cd4?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40 mix-blend-overlay" />
            
            <div className="relative z-20 flex flex-col h-full justify-end">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-secondary/20 text-secondary border border-secondary/20 uppercase shadow-[0_0_10px_rgba(188,19,254,0.2)]">Horror</span>
                <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-white/10 text-white border border-white/10 uppercase">Draft</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-1 group-hover:text-secondary transition-colors text-glow-purple">Midnight Station</h3>
              <p className="text-sm text-gray-400 line-clamp-2 mb-4 group-hover:text-gray-300 transition-colors">The last train never arrives at its destination.</p>
              
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="bg-secondary h-full w-1/4 shadow-[0_0_10px_#bc13fe]" />
              </div>
            </div>
          </GlassCard>

           {/* Project Card 3 */}
           <GlassCard hoverEffect className="group cursor-pointer relative overflow-hidden border-dashed border-white/20 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all min-h-[220px]">
             <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all">
                 <Plus className="w-8 h-8 opacity-50 group-hover:opacity-100" />
               </div>
               <span className="font-display font-bold tracking-wide text-lg">Start New Project</span>
             </div>
          </GlassCard>
        </div>
      </section>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4 group hover:bg-card/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:scale-110 transition-transform">
            <Film className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Films</p>
            <p className="text-3xl font-display font-bold text-white">12</p>
          </div>
        </GlassCard>
        
        <GlassCard className="flex items-center gap-4 group hover:bg-card/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] group-hover:scale-110 transition-transform">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Generation Time</p>
            <p className="text-3xl font-display font-bold text-white">14m</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 group hover:bg-card/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Credits Left</p>
            <p className="text-3xl font-display font-bold text-white">850</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
