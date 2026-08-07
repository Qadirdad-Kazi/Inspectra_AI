'use client';

import { FolderOpen, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type StudioProjectListItem = {
  id: string;
  name: string;
  platform: string;
  updatedAt: string;
  createdBy?: { name?: string | null; email?: string | null };
};

interface StudioProjectLibraryProps {
  projects: StudioProjectListItem[];
  loading: boolean;
  activeProjectId: string | null;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function StudioProjectLibrary({
  projects,
  loading,
  activeProjectId,
  onRefresh,
  onOpen,
  onDelete,
  onNew,
}: StudioProjectLibraryProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderOpen className="h-4 w-4 text-cyan-400" />
          Projects
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-cyan-400 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
            onClick={onNew}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      {loading && !projects.length ? (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
          No saved projects yet. Design a set and click Save.
        </p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {projects.map((p) => {
            const active = p.id === activeProjectId;
            return (
              <li
                key={p.id}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                  active
                    ? 'border-cyan-400/40 bg-cyan-500/10'
                    : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpen(p.id)}
                >
                  <div className="truncate text-sm font-medium text-white">{p.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                    <span>{p.platform}</span>
                    <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                      <Clock className="h-3 w-3" />
                      {new Date(p.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  title="Delete project"
                  className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
