export function FindingSeverityPill({ severity }: { severity: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: 4,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        fontSize: '0.75rem',
        textTransform: 'capitalize',
      }}
    >
      {severity}
    </span>
  );
}
