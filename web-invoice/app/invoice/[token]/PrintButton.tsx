'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: 'var(--accent)', color: 'var(--text)',
        padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.875rem',
        fontWeight: 600, border: 'none', cursor: 'pointer',
        letterSpacing: 0.5,
      }}
    >
      Print / Save PDF
    </button>
  );
}
