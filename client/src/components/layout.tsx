import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, Video, Library, Film, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: PlusCircle, label: "Create Film", href: "/create" },
    { icon: BookOpen, label: "Generated Stories", href: "/stories" },
    { icon: Video, label: "Text to Video", href: "/text-to-video" },
    { icon: Library, label: "Video Library", href: "/video-library" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 border-r border-white/5 bg-card/50 backdrop-blur-xl hidden md:flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        
        <div className="p-6 flex items-center gap-3 border-b border-white/5 relative">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 pulse-glow">
            <Film className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-display font-bold text-xl text-glow tracking-wider">FILMAI</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-secondary" />
              <span>AI-Powered Cinema</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 relative">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 neon-box" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary rounded-r" />
                  )}
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive ? "text-primary" : "group-hover:scale-110"
                  )} />
                  <span className={cn(
                    "font-medium text-sm tracking-wide",
                    isActive && "text-glow"
                  )}>{item.label}</span>
                  
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Generation Credits</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-display font-bold text-white">477</span>
              <span className="text-xs text-primary">/ 500</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div className="h-full w-[95%] bg-gradient-to-r from-primary to-secondary rounded-full progress-glow" />
            </div>
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-card/90 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Film className="w-4 h-4 text-black" />
          </div>
          <span className="font-display font-bold text-lg text-glow">FILMAI</span>
        </div>
        
        <nav className="flex items-center gap-2">
          {navItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  isActive 
                    ? "bg-primary/20 text-primary" 
                    : "text-muted-foreground hover:text-white"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 custom-scrollbar">
        <div className="p-6 max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
