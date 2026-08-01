import type { PropsWithChildren } from 'react';

export function PageHeader({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        gap: '1rem',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h1>
        {description ? (
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
