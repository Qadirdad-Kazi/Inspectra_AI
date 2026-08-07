'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Image as ImageIcon,
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Minus,
  CheckCircle2,
  Star,
  Heart,
  ThumbsUp,
  Trophy,
  Bell,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Music,
  Mic,
  Eye,
  Lock,
  Sparkles,
  Circle,
  Square,
  Triangle,
  Diamond,
  Zap,
  Flame,
  Activity,
  ArrowRight as ArrowRightIcon,
  TrendingUp,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignLeft,
  AlignRight,
} from 'lucide-react';
import { StudioFloatingToolbar } from './studio-floating-toolbar';
import { matrix3dForQuad, quadToPixels, type Point } from './perspective';
import screenQuads from './screen-quads.json';

export type DeviceStyle =
  | 'iphone-17-a'
  | 'iphone-17-b'
  | 'iphone-17-c'
  | 'iphone-17-d'
  | 'iphone-17-e'
  | 'iphone-17-f'
  | 'tilted-hand'
  | 'browser-window'
  | 'android-pixel'
  | 'android-slim'
  | 'ipad-pro'
  | 'macbook';

export interface CanvasElement {
  id: string;
  type: 'device' | 'headline' | 'subhead' | 'badge' | 'shape' | 'icon';
  x: number;
  y: number;
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
  rotation?: number;
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

type DevicePreset = {
  id: DeviceStyle;
  label: string;
  overlay: string;
  /** Alpha mask of the screen hole (opaque = show screenshot) */
  screenMask?: string;
  /** Normalized screen corners TL, TR, BR, BL for perspective alignment */
  screenQuad?: Point[];
  kind: 'overlay' | 'css';
  /** Display box aspect hint */
  boxClass?: string;
};

function quadFor(id: string): Point[] | undefined {
  const entry = (screenQuads as Record<string, { quad: Point[] }>)[id];
  return entry?.quad;
}

/** Cache-bust regenerated alpha masks */
const MASK_VER = 'v2';

function maskUrl(id: string): string {
  return `/mockups/masks/${id}.png?${MASK_VER}`;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone-17-a',
    label: 'iPhone · Upright',
    overlay: '/mockups/iphone-17-a.webp',
    screenMask: maskUrl('iphone-17-a'),
    screenQuad: quadFor('iphone-17-a'),
    kind: 'overlay',
    boxClass: 'h-[380px] w-[185px]',
  },
  {
    id: 'iphone-17-b',
    label: 'iPhone · Front',
    overlay: '/mockups/iphone-17-b.webp',
    screenMask: maskUrl('iphone-17-b'),
    screenQuad: quadFor('iphone-17-b'),
    kind: 'overlay',
    boxClass: 'h-[380px] w-[183px]',
  },
  {
    id: 'iphone-17-c',
    label: 'iPhone · Right',
    overlay: '/mockups/iphone-17-c.webp',
    screenMask: maskUrl('iphone-17-c'),
    screenQuad: quadFor('iphone-17-c'),
    kind: 'overlay',
    boxClass: 'h-[300px] w-[330px]',
  },
  {
    id: 'iphone-17-d',
    label: 'iPhone · Left',
    overlay: '/mockups/iphone-17-d.webp',
    screenMask: maskUrl('iphone-17-d'),
    screenQuad: quadFor('iphone-17-d'),
    kind: 'overlay',
    boxClass: 'h-[290px] w-[340px]',
  },
  {
    id: 'iphone-17-e',
    label: 'iPhone · Flat',
    overlay: '/mockups/iphone-17-e.webp',
    screenMask: maskUrl('iphone-17-e'),
    screenQuad: quadFor('iphone-17-e'),
    kind: 'overlay',
    boxClass: 'h-[290px] w-[340px]',
  },
  {
    id: 'iphone-17-f',
    label: 'iPhone · Lean',
    overlay: '/mockups/iphone-17-f.webp',
    screenMask: maskUrl('iphone-17-f'),
    screenQuad: quadFor('iphone-17-f'),
    kind: 'overlay',
    boxClass: 'h-[300px] w-[300px]',
  },
  {
    id: 'tilted-hand',
    label: 'Hand · Tilted',
    overlay: '/mockups/tilted-hand.webp',
    screenMask: maskUrl('tilted-hand'),
    screenQuad: quadFor('tilted-hand'),
    kind: 'overlay',
    boxClass: 'h-[300px] w-[355px]',
  },
  { id: 'android-pixel', label: 'Android · Pixel', overlay: '', kind: 'css' },
  { id: 'android-slim', label: 'Android · Slim', overlay: '', kind: 'css' },
  { id: 'ipad-pro', label: 'iPad Pro', overlay: '', kind: 'css' },
  { id: 'macbook', label: 'MacBook', overlay: '', kind: 'css' },
  { id: 'browser-window', label: 'Browser Window', overlay: '', kind: 'css' },
];

export const INITIAL_SCREENS: ArtboardScreen[] = [
  {
    id: 'screen-1',
    name: '01 Hero',
    backgroundColor: '#0b1220',
    gradientBackground: 'linear-gradient(160deg, #0b1220 0%, #132033 45%, #1a2740 100%)',
    textColor: '#ffffff',
    widthPx: 1290,
    heightPx: 2796,
    elements: [
      {
        id: 'el-badge',
        type: 'badge',
        x: 50,
        y: 7,
        text: 'Store-ready frames',
        color: '#ffffff',
        zIndex: 5,
      },
      {
        id: 'el-headline',
        type: 'headline',
        x: 50,
        y: 14,
        text: 'Ship visuals that convert.',
        color: '#ffffff',
        fontSize: 22,
        zIndex: 5,
      },
      {
        id: 'el-subhead',
        type: 'subhead',
        x: 50,
        y: 22,
        text: 'Drag, align, and export polished App Store & Play screens.',
        color: '#94a3b8',
        fontSize: 12,
        zIndex: 5,
      },
      {
        id: 'el-device',
        type: 'device',
        x: 50,
        y: 68,
        deviceStyle: 'iphone-17-b',
        shadowOpacity: 55,
        zIndex: 2,
      },
    ],
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  check: CheckCircle2,
  star: Star,
  heart: Heart,
  thumb: ThumbsUp,
  trophy: Trophy,
  bell: Bell,
  mail: Mail,
  chat: MessageSquare,
  phone: Phone,
  image: ImageIcon,
  play: Play,
  music: Music,
  mic: Mic,
  eye: Eye,
  lock: Lock,
  sparkles: Sparkles,
};

const SHAPE_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  circle: Circle,
  square: Square,
  'soft-square': Square,
  pill: Circle,
  triangle: Triangle,
  diamond: Diamond,
  star: Star,
  burst: Zap,
  spark: Flame,
  blob: Activity,
  ring: Circle,
  line: Minus,
  arrow: ArrowRightIcon,
  wave: TrendingUp,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

interface StudioCanvasProps {
  screens: ArtboardScreen[];
  setScreens: React.Dispatch<React.SetStateAction<ArtboardScreen[]>>;
  activeScreenIndex: number;
  setActiveScreenIndex: (idx: number) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  platform?: 'ios' | 'android' | 'msstore' | 'web';
}

export function StudioCanvas({
  screens,
  setScreens,
  activeScreenIndex,
  setActiveScreenIndex,
  selectedElementId,
  setSelectedElementId,
}: StudioCanvasProps) {
  const [zoomLevel, setZoomLevel] = useState(88);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const artboardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const elementNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragRef = useRef<{
    elId: string;
    screenId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const activeScreen = screens[activeScreenIndex] ?? screens[0] ?? INITIAL_SCREENS[0]!;
  const activeElement = activeScreen?.elements.find((el) => el.id === selectedElementId);

  const updateElement = useCallback(
    (elId: string, patch: Partial<CanvasElement>, screenIndex = activeScreenIndex) => {
      setScreens((prev) =>
        prev.map((sc, sIdx) => {
          if (sIdx !== screenIndex) return sc;
          return {
            ...sc,
            elements: sc.elements.map((el) => (el.id === elId ? { ...el, ...patch } : el)),
          };
        }),
      );
    },
    [activeScreenIndex, setScreens],
  );

  // Smooth drag: move DOM live, commit React state only on release (no artboard flicker)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const board = artboardRefs.current[drag.screenId];
      const node = elementNodeRefs.current[drag.elId];
      if (!board || !node) return;

      const rect = board.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        drag.moved = true;
        setIsDragging(true);
      }

      const x = clamp(drag.origX + (dx / rect.width) * 100, 4, 96);
      const y = clamp(drag.origY + (dy / rect.height) * 100, 4, 96);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.dataset.dragX = String(x);
      node.dataset.dragY = String(y);
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const node = elementNodeRefs.current[drag.elId];
      if (drag.moved && node?.dataset.dragX && node?.dataset.dragY) {
        const x = Number(node.dataset.dragX);
        const y = Number(node.dataset.dragY);
        setScreens((prev) => {
          const screenIndex = prev.findIndex((s) => s.id === drag.screenId);
          if (screenIndex < 0) return prev;
          return prev.map((sc, sIdx) => {
            if (sIdx !== screenIndex) return sc;
            return {
              ...sc,
              elements: sc.elements.map((el) =>
                el.id === drag.elId ? { ...el, x, y } : el,
              ),
            };
          });
        });
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }

      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setScreens]);

  const handleAddScreen = () => {
    const newIdx = screens.length + 1;
    const newScreen: ArtboardScreen = {
      id: `screen-${Date.now()}`,
      name: `${String(newIdx).padStart(2, '0')} Screen ${newIdx}`,
      backgroundColor: '#020617',
      gradientBackground: 'linear-gradient(160deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
      textColor: '#ffffff',
      widthPx: 1290,
      heightPx: 2796,
      elements: [
        {
          id: `el-head-${Date.now()}`,
          type: 'headline',
          x: 50,
          y: 18,
          text: 'Build visuals that sell.',
          color: '#ffffff',
          fontSize: 24,
          zIndex: 3,
        },
        {
          id: `el-dev-${Date.now()}`,
          type: 'device',
          x: 50,
          y: 62,
          deviceStyle: 'iphone-17-a',
          shadowOpacity: 55,
          zIndex: 2,
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
      elements: source.elements.map((el) => ({
        ...el,
        id: `${el.id}-${Date.now()}`,
      })),
    };
    const next = [...screens];
    next.splice(idx + 1, 0, dup);
    setScreens(next);
    setActiveScreenIndex(idx + 1);
  };

  const handleDeleteScreen = (idx: number) => {
    if (screens.length <= 1) return;
    setScreens(screens.filter((_, i) => i !== idx));
    setActiveScreenIndex(Math.max(0, idx - 1));
  };

  const handleMoveScreen = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= screens.length) return;
    const next = [...screens];
    const a = next[idx];
    const b = next[targetIdx];
    if (!a || !b) return;
    next[idx] = b;
    next[targetIdx] = a;
    setScreens(next);
    setActiveScreenIndex(targetIdx);
  };

  const handleDeleteElement = (elId: string) => {
    setScreens((prev) =>
      prev.map((sc, sIdx) => {
        if (sIdx !== activeScreenIndex) return sc;
        return { ...sc, elements: sc.elements.filter((el) => el.id !== elId) };
      }),
    );
    setSelectedElementId(null);
  };

  const handleDuplicateElement = (elId: string) => {
    const sourceEl = activeScreen?.elements.find((el) => el.id === elId);
    if (!sourceEl) return;
    const dupEl: CanvasElement = {
      ...sourceEl,
      id: `el-${Date.now()}`,
      x: clamp(sourceEl.x + 4, 5, 95),
      y: clamp(sourceEl.y + 4, 5, 95),
      zIndex: (sourceEl.zIndex ?? 1) + 1,
    };
    setScreens((prev) =>
      prev.map((sc, sIdx) => {
        if (sIdx !== activeScreenIndex) return sc;
        return { ...sc, elements: [...sc.elements, dupEl] };
      }),
    );
    setSelectedElementId(dupEl.id);
  };

  const alignElement = (mode: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
    if (!selectedElementId) return;
    const map: Record<typeof mode, Partial<CanvasElement>> = {
      left: { x: 18 },
      'center-x': { x: 50 },
      right: { x: 82 },
      top: { y: 12 },
      'center-y': { y: 50 },
      bottom: { y: 88 },
    };
    updateElement(selectedElementId, map[mode]);
  };

  const onPointerDownElement = (
    e: ReactPointerEvent<HTMLDivElement>,
    screenId: string,
    elId: string,
    screenIndex: number,
    el: CanvasElement,
  ) => {
    if (editingTextId === elId) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveScreenIndex(screenIndex);
    setSelectedElementId(elId);
    dragRef.current = {
      elId,
      screenId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: el.x,
      origY: el.y,
      moved: false,
    };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedElementId || editingTextId || isDragging) return;
      const step = e.shiftKey ? 4 : 1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const el = activeScreen.elements.find((x) => x.id === selectedElementId);
        if (el) updateElement(selectedElementId, { x: clamp(el.x - step, 4, 96) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const el = activeScreen.elements.find((x) => x.id === selectedElementId);
        if (el) updateElement(selectedElementId, { x: clamp(el.x + step, 4, 96) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const el = activeScreen.elements.find((x) => x.id === selectedElementId);
        if (el) updateElement(selectedElementId, { y: clamp(el.y - step, 4, 96) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const el = activeScreen.elements.find((x) => x.id === selectedElementId);
        if (el) updateElement(selectedElementId, { y: clamp(el.y + step, 4, 96) });
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setEditingTextId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="relative flex flex-col gap-4 select-none">
      {/* Fixed inspector — never pushes the artboard */}
      {activeElement && !isDragging ? (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-[960px] flex-col items-center gap-2">
            <StudioFloatingToolbar
              selected={activeElement}
              onChangeDeviceStyle={(style) => updateElement(activeElement.id, { deviceStyle: style })}
              onUploadScreenshot={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  updateElement(activeElement.id, { imageUrl: url });
                };
                input.click();
              }}
              shadowOpacity={activeElement.shadowOpacity ?? 55}
              onChangeShadowOpacity={(opacity) =>
                updateElement(activeElement.id, { shadowOpacity: opacity })
              }
              onChangeText={(text) => updateElement(activeElement.id, { text })}
              onChangeFontSize={(fontSize) => updateElement(activeElement.id, { fontSize })}
              onChangeColor={(color) => updateElement(activeElement.id, { color })}
              onDuplicate={() => handleDuplicateElement(activeElement.id)}
              onBringForward={() =>
                updateElement(activeElement.id, {
                  zIndex: (activeElement.zIndex ?? 1) + 1,
                })
              }
              onSendBackward={() =>
                updateElement(activeElement.id, {
                  zIndex: Math.max(0, (activeElement.zIndex ?? 1) - 1),
                })
              }
              onDelete={() => handleDeleteElement(activeElement.id)}
              onClose={() => {
                setSelectedElementId(null);
                setEditingTextId(null);
              }}
            />
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/95 px-2 py-1 shadow-xl backdrop-blur-xl">
              <AlignBtn title="Align left" onClick={() => alignElement('left')}>
                <AlignLeft className="h-3.5 w-3.5" />
              </AlignBtn>
              <AlignBtn title="Center horizontally" onClick={() => alignElement('center-x')}>
                <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
              </AlignBtn>
              <AlignBtn title="Align right" onClick={() => alignElement('right')}>
                <AlignRight className="h-3.5 w-3.5" />
              </AlignBtn>
              <span className="mx-1 h-4 w-px bg-white/10" />
              <AlignBtn title="Align top" onClick={() => alignElement('top')}>
                <AlignVerticalJustifyCenter className="h-3.5 w-3.5 rotate-180" />
              </AlignBtn>
              <AlignBtn title="Center vertically" onClick={() => alignElement('center-y')}>
                <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
              </AlignBtn>
              <AlignBtn title="Align bottom" onClick={() => alignElement('bottom')}>
                <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
              </AlignBtn>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`relative flex items-start gap-8 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#070b14] p-6 min-h-[680px] ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {screens.map((screen, sIdx) => {
          const isActiveScreen = activeScreenIndex === sIdx;
          return (
            <div key={screen.id} className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex w-[360px] items-center justify-between px-1 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setActiveScreenIndex(sIdx)}
                  className={`font-semibold tracking-wide ${isActiveScreen ? 'text-white' : 'text-slate-400'}`}
                >
                  {screen.name}
                </button>
                <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-slate-950/80 p-1">
                  <IconBtn onClick={() => handleMoveScreen(sIdx, 'left')} title="Move left">
                    <ArrowLeft className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn onClick={() => handleMoveScreen(sIdx, 'right')} title="Move right">
                    <ArrowRight className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn onClick={() => handleDuplicateScreen(sIdx)} title="Duplicate">
                    <Copy className="h-3 w-3" />
                  </IconBtn>
                  {screens.length > 1 ? (
                    <IconBtn onClick={() => handleDeleteScreen(sIdx)} title="Delete" danger>
                      <Trash2 className="h-3 w-3" />
                    </IconBtn>
                  ) : null}
                </div>
              </div>

              <div
                data-artboard-id={screen.id}
                ref={(node) => {
                  artboardRefs.current[screen.id] = node;
                }}
                onClick={() => {
                  if (suppressClickRef.current || isDragging) return;
                  setActiveScreenIndex(sIdx);
                  setSelectedElementId(null);
                  setEditingTextId(null);
                }}
                className={`relative overflow-hidden rounded-[28px] border ${
                  isActiveScreen
                    ? 'border-cyan-400/70 shadow-[0_0_0_4px_rgba(34,211,238,0.12)]'
                    : 'border-white/10 hover:border-white/25'
                }`}
                style={{
                  width: 360,
                  height: 680,
                  background: screen.gradientBackground || screen.backgroundColor,
                  color: screen.textColor,
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {screen.elements.map((el) => {
                  const isSelected = selectedElementId === el.id && isActiveScreen;
                  return (
                    <div
                      key={el.id}
                      ref={(node) => {
                        elementNodeRefs.current[el.id] = node;
                      }}
                      onPointerDown={(e) => onPointerDownElement(e, screen.id, el.id, sIdx, el)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (el.type === 'headline' || el.type === 'subhead' || el.type === 'badge') {
                          setEditingTextId(el.id);
                        }
                      }}
                      className={`absolute touch-none will-change-[left,top] ${
                        isSelected
                          ? 'ring-2 ring-cyan-400/90 ring-offset-2 ring-offset-transparent'
                          : ''
                      } ${isDragging && selectedElementId === el.id ? 'cursor-grabbing z-[60]' : 'cursor-grab'}`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%) rotate(${el.rotation ?? 0}deg)`,
                        zIndex: el.zIndex ?? 1,
                      }}
                    >
                      <ElementView
                        el={el}
                        editing={editingTextId === el.id}
                        onCommitText={(text) => {
                          updateElement(el.id, { text }, sIdx);
                          setEditingTextId(null);
                        }}
                        onCancelEdit={() => setEditingTextId(null)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {screen.widthPx || 1290} × {screen.heightPx || 2796} px
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddScreen}
          className="mt-8 flex h-[680px] w-[360px] shrink-0 flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-white/15 bg-slate-950/40 text-slate-300 transition hover:border-cyan-400/50 hover:bg-slate-900/50 hover:text-white"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
            <Plus className="h-7 w-7" />
          </div>
          <span className="text-sm font-semibold">Add screen</span>
          <span className="text-xs text-slate-500">New blank artboard</span>
        </button>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-1.5 text-xs text-white backdrop-blur-md">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
          className="rounded p-1 text-slate-400 hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-12 text-center font-mono text-xs font-bold text-cyan-300">{zoomLevel}%</span>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
          className="rounded p-1 text-slate-400 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AlignBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded p-1 ${danger ? 'text-red-400 hover:text-red-300' : 'hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function ElementView({
  el,
  editing,
  onCommitText,
  onCancelEdit,
}: {
  el: CanvasElement;
  editing: boolean;
  onCommitText: (text: string) => void;
  onCancelEdit: () => void;
}) {
  if (el.type === 'badge' || el.type === 'headline' || el.type === 'subhead') {
    if (editing) {
      return (
        <input
          autoFocus
          defaultValue={el.text}
          onBlur={(e) => onCommitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitText((e.target as HTMLInputElement).value);
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="min-w-[160px] rounded-lg border border-cyan-400/50 bg-slate-950/90 px-2 py-1 text-center text-sm text-white outline-none"
          style={{ fontSize: el.fontSize ?? (el.type === 'headline' ? 24 : 13) }}
        />
      );
    }
    if (el.type === 'badge') {
      return (
        <div className="rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md">
          {el.text || 'Badge'}
        </div>
      );
    }
    if (el.type === 'headline') {
      return (
        <div
          className="max-w-[300px] text-center font-extrabold leading-snug tracking-tight"
          style={{ fontSize: el.fontSize || 24, color: el.color || '#fff' }}
        >
          {el.text || 'Headline'}
        </div>
      );
    }
    return (
      <div className="max-w-[280px] text-center text-xs font-medium text-white/75">
        {el.text || 'Subhead'}
      </div>
    );
  }

  if (el.type === 'shape') {
    const ShapeComp = SHAPE_MAP[el.shapeType || 'circle'] || Circle;
    return (
      <div className="flex items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 p-2 text-cyan-200">
        <ShapeComp className="h-8 w-8" />
      </div>
    );
  }

  if (el.type === 'icon') {
    const IconComp = ICON_MAP[el.iconId || 'sparkles'] || Sparkles;
    return (
      <div className="flex items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/15 p-2 text-cyan-200">
        <IconComp className="h-8 w-8" />
      </div>
    );
  }

  if (el.type === 'device') {
    return <DeviceMockup el={el} />;
  }

  return null;
}

function DeviceMockup({ el }: { el: CanvasElement }) {
  const preset = DEVICE_PRESETS.find((p) => p.id === el.deviceStyle) ?? DEVICE_PRESETS[0]!;
  const shadow = `drop-shadow(0 22px 28px rgba(0,0,0,${(el.shadowOpacity ?? 55) / 100}))`;

  if (preset.kind === 'overlay' && preset.overlay) {
    return (
      <OverlayDeviceMockup
        preset={preset}
        imageUrl={el.imageUrl}
        shadow={shadow}
      />
    );
  }

  if (el.deviceStyle === 'browser-window') {
    return (
      <div className="flex h-[260px] w-[300px] flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-800 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="h-2 w-2 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 overflow-hidden bg-slate-950">
          <ScreenContent imageUrl={el.imageUrl} label="Upload web screenshot" fill />
        </div>
      </div>
    );
  }

  if (el.deviceStyle === 'ipad-pro') {
    return (
      <div
        className="relative h-[320px] w-[250px] rounded-[22px] border-[10px] border-zinc-800 bg-zinc-900"
        style={{ filter: shadow }}
      >
        <div className="absolute inset-2 overflow-hidden rounded-[12px] bg-black">
          <ScreenContent imageUrl={el.imageUrl} fill />
        </div>
      </div>
    );
  }

  if (el.deviceStyle === 'macbook') {
    return (
      <div className="flex w-[320px] flex-col items-center" style={{ filter: shadow }}>
        <div className="w-full overflow-hidden rounded-t-lg border-[8px] border-b-0 border-zinc-700 bg-zinc-900">
          <div className="h-[190px] overflow-hidden bg-black">
            <ScreenContent imageUrl={el.imageUrl} fill />
          </div>
        </div>
        <div className="h-2 w-[340px] rounded-b-md bg-zinc-600" />
      </div>
    );
  }

  // Android CSS frames
  const slim = el.deviceStyle === 'android-slim';
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border-[8px] border-zinc-800 bg-zinc-950 ${
        slim ? 'h-[400px] w-[200px]' : 'h-[390px] w-[220px]'
      }`}
      style={{ filter: shadow }}
    >
      <div className="absolute left-1/2 top-2 z-20 h-1.5 w-16 -translate-x-1/2 rounded-full bg-zinc-700" />
      <div className="absolute inset-[6px] overflow-hidden rounded-[20px] bg-black">
        <ScreenContent imageUrl={el.imageUrl} fill />
      </div>
    </div>
  );
}

function OverlayDeviceMockup({
  preset,
  imageUrl,
  shadow,
}: {
  preset: DevicePreset;
  imageUrl?: string;
  shadow: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      // Use layout size (unscaled) so matrix matches CSS % box
      setBoxSize({ w: node.offsetWidth, h: node.offsetHeight });
      void rect;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const maskUrl = preset.screenMask;
  const maskStyle: CSSProperties | undefined = maskUrl
    ? {
        WebkitMaskImage: `url(${maskUrl})`,
        maskImage: `url(${maskUrl})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        maskMode: 'alpha',
      }
    : undefined;

  const quad = preset.screenQuad;
  const canWarp = Boolean(imageUrl && quad && boxSize.w > 0 && boxSize.h > 0);
  const transform =
    canWarp && quad
      ? matrix3dForQuad(boxSize.w, boxSize.h, quadToPixels(quad, boxSize.w, boxSize.h))
      : undefined;

  return (
    <div
      ref={boxRef}
      className={`relative overflow-hidden ${preset.boxClass || 'h-[360px] w-[240px]'}`}
    >
      {/* Screenshot: perspective-warped into the glass, then clipped by screen alpha mask */}
      <div className="absolute inset-0 z-0 overflow-hidden" style={maskStyle}>
        {imageUrl ? (
          canWarp ? (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 origin-top-left"
              style={{
                width: boxSize.w,
                height: boxSize.h,
                objectFit: 'cover',
                objectPosition: 'top center',
                transform,
                transformOrigin: '0 0',
                willChange: 'transform',
              }}
            />
          ) : (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-cover object-top"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900/90 p-4 text-center">
            <ImageIcon className="h-7 w-7 text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-100">Add screenshot</span>
            <span className="text-[9px] text-slate-500">Select device → Upload in toolbar</span>
          </div>
        )}
      </div>
      <img
        src={preset.overlay}
        alt={preset.label}
        draggable={false}
        className="pointer-events-none relative z-10 h-full w-full select-none"
        style={{ filter: shadow }}
      />
    </div>
  );
}

function ScreenContent({
  imageUrl,
  label,
  fill,
}: {
  imageUrl?: string;
  label?: string;
  fill?: boolean;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        className={fill ? 'h-full w-full object-cover object-top' : 'h-full w-full object-cover'}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-cyan-500/30 bg-slate-900/90 p-4 text-center ${
        fill ? 'min-h-full' : ''
      }`}
    >
      <ImageIcon className="h-7 w-7 text-cyan-400" />
      <span className="text-[11px] font-bold text-cyan-100">{label || 'Add screenshot'}</span>
      <span className="text-[9px] text-slate-500">Select device → Upload in toolbar</span>
    </div>
  );
}
