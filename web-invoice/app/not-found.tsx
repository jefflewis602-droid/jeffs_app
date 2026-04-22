export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '2rem', textAlign: 'center',
    }}>
      <div>
        <p style={{ color: 'var(--accent-light)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: 3 }}>
          TLC LANDSCAPE
        </p>
        <p style={{ color: 'var(--text)', fontSize: '1.25rem', fontWeight: 600, marginTop: '1.5rem' }}>
          Invoice not found
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: 320 }}>
          This link may be invalid or the invoice may have been removed. Contact TLC Landscape for help.
        </p>
      </div>
    </div>
  );
}
