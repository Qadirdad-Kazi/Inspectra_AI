import Link from 'next/link';

type SiteHeaderProps = {
  variant: 'marketing' | 'app';
};

export function SiteHeader({ variant }: SiteHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <Link href={variant === 'marketing' ? '/' : '/projects'} style={{ fontWeight: 600 }}>
        Inspectra AI
      </Link>
      <nav style={{ display: 'flex', gap: '1rem', color: 'var(--muted)', fontSize: '0.925rem' }}>
        {variant === 'marketing' ? (
          <>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/projects">Open app</Link>
          </>
        ) : (
          <>
            <Link href="/settings">Settings</Link>
            <Link href="/">Marketing</Link>
          </>
        )}
      </nav>
    </header>
  );
}
