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
        "bg-card border border-border rounded-lg p-6",
        hoverEffect && "hover:border-primary/50",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
