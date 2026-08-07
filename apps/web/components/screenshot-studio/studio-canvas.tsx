'use client';

import { useState } from 'react';
import {
  Upload,
  Type,
  Image as ImageIcon,
  Smartphone,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  Move,
  Maximize2,
} from 'lucide-react';

export type DeviceStyle =
  | 'iphone-17-a'
  | 'iphone-17-b'
  | 'iphone-17-c'
  | 'iphone-17-d'
  | 'iphone-17-e'
  | 'iphone-17-f'
  | 'tilted-hand'
  | 'browser-window';

export interface SlideData {
  id: string;
  headline: string;
  subhead: string;
  frameType: DeviceStyle;
  backgroundColor: string;
  gradientBackground?: string;
  textColor: string;
  badgeText?: string;
  imageUrl?: string;
  imageFit?: 'contain' | 'cover' | 'fill';
  imageZoom?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export const DEVICE_PRESETS: { id: DeviceStyle; label: string; overlay: string }[] = [
  { id: 'iphone-17-a', label: '17 Pro · Upright', overlay: '/mockups/iphone-17-a.webp' },
  { id: 'iphone-17-b', label: '17 Pro · Front', overlay: '/mockups/iphone-17-b.webp' },
  { id: 'iphone-17-c', label: '17 Pro · Right Angle', overlay: '/mockups/iphone-17-c.webp' },
  { id: 'iphone-17-d', label: '17 Pro · Left Angle', overlay: '/mockups/iphone-17-d.webp' },
  { id: 'iphone-17-e', label: '17 Pro · Flat Perspective', overlay: '/mockups/iphone-17-e.webp' },
  { id: 'iphone-17-f', label: '17 Pro · Leaning', overlay: '/mockups/iphone-17-f.webp' },
  { id: 'tilted-hand', label: '3D Tilted Handheld', overlay: '/mockups/tilted-hand.webp' },
  { id: 'browser-window', label: 'Desktop Browser Frame', overlay: '' },
];

interface StudioCanvasProps {
  slides: SlideData[];
  activeSlideIndex: number;
  setActiveSlideIndex: (idx: number) => void;
  updateSlide: (idx: number, patch: Partial<SlideData>) => void;
  platform?: 'ios' | 'android' | 'msstore' | 'web';
}

const FALLBACK_SLIDE: SlideData = {
  id: 'fallback',
  headline: 'Inspectra Mobile Security',
  subhead: 'Instant AI security scanning and store analytics.',
  frameType: 'iphone-17-a',
  backgroundColor: '#0f172a',
  gradientBackground: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  textColor: '#ffffff',
  badgeText: 'Top Rated',
  imageFit: 'cover',
  imageZoom: 100,
  imageOffsetX: 0,
  imageOffsetY: 0,
  textAlign: 'center',
  fontSize: 'md',
};

export function StudioCanvas({
  slides,
  activeSlideIndex,
  setActiveSlideIndex,
  updateSlide,
}: StudioCanvasProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'device' | 'alignment'>('text');
  const currentSlide = slides[activeSlideIndex] ?? slides[0] ?? FALLBACK_SLIDE;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateSlide(idx, { imageUrl: url });
    }
  };

  const selectedPreset = DEVICE_PRESETS.find((p) => p.id === currentSlide.frameType) || DEVICE_PRESETS[0];

  const textAlignClass =
    currentSlide.textAlign === 'left'
      ? 'items-start text-left'
      : currentSlide.textAlign === 'right'
        ? 'items-end text-right'
        : 'items-center text-center';

  const headlineSizeClass =
    currentSlide.fontSize === 'sm'
      ? 'text-base font-bold'
      : currentSlide.fontSize === 'lg'
        ? 'text-2xl font-black'
        : currentSlide.fontSize === 'xl'
          ? 'text-3xl font-black'
          : 'text-xl font-extrabold';

  const imageZoomScale = (currentSlide.imageZoom ?? 100) / 100;
  const imageOffsetX = currentSlide.imageOffsetX ?? 0;
  const imageOffsetY = currentSlide.imageOffsetY ?? 0;
  const imageObjectFit = currentSlide.imageFit ?? 'cover';

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
        <div className="lg:col-span-2 flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950 p-8 min-h-[560px]">
          <div
            className="relative flex flex-col justify-between overflow-hidden rounded-3xl p-8 shadow-2xl transition-all duration-300 w-full max-w-[360px] h-[600px]"
            style={{
              background: currentSlide.gradientBackground || currentSlide.backgroundColor,
              color: currentSlide.textColor,
            }}
          >
            {/* Header Text & Badge */}
            <div className={`flex flex-col gap-2 z-10 w-full px-2 ${textAlignClass}`}>
              {currentSlide.badgeText ? (
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md border border-white/20">
                  {currentSlide.badgeText}
                </span>
              ) : null}

              <h2 className={`tracking-tight leading-snug drop-shadow-md ${headlineSizeClass}`}>
                {currentSlide.headline || 'Your Headline Here'}
              </h2>

              <p className="text-xs font-medium text-white/80 max-w-[280px] line-clamp-2">
                {currentSlide.subhead || 'Add your key feature or value proposition.'}
              </p>
            </div>

            {/* Device Mockup Frame Container */}
            <div className="relative mt-4 flex-1 w-full flex items-end justify-center overflow-hidden">
              {currentSlide.frameType === 'browser-window' ? (
                /* Desktop Browser Frame */
                <div className="relative w-full h-[320px] rounded-t-xl border border-white/20 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
                  <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-2 border-b border-white/10">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="ml-2 truncate text-[10px] text-slate-400 font-mono">
                      https://app.inspectra.ai
                    </span>
                  </div>
                  <div className="relative flex-1 overflow-hidden bg-slate-950">
                    {currentSlide.imageUrl ? (
                      <img
                        src={currentSlide.imageUrl}
                        alt="App Screenshot"
                        className="h-full w-full"
                        style={{
                          objectFit: imageObjectFit,
                          transform: `scale(${imageZoomScale}) translate(${imageOffsetX}px, ${imageOffsetY}px)`,
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-500">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-50 text-teal-400" />
                        <span className="text-xs font-medium text-slate-400">Upload Web App Screenshot</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedPreset?.overlay ? (
                /* Real Device WebP Mockup Overlay */
                <div className="relative w-[280px] h-[380px] flex items-center justify-center overflow-hidden">
                  {/* Screen Mask Content */}
                  <div className="absolute inset-x-8 top-10 bottom-6 overflow-hidden rounded-[28px] bg-slate-950 z-0">
                    {currentSlide.imageUrl ? (
                      <img
                        src={currentSlide.imageUrl}
                        alt="App Screenshot"
                        className="h-full w-full transition-transform duration-200"
                        style={{
                          objectFit: imageObjectFit,
                          transform: `scale(${imageZoomScale}) translate(${imageOffsetX}px, ${imageOffsetY}px)`,
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-slate-500">
                        <ImageIcon className="h-8 w-8 mb-2 opacity-50 text-teal-400" />
                        <span className="text-[11px] font-medium text-slate-400">Drop Screenshot</span>
                      </div>
                    )}
                  </div>

                  {/* High-Res Device Mockup Overlay */}
                  <img
                    src={selectedPreset.overlay}
                    alt={selectedPreset.label}
                    className="relative z-10 h-full w-full object-contain pointer-events-none drop-shadow-2xl"
                  />
                </div>
              ) : (
                /* Vector Phone Notch Frame */
                <div className="relative w-[240px] h-[360px] rounded-t-[36px] border-[6px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col items-center">
                  <div className="absolute top-2 h-4 w-20 rounded-full bg-black/90 z-20" />
                  <div className="relative flex-1 w-full overflow-hidden pt-6 bg-slate-950">
                    {currentSlide.imageUrl ? (
                      <img
                        src={currentSlide.imageUrl}
                        alt="App Screenshot"
                        className="h-full w-full"
                        style={{
                          objectFit: imageObjectFit,
                          transform: `scale(${imageZoomScale}) translate(${imageOffsetX}px, ${imageOffsetY}px)`,
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-500">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-50 text-teal-400" />
                        <span className="text-xs font-medium text-slate-400">Upload App Screenshot</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 text-white shadow-xl">
          {/* Inspector Header Tabs */}
          <div className="flex items-center gap-1 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'text' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              Content & Text
            </button>
            <button
              onClick={() => setActiveTab('device')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'device' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mockup Framing
            </button>
            <button
              onClick={() => setActiveTab('alignment')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'alignment' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignCenter className="h-3.5 w-3.5" />
              Fit & Adjust
            </button>
          </div>

          {/* Tab 1: Text & Content */}
          {activeTab === 'text' ? (
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
                  placeholder="e.g. Top Rated, 100% Secure..."
                  className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Background Preset</label>
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
                      className="h-8 rounded-md border border-white/20 shadow transition hover:scale-105"
                      style={{ background: g }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Tab 2: Device Mockups */}
          {activeTab === 'device' ? (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-400">Select Mockup Style & Angle</label>
              <div className="grid grid-cols-1 gap-2">
                {DEVICE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => updateSlide(activeSlideIndex, { frameType: preset.id })}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      currentSlide.frameType === preset.id
                        ? 'border-teal-400 bg-teal-500/15 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {preset.overlay ? (
                      <img src={preset.overlay} alt="" className="h-9 w-9 object-contain bg-black/40 rounded-md p-1" />
                    ) : (
                      <Smartphone className="h-8 w-8 text-teal-400 p-1" />
                    )}
                    <span className="text-xs">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Tab 3: Image Alignment & Scaling */}
          {activeTab === 'alignment' ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Text Alignment</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateSlide(activeSlideIndex, { textAlign: 'left' })}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium ${
                      currentSlide.textAlign === 'left'
                        ? 'border-teal-400 bg-teal-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <AlignLeft className="h-4 w-4" /> Left
                  </button>
                  <button
                    onClick={() => updateSlide(activeSlideIndex, { textAlign: 'center' })}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium ${
                      currentSlide.textAlign === 'center' || !currentSlide.textAlign
                        ? 'border-teal-400 bg-teal-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <AlignCenter className="h-4 w-4" /> Center
                  </button>
                  <button
                    onClick={() => updateSlide(activeSlideIndex, { textAlign: 'right' })}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium ${
                      currentSlide.textAlign === 'right'
                        ? 'border-teal-400 bg-teal-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <AlignRight className="h-4 w-4" /> Right
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Image Object Fit Mode
                </label>
                <div className="flex items-center gap-2">
                  {(['cover', 'contain', 'fill'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSlide(activeSlideIndex, { imageFit: mode })}
                      className={`flex-1 capitalize rounded-lg border p-2 text-xs font-medium ${
                        imageObjectFit === mode
                          ? 'border-teal-400 bg-teal-500/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <ZoomIn className="h-3.5 w-3.5 text-teal-400" /> Zoom Scale
                  </label>
                  <span className="text-xs font-mono text-teal-300">{currentSlide.imageZoom ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={currentSlide.imageZoom ?? 100}
                  onChange={(e) => updateSlide(activeSlideIndex, { imageZoom: Number(e.target.value) })}
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Move className="h-3.5 w-3.5 text-teal-400" /> Offset X
                  </label>
                  <span className="text-xs font-mono text-teal-300">{imageOffsetX}px</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={imageOffsetX}
                  onChange={(e) => updateSlide(activeSlideIndex, { imageOffsetX: Number(e.target.value) })}
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Maximize2 className="h-3.5 w-3.5 text-teal-400" /> Offset Y
                  </label>
                  <span className="text-xs font-mono text-teal-300">{imageOffsetY}px</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={imageOffsetY}
                  onChange={(e) => updateSlide(activeSlideIndex, { imageOffsetY: Number(e.target.value) })}
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Upload Screenshot Image</label>
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
