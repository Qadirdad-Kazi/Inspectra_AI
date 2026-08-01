export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border)',
        borderRadius: 8,
        padding: '2rem',
        color: 'var(--muted)',
      }}
    >
      <strong style={{ color: 'var(--fg)' }}>{title}</strong>
      <p style={{ marginBottom: 0 }}>{body}</p>
    </div>
  );
}
