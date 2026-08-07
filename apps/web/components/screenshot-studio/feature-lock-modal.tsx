'use client';

import { Lock, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureLockModalProps {
  reason?: string;
  onUpgrade?: () => void;
}

export function FeatureLockModal({ reason, onUpgrade }: FeatureLockModalProps) {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 p-8 text-center backdrop-blur-xl shadow-2xl">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <Lock className="h-8 w-8" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
        Inspectra Studio <Sparkles className="h-5 w-5 text-amber-400" />
      </h2>

      <p className="mt-2 max-w-md text-sm text-slate-300">
        {reason || 'This premium visual asset builder requires the Inspectra Studio Addon or an active Pro plan.'}
      </p>

      <div className="my-6 grid w-full max-w-sm gap-2 text-left text-xs text-slate-300">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
          <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
          <span>AI-generated App Store headlines & captions</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
          <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
          <span>3D Tilted, Upright, Angle & Handheld device mockups</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5">
          <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="font-medium text-white">Always unlocked for Platform Admins & Org Owners</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button
          onClick={onUpgrade}
          className="flex-1 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-medium hover:from-teal-600 hover:to-indigo-700 border-0"
        >
          Unlock Inspectra Studio Addon ($9.99/mo)
        </Button>
      </div>
    </div>
  );
}
