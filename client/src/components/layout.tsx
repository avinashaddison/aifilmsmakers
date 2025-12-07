import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, Video, Library, Film } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: PlusCircle, label: "Create Film", href: "/create" },
    { icon: Video, label: "Text to Video", href: "/text-to-video" },
    { icon: Library, label: "Video Library", href: "/video-library" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Film className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-xl">FILMAI</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded cursor-pointer",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:hidden fixed top-0 left-0 w-full h-14 bg-card border-b border-border z-50 flex items-center px-4">
        <span className="font-bold text-lg">FILMAI</span>
      </div>

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
