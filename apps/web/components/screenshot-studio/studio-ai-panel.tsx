'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudioAiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: { appName: string; appDescription: string; theme: string; primaryColor: string }) => Promise<void>;
}

export function StudioAiPanel({ isOpen, onClose, onGenerate }: StudioAiPanelProps) {
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [theme, setTheme] = useState('glassmorphism');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-400" />
            <h3 className="text-lg font-bold">Inspectra AI Copy & Visual Generator</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              App Name
            </label>
            <input
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Inspectra Mobile Audit"
              className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              placeholder="Describe your app's core feature, speed, security audits, real-time sync..."
              className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                className="w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                <span className="text-xs font-mono uppercase text-slate-300">{primaryColor}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/15 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Synthesize Screenshot Set'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
