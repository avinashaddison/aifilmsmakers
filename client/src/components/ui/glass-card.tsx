import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  hoverEffect?: boolean;
  variant?: "default" | "neo" | "glow" | "holographic";
  animated?: boolean;
}

export function GlassCard({ 
  className, 
  children, 
  hoverEffect = false, 
  variant = "default", 
  animated = false,
  ...props 
}: GlassCardProps) {
  const baseClasses = "relative rounded-xl p-6 transition-all duration-300";
  
  const variantClasses = {
    default: "bg-card/80 backdrop-blur-xl border border-white/10",
    neo: "bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20",
    glow: "bg-card/80 backdrop-blur-xl border border-primary/30 neon-box",
    holographic: "bg-card/80 backdrop-blur-xl border border-white/10 holographic",
  };
  
  const hoverClasses = hoverEffect 
    ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer group" 
    : "";
  
  const animatedClasses = animated ? "fade-in-up" : "";

  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        hoverClasses,
        animatedClasses,
        className
      )} 
      {...props}
    >
      {hoverEffect && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-secondary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function GlassCardShimmer({ className, children, ...props }: Omit<GlassCardProps, 'variant'>) {
  return (
    <div 
      className={cn(
        "relative rounded-xl p-6 bg-card/80 backdrop-blur-xl border border-white/10 overflow-hidden shimmer",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-card/50 border border-white/5 p-6 animate-pulse", className)}>
      <div className="h-4 bg-white/10 rounded w-3/4 mb-4" />
      <div className="h-3 bg-white/5 rounded w-full mb-2" />
      <div className="h-3 bg-white/5 rounded w-5/6" />
    </div>
  );
}
