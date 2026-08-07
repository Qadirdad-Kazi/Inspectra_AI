'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  deleteCustomDemo,
  listCustomDemos,
  toTenScale,
  type DemoReport,
} from '@/lib/demo-reports';
import { Button } from '@/components/ui/button';

export default function DemoGalleryPage() {
  const [custom, setCustom] = useState<DemoReport[]>([]);

  useEffect(() => {
    setCustom(listCustomDemos());
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Inspectra<span className="text-teal-800">.</span>
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/#studio">Inspectra Studio</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start Free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight">Sample Reports</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Real sample reports are coming soon. Until then, sign in to run a live audit or open
          Inspectra Studio for store screenshot creatives.
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">No published samples yet</p>
          <p className="mt-2 text-sm text-slate-500">
            We’ll add real audit report samples here — not placeholders.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/sign-up">Start Free Audit</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-in">Open Inspectra Studio</Link>
            </Button>
          </div>
        </div>

        {custom.length > 0 ? (
          <>
            <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Your Saved Samples
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {custom.map((demo) => (
                <DemoCard
                  key={demo.id}
                  demo={demo}
                  onDelete={() => {
                    deleteCustomDemo(demo.id);
                    setCustom(listCustomDemos());
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function DemoCard({ demo, onDelete }: { demo: DemoReport; onDelete?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {demo.kind === 'web' ? 'Website' : 'Store Listing'}
          </div>
          <Link
            href={`/demo/${demo.id}`}
            className="mt-1 block text-lg font-semibold hover:text-teal-900"
          >
            {demo.title}
          </Link>
          <p className="mt-2 text-sm text-slate-600">{demo.subtitle}</p>
        </div>
        <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
          <div className="text-xl font-semibold tabular-nums">{toTenScale(demo.score)}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">/10</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild size="sm">
          <Link href={`/demo/${demo.id}`}>Open Report</Link>
        </Button>
        {onDelete ? (
          <Button size="sm" variant="outline" onClick={onDelete}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
