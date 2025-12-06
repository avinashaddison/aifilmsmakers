import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Clapperboard, 
  Video, 
  Layers, 
  Download, 
  Settings,
  Film
} from "lucide-react";
import { cn } from "@/lib/utils";
import bgImage from "@assets/generated_images/cinematic_dark_abstract_background.png";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: PlusCircle, label: "Create Film", href: "/create" },
    { icon: BookOpen, label: "Story Framework", href: "/framework" },
    { icon: Clapperboard, label: "Chapters", href: "/chapters" },
    { icon: Video, label: "Video Generator", href: "/generator" },
    { icon: Layers, label: "Film Assembly", href: "/assembly" },
    { icon: Download, label: "Downloads", href: "/download" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden relative">
      {/* Global Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Sidebar */}
      <aside className="w-64 h-full border-r border-white/5 bg-sidebar/60 backdrop-blur-xl flex flex-col z-20 hidden md:flex relative">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.5)]">
            <Film className="w-5 h-5 text-background" />
          </div>
          <span className="font-display font-bold text-xl tracking-wider text-white">FILM<span className="text-primary">AI</span></span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 group",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,243,255,0.1)]" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                  <span className={cn("font-medium", isActive && "font-semibold")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-white cursor-pointer transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </div>
        </div>
      </aside>

      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-background/80 backdrop-blur border-b border-white/10 z-50 flex items-center px-4 justify-between">
        <span className="font-display font-bold text-xl text-white">FILM<span className="text-primary">AI</span></span>
        {/* Add mobile menu toggle here if needed */}
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative pt-16 md:pt-0 z-10">
        {/* Background Ambient Light Overlay - for extra depth on top of image */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
           <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] mix-blend-screen" />
           <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[100px] mix-blend-screen" />
        </div>

        <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
