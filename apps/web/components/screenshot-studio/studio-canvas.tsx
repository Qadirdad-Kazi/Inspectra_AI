'use client';

import { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Pin,
  Minus,
} from 'lucide-react';
import { StudioFloatingToolbar } from './studio-floating-toolbar';

export type DeviceStyle =
  | 'iphone-17-a'
  | 'iphone-17-b'
  | 'iphone-17-c'
  | 'iphone-17-d'
  | 'iphone-17-e'
  | 'iphone-17-f'
  | 'tilted-hand'
  | 'browser-window';

export interface CanvasElement {
  id: string;
  type: 'device' | 'headline' | 'subhead' | 'badge' | 'shape' | 'icon';
  x: number; // %
  y: number; // %
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  shapeType?: string;
  iconId?: string;
  deviceStyle?: DeviceStyle;
  imageUrl?: string;
  shadowOpacity?: number;
  zIndex?: number;
}

export interface ArtboardScreen {
  id: string;
  name: string;
  backgroundColor: string;
  gradientBackground?: string;
  textColor: string;
  elements: CanvasElement[];
  widthPx?: number;
  heightPx?: number;
}

export const DEVICE_PRESETS: { id: DeviceStyle; label: string; overlay: string }[] = [
  { id: 'iphone-17-a', label: '17 Pro · Upright', overlay: '/mockups/iphone-17-a.webp' },
  { id: 'iphone-17-b', label: '17 Pro · Front', overlay: '/mockups/iphone-17-b.webp' },
  { id: 'iphone-17-c', label: '17 Pro · Right Angle', overlay: '/mockups/iphone-17-c.webp' },
  { id: 'iphone-17-d', label: '17 Pro · Left Angle', overlay: '/mockups/iphone-17-d.webp' },
  { id: 'iphone-17-e', label: '17 Pro · Flat Perspective', overlay: '/mockups/iphone-17-e.webp' },
  { id: 'iphone-17-f', label: '17 Pro · Leaning', overlay: '/mockups/iphone-17-f.webp' },
  { id: 'tilted-hand', label: 'Hand · Tilted', overlay: '/mockups/tilted-hand.webp' },
  { id: 'browser-window', label: 'Desktop Browser Frame', overlay: '' },
];

export const INITIAL_SCREENS: ArtboardScreen[] = [
  {
    id: 'screen-1',
    name: '01 Screen 1',
    backgroundColor: '#0f172a',
    gradientBackground: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    widthPx: 1290,
    heightPx: 2796,
    elements: [
      {
        id: 'el-badge',
        type: 'badge',
        x: 50,
        y: 8,
        text: 'Polished screenshots',
        color: '#ffffff',
      },
      {
        id: 'el-headline',
        type: 'headline',
        x: 50,
        y: 18,
        text: 'Your best work, beautifully framed.',
        color: '#ffffff',
        fontSize: 24,
      },
      {
        id: 'el-subhead',
        type: 'subhead',
        x: 50,
        y: 30,
        text: 'Polished screenshots without the design bottleneck.',
        color: '#cbd5e1',
        fontSize: 14,
      },
      {
        id: 'el-device',
        type: 'device',
        x: 50,
        y: 65,
        deviceStyle: 'tilted-hand',
        shadowOpacity: 55,
      },
    ],
  },
];

interface StudioCanvasProps {
  screens: ArtboardScreen[];
  setScreens: React.Dispatch<React.SetStateAction<ArtboardScreen[]>>;
  activeScreenIndex: number;
  setActiveScreenIndex: (idx: number) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
}

export function StudioCanvas({
  screens,
  setScreens,
  activeScreenIndex,
  setActiveScreenIndex,
  selectedElementId,
  setSelectedElementId,
}: StudioCanvasProps) {
  const [zoomLevel, setZoomLevel] = useState(90);
  const activeScreen = screens[activeScreenIndex] ?? screens[0] ?? INITIAL_SCREENS[0];

  const activeElement = activeScreen?.elements.find((el) => el.id === selectedElementId);

  // Screen level actions
  const handleAddScreen = () => {
    const newIdx = screens.length + 1;
    const newScreen: ArtboardScreen = {
      id: `screen-${Date.now()}`,
      name: `0${newIdx} Screen ${newIdx}`,
      backgroundColor: '#020617',
      gradientBackground: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)',
      textColor: '#ffffff',
      widthPx: 1290,
      heightPx: 2796,
      elements: [
        {
          id: `el-head-${Date.now()}`,
          type: 'headline',
          x: 50,
          y: 20,
          text: 'Build visuals that sell.',
          color: '#ffffff',
          fontSize: 24,
        },
        {
          id: `el-dev-${Date.now()}`,
          type: 'device',
          x: 50,
          y: 65,
          deviceStyle: 'iphone-17-a',
          shadowOpacity: 55,
        },
      ],
    };
    setScreens([...screens, newScreen]);
    setActiveScreenIndex(screens.length);
  };

  const handleDuplicateScreen = (idx: number) => {
    const source = screens[idx];
    if (!source) return;
    const dup: ArtboardScreen = {
      ...source,
      id: `screen-${Date.now()}`,
      name: `${source.name} (Copy)`,
      elements: source.elements.map((el) => ({ ...el, id: `${el.id}-copy` })),
    };
    const next = [...screens];
    next.splice(idx + 1, 0, dup);
    setScreens(next);
    setActiveScreenIndex(idx + 1);
  };

  const handleDeleteScreen = (idx: number) => {
    if (screens.length <= 1) return;
    const next = screens.filter((_, i) => i !== idx);
    setScreens(next);
    setActiveScreenIndex(Math.max(0, idx - 1));
  };

  const handleMoveScreen = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= screens.length) return;
    const next = [...screens];
    const temp = next[idx];
    const dest = next[targetIdx];
    if (temp && dest) {
      next[idx] = dest;
      next[targetIdx] = temp;
      setScreens(next);
      setActiveScreenIndex(targetIdx);
    }
  };

  // Element operations
  const updateElement = (elId: string, patch: Partial<CanvasElement>) => {
    setScreens((prev) =>
      prev.map((sc, sIdx) => {
        if (sIdx !== activeScreenIndex) return sc;
        return {
          ...sc,
          elements: sc.elements.map((el) => (el.id === elId ? { ...el, ...patch } : el)),
        };
      })
    );
  };

  const handleDeleteElement = (elId: string) => {
    setScreens((prev) =>
      prev.map((sc, sIdx) => {
        if (sIdx !== activeScreenIndex) return sc;
        return {
          ...sc,
          elements: sc.elements.filter((el) => el.id !== elId),
        };
      })
    );
    setSelectedElementId(null);
  };

  const handleDuplicateElement = (elId: string) => {
    const sourceEl = activeScreen?.elements.find((el) => el.id === elId);
    if (!sourceEl) return;
    const dupEl: CanvasElement = {
      ...sourceEl,
      id: `el-${Date.now()}`,
      x: Math.min(85, sourceEl.x + 5),
      y: Math.min(85, sourceEl.y + 5),
    };
    setScreens((prev) =>
      prev.map((sc, sIdx) => {
        if (sIdx !== activeScreenIndex) return sc;
        return { ...sc, elements: [...sc.elements, dupEl] };
      })
    );
    setSelectedElementId(dupEl.id);
  };

  return (
    <div className="relative flex flex-col gap-6">
      {/* Floating Context Toolbar for Selected Object */}
      {activeElement ? (
        <div className="sticky top-0 z-30 flex justify-center py-2">
          <StudioFloatingToolbar
            selectedDeviceStyle={activeElement.deviceStyle || 'tilted-hand'}
            onChangeDeviceStyle={(style) => updateElement(activeElement.id, { deviceStyle: style })}
            onUploadScreenshot={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  updateElement(activeElement.id, { imageUrl: url });
                }
              };
              input.click();
            }}
            shadowOpacity={activeElement.shadowOpacity ?? 55}
            onChangeShadowOpacity={(opacity) => updateElement(activeElement.id, { shadowOpacity: opacity })}
            onDuplicate={() => handleDuplicateElement(activeElement.id)}
            onBringForward={() => updateElement(activeElement.id, { y: Math.max(5, activeElement.y - 4) })}
            onSendBackward={() => updateElement(activeElement.id, { y: Math.min(90, activeElement.y + 4) })}
            onDelete={() => handleDeleteElement(activeElement.id)}
          />
        </div>
      ) : null}

      {/* Multi-Artboard Scrollable Workspace */}
      <div className="relative flex items-start gap-8 overflow-x-auto p-6 scrollbar-thin scrollbar-thumb-white/10 min-h-[640px] rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl">
        {screens.map((screen, sIdx) => {
          const isActiveScreen = activeScreenIndex === sIdx;
          return (
            <div
              key={screen.id}
              onClick={() => setActiveScreenIndex(sIdx)}
              className="flex flex-col items-center gap-3 shrink-0"
            >
              {/* Screen Top Header Controls */}
              <div className="flex items-center justify-between w-[340px] px-2 py-1 text-xs text-slate-400">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Pin className="h-3 w-3 text-teal-400 opacity-60" />
                  {screen.name}
                </span>

                <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScreen(sIdx, 'left');
                    }}
                    title="Move Left"
                    className="p-1 hover:text-white rounded"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveScreen(sIdx, 'right');
                    }}
                    title="Move Right"
                    className="p-1 hover:text-white rounded"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateScreen(sIdx);
                    }}
                    title="Duplicate Screen"
                    className="p-1 hover:text-white rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  {screens.length > 1 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScreen(sIdx);
                      }}
                      title="Delete Screen"
                      className="p-1 text-red-400 hover:text-red-300 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Artboard Frame Container */}
              <div
                className={`relative flex flex-col items-center justify-between overflow-hidden rounded-3xl p-6 shadow-2xl transition-all duration-200 w-[340px] h-[640px] border ${
                  isActiveScreen
                    ? 'border-teal-400/80 ring-4 ring-teal-400/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{
                  background: screen.gradientBackground || screen.backgroundColor,
                  color: screen.textColor,
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                {/* Screen Canvas Elements */}
                {screen.elements.map((el) => {
                  const isSelected = selectedElementId === el.id && isActiveScreen;

                  if (el.type === 'badge') {
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        className={`cursor-pointer rounded-full bg-white/20 px-3.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md border border-white/20 transition ${
                          isSelected ? 'ring-2 ring-teal-400 bg-white/30' : 'hover:bg-white/30'
                        }`}
                      >
                        {el.text || 'Badge Tagline'}
                      </div>
                    );
                  }

                  if (el.type === 'headline') {
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        className={`cursor-pointer text-center font-extrabold tracking-tight leading-snug drop-shadow-md px-2 py-1 transition rounded-lg ${
                          isSelected ? 'ring-2 ring-teal-400 bg-white/10' : 'hover:bg-white/5'
                        }`}
                        style={{ fontSize: `${el.fontSize || 22}px`, color: el.color || '#ffffff' }}
                      >
                        {el.text || 'Your Headline Here'}
                      </div>
                    );
                  }

                  if (el.type === 'subhead') {
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        className={`cursor-pointer text-center text-xs font-medium text-white/80 max-w-[280px] px-2 py-1 transition rounded-lg ${
                          isSelected ? 'ring-2 ring-teal-400 bg-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        {el.text || 'Add your key feature or value proposition.'}
                      </div>
                    );
                  }

                  if (el.type === 'device') {
                    const preset = DEVICE_PRESETS.find((p) => p.id === el.deviceStyle) ?? DEVICE_PRESETS[0];

                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        className={`relative cursor-pointer transition rounded-3xl p-1 ${
                          isSelected ? 'ring-4 ring-teal-400/80 bg-teal-500/10' : 'hover:opacity-95'
                        }`}
                      >
                        {preset?.overlay ? (
                          <div className="relative w-[280px] h-[360px] flex items-center justify-center overflow-hidden">
                            {/* Screen Mask Content */}
                            <div className="absolute inset-x-8 top-10 bottom-6 overflow-hidden rounded-[26px] bg-slate-950 z-0">
                              {el.imageUrl ? (
                                <img
                                  src={el.imageUrl}
                                  alt="Screenshot"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-slate-500">
                                  <ImageIcon className="h-8 w-8 mb-1 opacity-50 text-teal-400" />
                                  <span className="text-[10px] font-medium text-slate-400">Click to add screenshot</span>
                                </div>
                              )}
                            </div>

                            {/* Device Frame Overlay */}
                            <img
                              src={preset?.overlay || ''}
                              alt={preset?.label || 'Mockup'}
                              className="relative z-10 h-full w-full object-contain pointer-events-none drop-shadow-2xl"
                              style={{
                                filter: `drop-shadow(0 20px 30px rgba(0,0,0,${(el.shadowOpacity ?? 55) / 100}))`,
                              }}
                            />
                          </div>
                        ) : (
                          /* Browser Window Frame */
                          <div className="relative w-[280px] h-[280px] rounded-t-xl border border-white/20 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
                            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 border-b border-white/10">
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                            </div>
                            <div className="flex-1 bg-slate-950 overflow-hidden">
                              {el.imageUrl ? (
                                <img src={el.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                  Upload Web App Screenshot
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Bottom Screen Specs */}
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                {screen.widthPx || 1290} × {screen.heightPx || 2796} px
              </div>
            </div>
          );
        })}

        {/* Add Blank Artboard Screen Button */}
        <div className="flex flex-col items-center justify-center shrink-0 w-[340px] h-[640px] mt-8 rounded-3xl border-2 border-dashed border-white/20 bg-slate-900/40 p-8 text-center transition hover:border-teal-400/60 hover:bg-slate-900/60">
          <button
            onClick={handleAddScreen}
            className="flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-white"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Plus className="h-8 w-8" />
            </div>
            <span className="text-sm font-bold">Add screen</span>
            <span className="text-xs text-slate-500">New blank artboard</span>
          </button>
        </div>
      </div>

      {/* Canvas Bottom Right Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-white backdrop-blur-md shadow-xl">
        <button
          onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
          className="p-1 text-slate-400 hover:text-white rounded"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="font-mono text-xs text-teal-300 font-bold w-12 text-center">{zoomLevel}%</span>
        <button
          onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
          className="p-1 text-slate-400 hover:text-white rounded"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
