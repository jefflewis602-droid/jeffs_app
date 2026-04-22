export default function Home() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-light)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '3px' }}>
          TLC LANDSCAPE
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Invoice viewer — open a link shared by TLC Landscape to view your invoice.
        </p>
      </div>
    </main>
  );
}
