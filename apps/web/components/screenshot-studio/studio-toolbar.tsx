'use client';

import { Sparkles, Download, Smartphone, Tablet, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudioToolbarProps {
  platform: 'ios' | 'android' | 'msstore' | 'web';
  setPlatform: (p: 'ios' | 'android' | 'msstore' | 'web') => void;
  onOpenAiModal: () => void;
  onExport: () => void;
  isExporting?: boolean;
  projectName: string;
  setProjectName: (name: string) => void;
  exportLabel?: string;
}

export function StudioToolbar({
  platform,
  setPlatform,
  onOpenAiModal,
  onExport,
  isExporting,
  projectName,
  setProjectName,
  exportLabel,
}: StudioToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-4 text-white backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Project Title..."
        />
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              platform === 'ios' ? 'bg-cyan-400 font-bold text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            iOS (App Store)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              platform === 'android' ? 'bg-cyan-400 font-bold text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="h-3.5 w-3.5" />
            Android (Play Store)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('web')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              platform === 'web' ? 'bg-cyan-400 font-bold text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Web / MS Store
          </button>
        </div>
        {exportLabel ? (
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 lg:inline">
            Export · {exportLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={onOpenAiModal}
          variant="outline"
          size="sm"
          className="gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100"
        >
          <Sparkles className="h-4 w-4" />
          AI Copy & Layout
        </Button>
        <Button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          size="sm"
          className="gap-1.5 bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Store Set
        </Button>
      </div>
    </div>
  );
}
