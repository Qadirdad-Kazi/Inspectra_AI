'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BUILTIN_DEMOS,
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
            <Link href="/demo/manage">Manage demos</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight">Sample reports</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse client-side demos to understand the report layout. Live audits run from your
          workspace after sign-in.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Built-in
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {BUILTIN_DEMOS.map((demo) => (
            <DemoCard key={demo.id} demo={demo} />
          ))}
        </div>

        {custom.length ? (
          <>
            <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Your saved demos
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {demo.kind === 'web' ? 'Website' : 'Store'}
          </div>
          <Link href={`/demo/${demo.id}`} className="mt-1 block text-lg font-semibold hover:text-teal-900">
            {demo.title}
          </Link>
          <p className="mt-1 text-sm text-slate-600">{demo.subtitle}</p>
        </div>
        <div className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-center text-white">
          <div className="text-lg font-semibold tabular-nums">{toTenScale(demo.score)}</div>
          <div className="text-[10px] text-slate-400">/10</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild size="sm">
          <Link href={`/demo/${demo.id}`}>Open report</Link>
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
