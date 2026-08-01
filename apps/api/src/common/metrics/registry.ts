/** Minimal in-process Prometheus-style counters for horizontal-scaling scrapes. */

type Counter = { name: string; help: string; value: number; labels?: Record<string, string> };

const counters = new Map<string, Counter>();

function key(name: string, labels?: Record<string, string>) {
  if (!labels) return name;
  return `${name}{${Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',')}}`;
}

export function incCounter(name: string, help: string, labels?: Record<string, string>, by = 1) {
  const k = key(name, labels);
  const existing = counters.get(k);
  if (existing) {
    existing.value += by;
    return;
  }
  counters.set(k, { name, help, value: by, labels });
}

export function metricsSnapshot() {
  return {
    process_uptime_seconds: process.uptime(),
    process_memory_rss_bytes: process.memoryUsage().rss,
    counters: [...counters.values()],
  };
}

export function renderPrometheus(snap: ReturnType<typeof metricsSnapshot>): string {
  const lines: string[] = [
    '# HELP process_uptime_seconds Process uptime',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${snap.process_uptime_seconds.toFixed(3)}`,
    '# HELP process_memory_rss_bytes Resident set size',
    '# TYPE process_memory_rss_bytes gauge',
    `process_memory_rss_bytes ${snap.process_memory_rss_bytes}`,
  ];

  const seenHelp = new Set<string>();
  for (const c of snap.counters) {
    if (!seenHelp.has(c.name)) {
      lines.push(`# HELP ${c.name} ${c.help}`);
      lines.push(`# TYPE ${c.name} counter`);
      seenHelp.add(c.name);
    }
    const labelStr = c.labels
      ? `{${Object.entries(c.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')}}`
      : '';
    lines.push(`${c.name}${labelStr} ${c.value}`);
  }

  return `${lines.join('\n')}\n`;
}
