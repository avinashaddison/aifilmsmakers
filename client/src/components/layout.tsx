import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
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
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden relative font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Global Background Layers */}
      <div className="fixed inset-0 z-0">
        {/* Image Layer */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        {/* Cyber Grid Layer */}
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        
        {/* Noise Overlay */}
        <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none mix-blend-overlay" />
      </div>
      
      {/* Sidebar */}
      <aside className="w-72 h-full border-r border-white/5 bg-sidebar/40 backdrop-blur-2xl flex flex-col z-20 hidden md:flex relative shadow-2xl">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.4)]">
            <Film className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-black text-2xl tracking-wider text-white">FILM<span className="text-primary neon-gradient">AI</span></span>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-white/10 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_#00f3ff]" />}
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary animate-pulse-slow")} />
                  <span className={cn("font-medium tracking-wide", isActive && "font-bold")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-white cursor-pointer transition-colors rounded-lg hover:bg-white/5 group">
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-medium">Settings</span>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-background/80 backdrop-blur-xl border-b border-white/10 z-50 flex items-center px-4 justify-between shadow-lg">
        <span className="font-display font-bold text-xl text-white">FILM<span className="text-primary">AI</span></span>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative pt-16 md:pt-0 z-10 scroll-smooth">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
           <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] mix-blend-screen animate-pulse-slow" />
           <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[120px] mix-blend-screen animate-pulse-slow" style={{animationDelay: '2s'}} />
        </div>

        <div className="relative z-10 p-6 md:p-12 max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
