import { cn } from "@/lib/utils";

export function CyberSpinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };
  
  return (
    <div className={cn("cyber-spinner", sizes[size], className)} />
  );
}

export function DNALoader({ className }: { className?: string }) {
  return (
    <div className={cn("dna-loader", className)}>
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function WaveLoader({ className }: { className?: string }) {
  return (
    <div className={cn("wave-loader", className)}>
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function PulseRing({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("relative circle-pulse flex items-center justify-center", className)}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function GeneratingOverlay({ 
  progress, 
  stage, 
  message 
}: { 
  progress: number; 
  stage: string; 
  message: string;
}) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
      <div className="text-center space-y-6 p-8">
        <div className="relative w-32 h-32 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.83} 283`}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f3ff" />
                <stop offset="100%" stopColor="#bc13fe" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-3xl font-bold text-white text-glow">{progress}%</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-primary font-display font-bold uppercase tracking-wider text-sm">{stage}</p>
          <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
        </div>
        
        <WaveLoader className="justify-center" />
      </div>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl bg-card/50 border border-white/5 p-6 space-y-4",
      className
    )}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded-lg w-3/4 animate-pulse shimmer" />
          <div className="h-3 bg-white/5 rounded-lg w-1/2 animate-pulse shimmer" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded-lg w-full animate-pulse shimmer" />
        <div className="h-3 bg-white/5 rounded-lg w-5/6 animate-pulse shimmer" />
      </div>
    </div>
  );
}

export function TypewriterText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("typing inline-block", className)}>
      {text}
    </span>
  );
}

export function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("glitch inline-block", className)}>
      {text}
    </span>
  );
}

export function ProgressRing({ 
  progress, 
  size = 60, 
  strokeWidth = 4,
  className 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f3ff" />
            <stop offset="100%" stopColor="#bc13fe" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-xs font-bold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
