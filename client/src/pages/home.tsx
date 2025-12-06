import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Clock, Film } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface FilmData {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  framework?: {
    genre: string;
    premise: string;
  };
}

export default function Home() {
  const [films, setFilms] = useState<FilmData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFilms();
  }, []);

  const fetchFilms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/films');
      
      if (!response.ok) {
        throw new Error('Failed to fetch films');
      }

      const data = await response.json();
      setFilms(data);
    } catch (error: any) {
      console.error('Error fetching films:', error);
      toast({
        variant: "destructive",
        title: "Failed to load films",
        description: error.message || "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-white/10 text-white border-white/10' },
      generating: { label: 'Generating', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' },
      completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400 border-green-500/20' },
    };
    
    return statusMap[status] || statusMap.draft;
  };

  const getGenreBadge = (genre?: string) => {
    if (!genre) return null;
    
    const genreColors: Record<string, string> = {
      'Sci-Fi': 'bg-primary/20 text-primary border-primary/20 shadow-[0_0_10px_rgba(0,243,255,0.2)]',
      'Horror': 'bg-secondary/20 text-secondary border-secondary/20 shadow-[0_0_10px_rgba(188,19,254,0.2)]',
      'Drama': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
      'Action': 'bg-red-500/20 text-red-400 border-red-500/20',
      'Comedy': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
      'Thriller': 'bg-purple-500/20 text-purple-400 border-purple-500/20',
    };
    
    return genreColors[genre] || 'bg-gray-500/20 text-gray-400 border-gray-500/20';
  };

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
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all relative overflow-hidden group"
            data-testid="button-create-new-film"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus className="mr-2 h-5 w-5 relative z-10" /> <span className="relative z-10">Create New Film</span>
          </Button>
        </Link>
      </div>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white font-semibold tracking-wide">Recent Projects</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
              <p className="text-muted-foreground">Loading films...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {films.map((film) => {
              const statusBadge = getStatusBadge(film.status);
              const genreColor = getGenreBadge(film.framework?.genre);
              
              return (
                <Link key={film.id} href={`/framework/${film.id}`}>
                  <GlassCard 
                    hoverEffect 
                    variant="neo" 
                    className="group cursor-pointer relative overflow-hidden min-h-[220px]"
                    data-testid={`card-film-${film.id}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40 mix-blend-overlay" />
                    
                    <div className="relative z-20 flex flex-col h-full justify-end">
                      <div className="flex items-center gap-2 mb-3">
                        {film.framework?.genre && (
                          <span 
                            className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase border ${genreColor}`}
                            data-testid={`badge-genre-${film.id}`}
                          >
                            {film.framework.genre}
                          </span>
                        )}
                        <span 
                          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase border ${statusBadge.className}`}
                          data-testid={`badge-status-${film.id}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                      <h3 
                        className="font-display text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors text-glow"
                        data-testid={`text-film-title-${film.id}`}
                      >
                        {film.title}
                      </h3>
                      <p 
                        className="text-sm text-gray-400 line-clamp-2 mb-4 group-hover:text-gray-300 transition-colors"
                        data-testid={`text-film-premise-${film.id}`}
                      >
                        {film.framework?.premise || 'Framework pending...'}
                      </p>
                      
                      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            film.status === 'completed' ? 'w-full bg-green-400' :
                            film.status === 'generating' ? 'w-3/4 bg-primary' :
                            'w-1/4 bg-white/30'
                          } shadow-[0_0_10px_#00f3ff]`}
                        />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}

            {/* Create New Project Card */}
            <Link href="/create">
              <GlassCard 
                hoverEffect 
                className="group cursor-pointer relative overflow-hidden border-dashed border-white/20 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all min-h-[220px]"
                data-testid="card-create-new"
              >
                <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all">
                    <Plus className="w-8 h-8 opacity-50 group-hover:opacity-100" />
                  </div>
                  <span className="font-display font-bold tracking-wide text-lg">Start New Project</span>
                </div>
              </GlassCard>
            </Link>
          </div>
        )}
      </section>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4 group hover:bg-card/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:scale-110 transition-transform">
            <Film className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Films</p>
            <p className="text-3xl font-display font-bold text-white" data-testid="text-total-films">
              {films.length}
            </p>
          </div>
        </GlassCard>
        
        <GlassCard className="flex items-center gap-4 group hover:bg-card/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] group-hover:scale-110 transition-transform">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">In Progress</p>
            <p className="text-3xl font-display font-bold text-white" data-testid="text-in-progress">
              {films.filter(f => f.status === 'generating').length}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 group hover:bg-card/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</p>
            <p className="text-3xl font-display font-bold text-white" data-testid="text-completed">
              {films.filter(f => f.status === 'completed').length}
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
