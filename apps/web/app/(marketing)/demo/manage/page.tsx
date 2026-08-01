'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  deleteCustomDemo,
  listCustomDemos,
  saveCustomDemo,
  type DemoFinding,
  type DemoReport,
  type DemoSurface,
} from '@/lib/demo-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ManageDemosPage() {
  const [custom, setCustom] = useState<DemoReport[]>([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [score, setScore] = useState(70);
  const [summary, setSummary] = useState('');
  const [findingTitle, setFindingTitle] = useState('');
  const [findingFix, setFindingFix] = useState('');

  function refresh() {
    setCustom(listCustomDemos());
  }

  useEffect(() => {
    refresh();
  }, []);

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !target.trim()) {
      toast.error('Title and target are required');
      return;
    }

    const surfaces: DemoSurface[] = [
      { id: 'primary', label: 'Primary', status: score >= 75 ? 'strong' : 'needs_work', note: 'Client-saved demo surface' },
      { id: 'secondary', label: 'Secondary', status: 'needs_work', note: 'Add more detail in a live audit' },
    ];

    const findings: DemoFinding[] = findingTitle.trim()
      ? [
          {
            id: crypto.randomUUID(),
            title: findingTitle.trim(),
            severity: 'medium',
            category: 'custom',
            description: summary.trim() || 'Custom demo finding',
            remediation: findingFix.trim() || 'Document the fix your team will ship.',
            impactPoints: 5,
          },
        ]
      : [];

    const demo: DemoReport = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      subtitle: 'Client-side demo report',
      kind: target.includes('http') ? 'web' : 'store',
      targetLabel: target.trim(),
      score,
      summary: summary.trim() || 'Saved locally in this browser for walkthroughs and client reviews.',
      surfaces,
      findings,
      strengths: [
        {
          title: 'Saved for sharing in this browser',
          detail: 'Export or re-run a live audit when you need org-backed history.',
        },
      ],
    };

    saveCustomDemo(demo);
    toast.success('Demo saved on this device');
    setTitle('');
    setTarget('');
    setSummary('');
    setFindingTitle('');
    setFindingFix('');
    refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/demo" className="text-sm text-slate-600 hover:text-slate-950">
          ← Demos
        </Link>
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Inspectra<span className="text-teal-800">.</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 pb-20">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Client-side demos</h1>
          <p className="mt-2 text-slate-600">
            Create lightweight sample reports stored in your browser. Useful for sales walkthroughs
            and design reviews — not a substitute for live org audits.
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target URL / ID</Label>
              <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="score">Score (0–100)</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Summary</Label>
            <textarea
              id="summary"
              className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ft">Optional finding title</Label>
              <Input id="ft" value={findingTitle} onChange={(e) => setFindingTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ff">Optional fix</Label>
              <Input id="ff" value={findingFix} onChange={(e) => setFindingFix(e.target.value)} />
            </div>
          </div>
          <Button type="submit">Save demo locally</Button>
        </form>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Saved on this device ({custom.length})
          </h2>
          {custom.length === 0 ? (
            <p className="text-sm text-slate-500">No custom demos yet.</p>
          ) : (
            custom.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <Link href={`/demo/${d.id}`} className="font-medium hover:text-teal-900">
                    {d.title}
                  </Link>
                  <div className="text-xs text-slate-500">{d.targetLabel}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    deleteCustomDemo(d.id);
                    refresh();
                  }}
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
