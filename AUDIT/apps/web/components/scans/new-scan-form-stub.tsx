'use client';

export function NewScanFormStub() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{
        display: 'grid',
        gap: '0.75rem',
        maxWidth: 480,
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
      }}
    >
      <label style={{ display: 'grid', gap: 4 }}>
        <span>Target URL / identifier</span>
        <input
          disabled
          placeholder="https://example.com"
          style={{
            padding: '0.5rem 0.65rem',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--fg)',
          }}
        />
      </label>
      <button
        type="submit"
        disabled
        style={{
          padding: '0.55rem 0.9rem',
          borderRadius: 6,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          opacity: 0.6,
        }}
      >
        Start scan (coming soon)
      </button>
    </form>
  );
}
