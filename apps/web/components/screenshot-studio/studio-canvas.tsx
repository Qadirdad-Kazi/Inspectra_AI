'use client';

import { Upload, Type, Image as ImageIcon, Sparkles, Move, Trash2 } from 'lucide-react';

export interface SlideData {
  id: string;
  headline: string;
  subhead: string;
  frameType: 'iphone-16-pro' | 'ipad-pro' | 'pixel-9' | 'browser-window';
  backgroundColor: string;
  gradientBackground?: string;
  textColor: string;
  badgeText?: string;
  imageUrl?: string;
}

interface StudioCanvasProps {
  slides: SlideData[];
  activeSlideIndex: number;
  setActiveSlideIndex: (idx: number) => void;
  updateSlide: (idx: number, patch: Partial<SlideData>) => void;
  platform: 'ios' | 'android' | 'msstore' | 'web';
}

export function StudioCanvas({
  slides,
  activeSlideIndex,
  setActiveSlideIndex,
  updateSlide,
  platform,
}: StudioCanvasProps) {
  const currentSlide = slides[activeSlideIndex] || slides[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateSlide(idx, { imageUrl: url });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Slide Selector Carousel */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setActiveSlideIndex(idx)}
            className={`group relative flex h-28 w-20 shrink-0 flex-col items-center justify-between rounded-xl border p-2 text-center transition ${
              activeSlideIndex === idx
                ? 'border-teal-400 bg-teal-500/15 ring-2 ring-teal-400/50 shadow-lg shadow-teal-500/20'
                : 'border-white/10 bg-slate-900/60 hover:border-white/20'
            }`}
            style={{
              background: slide.gradientBackground || slide.backgroundColor,
            }}
          >
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
              #{idx + 1}
            </span>
            <span className="line-clamp-2 text-[9px] font-medium text-white/90">
              {slide.headline || 'Slide'}
            </span>
          </button>
        ))}
      </div>

      {/* Main Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Preview */}
        <div className="lg:col-span-2 flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950 p-8 min-h-[520px]">
          <div
            className="relative flex flex-col items-center justify-between overflow-hidden rounded-3xl p-8 shadow-2xl transition-all duration-300 w-full max-w-[340px] h-[580px]"
            style={{
              background: currentSlide.gradientBackground || currentSlide.backgroundColor,
              color: currentSlide.textColor,
            }}
          >
            {/* Header Text & Badge */}
            <div className="flex flex-col items-center text-center gap-2 z-10 w-full px-2">
              {currentSlide.badgeText ? (
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md border border-white/20">
                  {currentSlide.badgeText}
                </span>
              ) : null}

              <h2 className="text-xl font-extrabold tracking-tight leading-snug drop-shadow-md">
                {currentSlide.headline || 'Your Headline Here'}
              </h2>

              <p className="text-xs font-medium text-white/80 max-w-[260px] line-clamp-2">
                {currentSlide.subhead || 'Add your key feature or value proposition.'}
              </p>
            </div>

            {/* Mockup Frame Container */}
            <div className="relative mt-4 flex-1 w-full flex items-end justify-center overflow-hidden">
              <div className="relative w-[240px] h-[360px] rounded-t-[36px] border-[6px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col items-center">
                {/* Notch / Dynamic Island */}
                <div className="absolute top-2 h-4 w-20 rounded-full bg-black/90 z-20" />

                {/* Screenshot Content / Placeholder */}
                {currentSlide.imageUrl ? (
                  <img
                    src={currentSlide.imageUrl}
                    alt="App Screenshot"
                    className="h-full w-full object-cover pt-6"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-500 pt-6">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-50 text-teal-400" />
                    <span className="text-xs font-medium text-slate-400">
                      Drop screenshot here or upload in panel
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Type className="h-4 w-4 text-teal-400" />
              Edit Slide #{activeSlideIndex + 1}
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Headline Text</label>
              <input
                type="text"
                value={currentSlide.headline}
                onChange={(e) => updateSlide(activeSlideIndex, { headline: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Subtitle / Caption</label>
              <textarea
                rows={2}
                value={currentSlide.subhead}
                onChange={(e) => updateSlide(activeSlideIndex, { subhead: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Badge Tagline</label>
              <input
                type="text"
                value={currentSlide.badgeText || ''}
                onChange={(e) => updateSlide(activeSlideIndex, { badgeText: e.target.value })}
                placeholder="e.g. Featured, 100% Secure..."
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Background Gradient / Color</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                  'linear-gradient(135deg, #020617 0%, #172554 100%)',
                  'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
                  'linear-gradient(135deg, #111827 0%, #4c1d95 100%)',
                ].map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateSlide(activeSlideIndex, { gradientBackground: g })}
                    className="h-8 rounded-md border border-white/20 shadow"
                    style={{ background: g }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Upload App Screenshot</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-3 text-xs text-slate-300 hover:bg-white/10">
                <Upload className="h-4 w-4 text-teal-400" />
                <span>{currentSlide.imageUrl ? 'Replace Image' : 'Choose PNG/JPG File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, activeSlideIndex)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
