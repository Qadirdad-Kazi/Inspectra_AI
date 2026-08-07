'use client';

import {
  Upload,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { type DeviceStyle, DEVICE_PRESETS } from './studio-canvas';

interface StudioFloatingToolbarProps {
  selectedDeviceStyle: DeviceStyle;
  onChangeDeviceStyle: (style: DeviceStyle) => void;
  onUploadScreenshot: () => void;
  shadowOpacity: number;
  onChangeShadowOpacity: (opacity: number) => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
}

export function StudioFloatingToolbar({
  selectedDeviceStyle,
  onChangeDeviceStyle,
  onUploadScreenshot,
  shadowOpacity,
  onChangeShadowOpacity,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onDelete,
}: StudioFloatingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl text-white">
      {/* Device Picker Selector */}
      <div className="flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-1.5 border border-white/10 text-xs font-semibold">
        <Smartphone className="h-4 w-4 text-teal-400" />
        <select
          value={selectedDeviceStyle}
          onChange={(e) => onChangeDeviceStyle(e.target.value as DeviceStyle)}
          className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
        >
          {DEVICE_PRESETS.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-white">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add Screenshot Button */}
      <button
        onClick={onUploadScreenshot}
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 hover:border-teal-400/50"
      >
        <Upload className="h-3.5 w-3.5 text-teal-400" />
        Add screenshot
      </button>

      {/* Shadow Strength Selector */}
      <div className="flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-1.5 border border-white/10 text-xs font-medium">
        <span className="text-slate-400 text-[11px]">Shadow</span>
        <select
          value={shadowOpacity}
          onChange={(e) => onChangeShadowOpacity(Number(e.target.value))}
          className="bg-transparent text-xs text-teal-300 font-bold focus:outline-none cursor-pointer"
        >
          <option value={0} className="bg-slate-900">0%</option>
          <option value={25} className="bg-slate-900">25%</option>
          <option value={55} className="bg-slate-900">55%</option>
          <option value={75} className="bg-slate-900">75%</option>
          <option value={100} className="bg-slate-900">100%</option>
        </select>
      </div>

      <div className="h-4 w-[1px] bg-white/15 mx-1" />

      {/* Object Operations */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDuplicate}
          title="Duplicate Element"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={onBringForward}
          title="Bring Forward"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
        >
          <ArrowUp className="h-4 w-4" />
        </button>

        <button
          onClick={onSendBackward}
          title="Send Backward"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
        >
          <ArrowDown className="h-4 w-4" />
        </button>

        <button
          onClick={onDelete}
          title="Delete Element"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition ml-1"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
