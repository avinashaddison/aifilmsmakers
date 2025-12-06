import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  hoverEffect?: boolean;
  variant?: "default" | "neo";
}

export function GlassCard({ className, children, hoverEffect = false, variant = "default", ...props }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden transition-all duration-500",
        // Base styles
        "bg-card/40 backdrop-blur-xl border border-white/5 rounded-xl p-6 shadow-lg",
        
        // Hover effects
        hoverEffect && "group hover:bg-card/60 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(0,243,255,0.15)] hover:-translate-y-1",
        
        // Neo variant
        variant === "neo" && "bg-gradient-to-br from-white/5 to-transparent border-l-primary/20 border-t-primary/20",
        
        className
      )} 
      {...props}
    >
      {/* Shine effect on hover */}
      {hoverEffect && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
