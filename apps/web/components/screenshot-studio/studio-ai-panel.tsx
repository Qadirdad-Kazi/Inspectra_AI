'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudioAiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: {
    appName: string;
    appDescription: string;
    theme: string;
    primaryColor: string;
  }) => Promise<void>;
  screenshotCount?: number;
}

export function StudioAiPanel({
  isOpen,
  onClose,
  onGenerate,
  screenshotCount = 0,
}: StudioAiPanelProps) {
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [theme, setTheme] = useState('glassmorphism');
  const [primaryColor, setPrimaryColor] = useState('#22d3ee');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName) return;

    setLoading(true);
    try {
      await onGenerate({ appName, appDescription, theme, primaryColor });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-lg font-bold">AI Copy & Layout</h3>
              <p className="text-xs text-slate-400">
                Builds a 4-frame set with platform mockups + marketing copy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100">
            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {screenshotCount > 0
                ? `${screenshotCount} uploaded screenshot(s) will be placed into device frames.`
                : 'Tip: upload screenshots into devices first — AI will place them into the generated set.'}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              App Name
            </label>
            <input
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Inspectra Mobile"
              className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Short Description / Key Features
            </label>
            <textarea
              rows={3}
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="Describe your app's core value, speed, security, sync..."
              className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Theme Preset
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="glassmorphism">Glassmorphic Dark</option>
                <option value="dark">Sleek Dark Mode</option>
                <option value="gradient">Vibrant Neon Gradient</option>
                <option value="minimal">Clean Minimal Light</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Brand Color Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
                />
                <span className="font-mono text-xs uppercase text-slate-300">{primaryColor}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/15 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Screenshot Set'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
