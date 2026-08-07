'use client';

import { useState } from 'react';
import {
  Rocket,
  Smartphone,
  Shapes,
  Sparkles,
  Type,
  Palette,
  Upload,
  Layers,
  Search,
  CheckCircle2,
  Star,
  Heart,
  ThumbsUp,
  Trophy,
  Bell,
  Mail,
  MessageSquare,
  Phone,
  ImageIcon,
  Play,
  Music,
  Mic,
  Eye,
  Lock,
  Plus,
  Circle,
  Square,
  Triangle,
  Diamond,
  Zap,
  Flame,
  Activity,
  ArrowRight,
  TrendingUp,
  Check,
  Minus,
} from 'lucide-react';
import { type DeviceStyle, DEVICE_PRESETS } from './studio-canvas';

export type SidebarTab =
  | 'templates'
  | 'mockups'
  | 'elements'
  | 'icons'
  | 'text'
  | 'background'
  | 'uploads'
  | 'layers';

export interface TemplatePreset {
  id: string;
  name: string;
  subtitle: string;
  backgroundColor: string;
  gradientBackground: string;
  textColor: string;
  previewClass: string;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'midnight-pitch',
    name: 'Midnight pitch',
    subtitle: 'Bold / product',
    backgroundColor: '#0f172a',
    gradientBackground: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    previewClass: 'from-slate-900 to-indigo-950',
  },
  {
    id: 'editorial-calm',
    name: 'Editorial calm',
    subtitle: 'Soft / premium',
    backgroundColor: '#f5f5f4',
    gradientBackground: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
    textColor: '#1c1917',
    previewClass: 'from-stone-100 to-stone-200 text-stone-900',
  },
  {
    id: 'electric-launch',
    name: 'Electric launch',
    subtitle: 'Bright / energetic',
    backgroundColor: '#ccff00',
    gradientBackground: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
    textColor: '#0f172a',
    previewClass: 'from-lime-400 to-lime-500 text-slate-950',
  },
  {
    id: 'ocean-glass',
    name: 'Ocean glass',
    subtitle: 'Cool / SaaS',
    backgroundColor: '#0c4a6e',
    gradientBackground: 'linear-gradient(160deg, #082f49 0%, #0e7490 100%)',
    textColor: '#ffffff',
    previewClass: 'from-sky-950 to-cyan-700',
  },
  {
    id: 'noir-gold',
    name: 'Noir gold',
    subtitle: 'Luxury / dark',
    backgroundColor: '#18181b',
    gradientBackground: 'linear-gradient(160deg, #09090b 0%, #422006 100%)',
    textColor: '#fef3c7',
    previewClass: 'from-zinc-950 to-amber-950 text-amber-100',
  },
];

export const BACKGROUND_PRESETS = [
  { name: 'Deep Space', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: '#0f172a' },
  { name: 'Midnight Cyber', gradient: 'linear-gradient(135deg, #020617 0%, #172554 100%)', color: '#020617' },
  { name: 'Emerald Glass', gradient: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)', color: '#090d16' },
  { name: 'Velvet Purple', gradient: 'linear-gradient(135deg, #111827 0%, #4c1d95 100%)', color: '#111827' },
  { name: 'Sunset Glow', gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', color: '#7c2d12' },
  { name: 'Clean Light', gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', color: '#f8fafc' },
];

export const SOLID_COLORS = [
  '#0f172a', '#020617', '#111827', '#18181b', '#090d16',
  '#2563eb', '#0d9488', '#059669', '#7c3aed', '#db2777',
  '#ea580c', '#ca8a04', '#ffffff', '#f1f5f9', '#94a3b8',
];

export const VECTOR_SHAPES = [
  { id: 'circle', label: 'Circle', category: 'Base', icon: Circle },
  { id: 'square', label: 'Square', category: 'Base', icon: Square },
  { id: 'soft-square', label: 'Soft square', category: 'Base', icon: Square },
  { id: 'pill', label: 'Pill', category: 'Base', icon: Circle },
  { id: 'triangle', label: 'Triangle', category: 'Base', icon: Triangle },
  { id: 'diamond', label: 'Diamond', category: 'Base', icon: Diamond },
  { id: 'star', label: 'Star', category: 'Accent', icon: Star },
  { id: 'burst', label: 'Burst', category: 'Accent', icon: Zap },
  { id: 'spark', label: 'Spark', category: 'Accent', icon: Flame },
  { id: 'blob', label: 'Blob', category: 'Accent', icon: Activity },
  { id: 'ring', label: 'Ring', category: 'Accent', icon: Circle },
  { id: 'line', label: 'Line', category: 'Lines', icon: Minus },
  { id: 'arrow', label: 'Arrow', category: 'Lines', icon: ArrowRight },
  { id: 'wave', label: 'Wave', category: 'Lines', icon: TrendingUp },
];

export const VECTOR_ICONS = [
  { id: 'check', name: 'Check', icon: CheckCircle2, category: 'Status' },
  { id: 'star', name: 'Star', icon: Star, category: 'Social Proof' },
  { id: 'heart', name: 'Heart', icon: Heart, category: 'Social Proof' },
  { id: 'thumb', name: 'Like', icon: ThumbsUp, category: 'Social Proof' },
  { id: 'trophy', name: 'Trophy', icon: Trophy, category: 'Social Proof' },
  { id: 'bell', name: 'Bell', icon: Bell, category: 'Communication' },
  { id: 'mail', name: 'Mail', icon: Mail, category: 'Communication' },
  { id: 'chat', name: 'Chat', icon: MessageSquare, category: 'Communication' },
  { id: 'phone', name: 'Phone', icon: Phone, category: 'Communication' },
  { id: 'image', name: 'Image', icon: ImageIcon, category: 'Media' },
  { id: 'play', name: 'Play', icon: Play, category: 'Media' },
  { id: 'music', name: 'Music', icon: Music, category: 'Media' },
  { id: 'mic', name: 'Mic', icon: Mic, category: 'Media' },
  { id: 'eye', name: 'Eye', icon: Eye, category: 'Media' },
  { id: 'lock', name: 'Lock', icon: Lock, category: 'Status' },
  { id: 'sparkles', name: 'Sparkles', icon: Sparkles, category: 'Status' },
];

interface StudioSidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  onApplyTemplate: (t: TemplatePreset) => void;
  onAddMockup: (style: DeviceStyle) => void;
  onAddShape: (shapeId: string) => void;
  onAddIcon: (iconId: string) => void;
  onAddText: (type: 'headline' | 'subhead' | 'badge') => void;
  onApplyBackground: (bg: { gradient?: string; color?: string }) => void;
  onUploadImage: (file: File) => void;
}

export function StudioSidebar({
  activeTab,
  setActiveTab,
  onApplyTemplate,
  onAddMockup,
  onAddShape,
  onAddIcon,
  onAddText,
  onApplyBackground,
  onUploadImage,
}: StudioSidebarProps) {
  const [iconSearch, setIconSearch] = useState('');

  const filteredIcons = VECTOR_ICONS.filter((item) =>
    item.name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[640px] rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
      {/* Left Icon Rail Bar */}
      <div className="flex w-16 flex-col items-center gap-1 border-r border-white/10 bg-slate-950 p-2 py-4">
        {[
          { id: 'templates' as SidebarTab, label: 'Templates', icon: Rocket },
          { id: 'mockups' as SidebarTab, label: 'Mockups', icon: Smartphone },
          { id: 'elements' as SidebarTab, label: 'Elements', icon: Shapes },
          { id: 'icons' as SidebarTab, label: 'Icons', icon: Sparkles },
          { id: 'text' as SidebarTab, label: 'Text', icon: Type },
          { id: 'background' as SidebarTab, label: 'Background', icon: Palette },
          { id: 'uploads' as SidebarTab, label: 'Uploads', icon: Upload },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl text-[10px] font-medium transition ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-lg shadow-teal-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-4 border-t border-white/10 w-full flex justify-center">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl text-[10px] font-medium transition ${
              activeTab === 'layers'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Layers</span>
          </button>
        </div>
      </div>

      {/* Drawer Content Panel */}
      <div className="w-64 flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
        {/* TEMPLATES TAB */}
        {activeTab === 'templates' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STARTING POINT</span>
              <h3 className="text-lg font-bold text-white">Templates</h3>
              <p className="text-xs text-slate-400">A look you can make your own in seconds.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TEMPLATE_PRESETS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onApplyTemplate(t)}
                  className={`group relative flex flex-col justify-between rounded-xl border border-white/15 p-3 text-left transition hover:scale-[1.02] shadow-md h-36 bg-gradient-to-br ${t.previewClass}`}
                >
                  <div className="font-extrabold text-xs leading-tight drop-shadow">{t.name}</div>
                  <div className="flex items-center justify-between text-[10px] opacity-80">
                    <span>{t.subtitle}</span>
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 bg-white/5 p-2.5 rounded-lg border border-white/10">
              Templates apply to the selected screen and replace its current theme & layout.
            </p>
          </div>
        ) : null}

        {/* MOCKUPS TAB */}
        {activeTab === 'mockups' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DEVICES</span>
              <h3 className="text-lg font-bold text-white">Mockups</h3>
              <p className="text-xs text-slate-400">Realistic frames with clean screenshot masks.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {DEVICE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onAddMockup(p.id)}
                  className="flex flex-col items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-center transition hover:border-teal-500/50 hover:bg-slate-950"
                >
                  {p.overlay ? (
                    <img src={p.overlay} alt={p.label} className="h-16 w-16 object-contain" />
                  ) : (
                    <Smartphone className="h-12 w-12 text-teal-400 p-2" />
                  )}
                  <span className="text-[11px] font-medium text-slate-300">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ELEMENTS TAB */}
        {activeTab === 'elements' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VECTORS</span>
              <h3 className="text-lg font-bold text-white">Elements</h3>
              <p className="text-xs text-slate-400">Shapes, accents, arrows, and lines for clearer stories.</p>
            </div>

            {['Base', 'Accent', 'Lines'].map((category) => (
              <div key={category} className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400">{category}</span>
                <div className="grid grid-cols-3 gap-2">
                  {VECTOR_SHAPES.filter((s) => s.category === category).map((shape) => {
                    const ShapeIcon = shape.icon;
                    return (
                      <button
                        key={shape.id}
                        onClick={() => onAddShape(shape.id)}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-center transition hover:border-teal-500/50 hover:bg-slate-950"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-500/20 border border-teal-400/40 text-teal-300 shadow">
                          <ShapeIcon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] text-slate-300">{shape.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ICONS TAB */}
        {activeTab === 'icons' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VECTORS</span>
              <h3 className="text-lg font-bold text-white">Icons</h3>
              <p className="text-xs text-slate-400">Crisp vector icons for features, ratings, and accents.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search icons..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {filteredIcons.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onAddIcon(item.id)}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-2.5 text-center transition hover:border-teal-500/50 hover:bg-slate-950"
                  >
                    <IconComp className="h-5 w-5 text-teal-400" />
                    <span className="text-[9px] text-slate-400 truncate w-full">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* TEXT TAB */}
        {activeTab === 'text' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TYPOGRAPHY</span>
              <h3 className="text-lg font-bold text-white">Text</h3>
              <p className="text-xs text-slate-400">Click to add text blocks to your active screen.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onAddText('headline')}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-teal-500/50 hover:bg-white/10"
              >
                <div>
                  <div className="text-sm font-extrabold text-white">Add Headline</div>
                  <div className="text-[10px] text-slate-400">Large feature title</div>
                </div>
                <Plus className="h-4 w-4 text-teal-400" />
              </button>

              <button
                onClick={() => onAddText('subhead')}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-teal-500/50 hover:bg-white/10"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">Add Subtitle / Body</div>
                  <div className="text-[10px] text-slate-400">Supporting description line</div>
                </div>
                <Plus className="h-4 w-4 text-teal-400" />
              </button>

              <button
                onClick={() => onAddText('badge')}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-teal-500/50 hover:bg-white/10"
              >
                <div>
                  <div className="text-xs font-bold text-teal-300">Add Badge Tagline</div>
                  <div className="text-[10px] text-slate-400">Pill badge overlay</div>
                </div>
                <Plus className="h-4 w-4 text-teal-400" />
              </button>
            </div>
          </div>
        ) : null}

        {/* BACKGROUND TAB */}
        {activeTab === 'background' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CANVAS STYLING</span>
              <h3 className="text-lg font-bold text-white">Background</h3>
              <p className="text-xs text-slate-400">Apply vibrant gradients or solid colors to your screen.</p>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-300">Vibrant Gradients</span>
              <div className="grid grid-cols-2 gap-2">
                {BACKGROUND_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => onApplyBackground({ gradient: preset.gradient })}
                    className="flex flex-col justify-between h-16 rounded-xl border border-white/15 p-2 text-left shadow transition hover:scale-105"
                    style={{ background: preset.gradient }}
                  >
                    <span className="text-[10px] font-bold text-white drop-shadow">{preset.name}</span>
                    <Check className="h-3.5 w-3.5 text-white/70 self-end" />
                  </button>
                ))}
              </div>

              <span className="text-xs font-semibold text-slate-300 mt-2">Solid Colors</span>
              <div className="grid grid-cols-5 gap-2">
                {SOLID_COLORS.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => onApplyBackground({ color: c })}
                    className="h-8 rounded-lg border border-white/20 shadow transition hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* UPLOADS TAB */}
        {activeTab === 'uploads' ? (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ASSETS</span>
              <h3 className="text-lg font-bold text-white">Uploads</h3>
              <p className="text-xs text-slate-400">
                Uploads fill the screen of the selected device mockup (all frames).
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-slate-300 hover:bg-white/10">
              <Upload className="h-6 w-6 text-teal-400" />
              <span className="text-xs font-semibold">Upload into mockup screen</span>
              <span className="text-[10px] text-slate-500">PNG, JPG, WebP · clipped to device glass</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadImage(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
