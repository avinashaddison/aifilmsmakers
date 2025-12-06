import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export function GlassCard({ className, children, hoverEffect = false, ...props }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "bg-card/30 backdrop-blur-md border border-white/5 rounded-xl p-6 shadow-xl transition-all duration-300",
        hoverEffect && "hover:bg-card/50 hover:border-primary/20 hover:shadow-[0_0_20px_rgba(0,243,255,0.1)] hover:-translate-y-1",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
