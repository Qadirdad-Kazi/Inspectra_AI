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
}

export function StudioToolbar({
  platform,
  setPlatform,
  onOpenAiModal,
  onExport,
  isExporting,
  projectName,
  setProjectName,
}: StudioToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/90 p-4 text-white backdrop-blur-md">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Project Title..."
        />
        <div className="flex items-center gap-1 rounded-lg bg-black/40 p-1 border border-white/10">
          <button
            onClick={() => setPlatform('ios')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              platform === 'ios' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            iOS (App Store)
          </button>
          <button
            onClick={() => setPlatform('android')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              platform === 'android' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="h-3.5 w-3.5" />
            Android (Play Store)
          </button>
          <button
            onClick={() => setPlatform('web')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              platform === 'web' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Web / MS Store
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenAiModal}
          variant="outline"
          size="sm"
          className="border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 hover:text-teal-200 gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          AI Copy & Layout Generator
        </Button>
        <Button
          onClick={onExport}
          disabled={isExporting}
          size="sm"
          className="bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400 gap-1.5"
        >
          {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Store Set
        </Button>
      </div>
    </div>
  );
}
