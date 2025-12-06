import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Edit2, Check } from "lucide-react";
import { Link } from "wouter";
import { mockFramework } from "@/lib/mock-data";

export default function StoryFramework() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary font-medium mb-1 uppercase tracking-widest">Phase 1</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Story Framework</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white">
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Link href="/chapters">
            <Button className="bg-primary hover:bg-primary/90 text-background font-bold">
              Confirm & Generate Chapters <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Core Elements */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <h3 className="text-lg font-display font-bold text-white mb-4">Premise</h3>
            <p className="text-lg text-gray-300 leading-relaxed">
              {mockFramework.premise}
            </p>
          </GlassCard>

          <GlassCard className="relative overflow-hidden bg-secondary/5 border-secondary/20">
             <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
            <h3 className="text-lg font-display font-bold text-white mb-2">The Hook</h3>
            <p className="text-2xl font-serif italic text-secondary-foreground/90">
              "{mockFramework.hook}"
            </p>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase">Genre</h3>
              <div className="flex flex-wrap gap-2">
                {mockFramework.genre.split(" ").map((g, i) => (
                   <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-sm">{g}</span>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase">Tone</h3>
              <p className="text-white text-lg">{mockFramework.tone}</p>
            </GlassCard>
          </div>
          
          <GlassCard>
             <h3 className="text-lg font-display font-bold text-white mb-4">Setting</h3>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">LOCATION</span>
                  <span className="text-white">{mockFramework.setting.location}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">TIME</span>
                  <span className="text-white">{mockFramework.setting.time}</span>
                </div>
                <div>
                   <span className="text-xs text-muted-foreground block mb-1">WEATHER</span>
                   <span className="text-white">{mockFramework.setting.weather}</span>
                </div>
                 <div>
                   <span className="text-xs text-muted-foreground block mb-1">ATMOSPHERE</span>
                   <span className="text-white">{mockFramework.setting.atmosphere}</span>
                </div>
             </div>
          </GlassCard>
        </div>

        {/* Right Column - Characters */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-white">Cast & Characters</h2>
          
          {mockFramework.characters.map((char, idx) => (
            <GlassCard key={idx} className="group hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg text-white">{char.name}</h3>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">{char.role}</span>
                </div>
                <span className="text-sm text-muted-foreground">{char.age}y</span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{char.description}</p>
              <div className="text-xs text-muted-foreground pt-2 border-t border-white/5 flex items-center gap-2">
                <span className="opacity-50">REFERENCE:</span>
                <span className="text-white">{char.actor}</span>
              </div>
            </GlassCard>
          ))}

          <GlassCard className="border-dashed border-white/10 flex items-center justify-center py-8 cursor-pointer hover:bg-white/5 transition-colors">
             <span className="text-muted-foreground flex items-center gap-2"><Plus className="w-4 h-4" /> Add Character</span>
          </GlassCard>
        </div>
      </div>
      
      <div className="fixed bottom-8 right-8">
        <Link href="/chapters">
            <Button size="lg" className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-background font-bold shadow-[0_0_20px_rgba(0,243,255,0.3)] animate-pulse hover:animate-none">
              Proceed to Chapters <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </Link>
      </div>
    </div>
  );
}

import { Plus } from "lucide-react";
