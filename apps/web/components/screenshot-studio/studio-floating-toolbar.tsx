'use client';

import {
  Copy,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  Smartphone,
  Type,
  X,
} from 'lucide-react';
import { type CanvasElement, type DeviceStyle, DEVICE_PRESETS } from './studio-canvas';

interface StudioFloatingToolbarProps {
  selected: CanvasElement;
  onChangeDeviceStyle: (style: DeviceStyle) => void;
  onUploadScreenshot: () => void;
  shadowOpacity: number;
  onChangeShadowOpacity: (n: number) => void;
  onChangeText?: (text: string) => void;
  onChangeFontSize?: (n: number) => void;
  onChangeColor?: (color: string) => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

export function StudioFloatingToolbar({
  selected,
  onChangeDeviceStyle,
  onUploadScreenshot,
  shadowOpacity,
  onChangeShadowOpacity,
  onChangeText,
  onChangeFontSize,
  onChangeColor,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onDelete,
  onClose,
}: StudioFloatingToolbarProps) {
  const isDevice = selected.type === 'device';
  const isText =
    selected.type === 'headline' || selected.type === 'subhead' || selected.type === 'badge';

  return (
    <div className="flex max-w-[920px] flex-wrap items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/95 px-3 py-2.5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mr-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
        {isDevice ? 'Device' : isText ? 'Text' : selected.type}
      </div>

      {isDevice ? (
        <>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            <select
              value={selected.deviceStyle || 'iphone-17-b'}
              onChange={(e) => onChangeDeviceStyle(e.target.value as DeviceStyle)}
              className="max-w-[170px] rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500/60"
            >
              {DEVICE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onUploadScreenshot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload screenshot
          </button>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
            Shadow
            <input
              type="range"
              min={0}
              max={100}
              value={shadowOpacity}
              onChange={(e) => onChangeShadowOpacity(Number(e.target.value))}
              className="w-20 accent-cyan-400"
            />
          </label>
        </>
      ) : null}

      {isText ? (
        <>
          <Type className="h-3.5 w-3.5 text-cyan-400" />
          <input
            value={selected.text || ''}
            onChange={(e) => onChangeText?.(e.target.value)}
            className="min-w-[180px] rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500/60"
            placeholder="Edit text…"
          />
          <input
            type="number"
            min={10}
            max={48}
            value={selected.fontSize || 16}
            onChange={(e) => onChangeFontSize?.(Number(e.target.value))}
            className="w-14 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none"
            title="Font size"
          />
          <input
            type="color"
            value={selected.color || '#ffffff'}
            onChange={(e) => onChangeColor?.(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-lg border border-white/10 bg-transparent"
            title="Text color"
          />
        </>
      ) : null}

      <div className="ml-auto flex items-center gap-0.5">
        <Tb onClick={onBringForward} title="Bring forward">
          <ArrowUp className="h-3.5 w-3.5" />
        </Tb>
        <Tb onClick={onSendBackward} title="Send backward">
          <ArrowDown className="h-3.5 w-3.5" />
        </Tb>
        <Tb onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </Tb>
        <Tb onClick={onDelete} title="Delete" danger>
          <Trash2 className="h-3.5 w-3.5" />
        </Tb>
        {onClose ? (
          <Tb onClick={onClose} title="Deselect">
            <X className="h-3.5 w-3.5" />
          </Tb>
        ) : null}
      </div>
    </div>
  );
}

function Tb({
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
      onClick={onClick}
      className={`rounded-lg p-1.5 ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
