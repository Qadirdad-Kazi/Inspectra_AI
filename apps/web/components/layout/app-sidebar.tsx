import Link from 'next/link';

const links = [
  { href: '/projects', label: 'Projects' },
  { href: '/assets', label: 'Assets' },
  { href: '/scans', label: 'Scans' },
  { href: '/findings', label: 'Findings' },
  { href: '/reports', label: 'Reports' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/settings', label: 'Settings' },
];

export function AppSidebar() {
  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--border)',
        padding: '1.25rem 1rem',
        background: 'var(--surface)',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ padding: '0.4rem 0.6rem', borderRadius: 6, color: 'var(--muted)' }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
