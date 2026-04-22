import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PrintButton } from './PrintButton';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

interface LineItem {
  line_type: 'flat_rate' | 'hourly' | 'material';
  description: string;
  amount: number;
}

interface Invoice {
  id: string;
  billing_period_start: string;
  billing_period_end: string;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  pdf_url: string | null;
  customers: {
    name: string;
    email: string | null;
    address: string | null;
  } | null;
}

interface InvoiceData {
  invoice: Invoice;
  line_items: LineItem[];
}

async function fetchInvoice(token: string): Promise<InvoiceData | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/invoice-by-token?token=${encodeURIComponent(token)}`,
      {
        headers: { apikey: SUPABASE_ANON_KEY },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchInvoice(token);
  if (!data) return { title: 'Invoice Not Found' };
  const customer = data.invoice.customers?.name ?? 'Customer';
  return {
    title: `TLC Landscape Invoice — ${customer}`,
    description: `Invoice for ${customer}, ${data.invoice.billing_period_start} to ${data.invoice.billing_period_end}`,
  };
}

const LINE_TYPE_LABEL: Record<string, string> = {
  flat_rate: 'Monthly Service',
  hourly: 'Hourly Work',
  material: 'Materials',
};

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  draft:  { color: '#666660', label: 'DRAFT' },
  sent:   { color: '#E67E22', label: 'AWAITING PAYMENT' },
  paid:   { color: '#27AE60', label: 'PAID' },
};

export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchInvoice(token);

  if (!data) notFound();

  const { invoice, line_items } = data;
  const customer = invoice.customers;
  const invoiceNum = `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const status = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft;

  const grouped = {
    flat_rate: line_items.filter(l => l.line_type === 'flat_rate'),
    hourly:    line_items.filter(l => l.line_type === 'hourly'),
    material:  line_items.filter(l => l.line_type === 'material'),
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Top action bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--accent-light)', fontWeight: 700, letterSpacing: 3, fontSize: '0.9rem' }}>
            TLC LANDSCAPE
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--surface-raised)', color: 'var(--text)',
                  padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.875rem',
                  fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border)',
                }}
              >
                Download
              </a>
            )}
            <PrintButton />
          </div>
        </div>

        {/* Invoice card */}
        <div className="print-card" style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            background: 'var(--surface-raised)', padding: '2rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <div style={{ color: 'var(--accent-light)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: 4 }}>
                TLC LANDSCAPE
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: 1, marginTop: 4 }}>
                Professional Landscaping Services
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--text)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: 2 }}>
                INVOICE
              </div>
              <div style={{ color: 'var(--accent-light)', fontSize: '0.875rem', marginTop: 2 }}>
                #{invoiceNum}
              </div>
              <div style={{ color: status.color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: 2, marginTop: 6 }}>
                {status.label}
              </div>
            </div>
          </div>

          {/* Bill-to + period */}
          <div style={{
            padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: 2, marginBottom: 8 }}>
                BILL TO
              </div>
              <div style={{ color: 'var(--text)', fontSize: '1.1rem', fontWeight: 600 }}>
                {customer?.name ?? '—'}
              </div>
              {customer?.address && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                  {customer.address}
                </div>
              )}
              {customer?.email && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                  {customer.email}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: 2, marginBottom: 8 }}>
                BILLING PERIOD
              </div>
              <div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 500 }}>
                {invoice.billing_period_start}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</div>
              <div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 500 }}>
                {invoice.billing_period_end}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div style={{ padding: '1.5rem 2rem' }}>

            {/* Column headers */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
              marginBottom: '0.75rem',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: 2 }}>DESCRIPTION</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: 2 }}>AMOUNT</span>
            </div>

            {/* Flat rate */}
            {grouped.flat_rate.map((item, i) => (
              <LineItemRow key={i} item={item} />
            ))}

            {/* Hourly work — section label if there are entries */}
            {grouped.hourly.length > 0 && (
              <>
                <SectionLabel label="HOURLY WORK" />
                {grouped.hourly.map((item, i) => (
                  <LineItemRow key={i} item={item} />
                ))}
              </>
            )}

            {/* Materials — section label if there are entries */}
            {grouped.material.length > 0 && (
              <>
                <SectionLabel label="MATERIALS" />
                {grouped.material.map((item, i) => (
                  <LineItemRow key={i} item={item} />
                ))}
              </>
            )}

            {/* Total */}
            <div style={{
              marginTop: '1.5rem', paddingTop: '1rem',
              borderTop: '2px solid var(--accent)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 700, letterSpacing: 1 }}>
                TOTAL DUE
              </span>
              <span style={{ color: 'var(--accent-light)', fontSize: '1.75rem', fontWeight: 700 }}>
                ${Number(invoice.total).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '1.25rem 2rem', background: 'var(--surface-raised)',
            borderTop: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              Payment is due within <strong style={{ color: 'var(--text)' }}>30 days</strong>.
              Thank you for choosing TLC Landscape — we appreciate your business.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Questions? Reply to this invoice email or contact us directly.
            </p>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.5rem' }}>
          #{invoiceNum} · TLC Landscape
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      color: 'var(--text-muted)', fontSize: '0.65rem', letterSpacing: 2,
      fontWeight: 600, paddingTop: '1rem', paddingBottom: '0.4rem',
    }}>
      {label}
    </div>
  );
}

function LineItemRow({ item }: { item: LineItem }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '0.6rem 0', borderBottom: '1px solid var(--border)', gap: '1rem',
    }}>
      <span style={{ color: 'var(--text)', fontSize: '0.9rem', flex: 1, lineHeight: 1.4 }}>
        {item.description}
      </span>
      <span style={{ color: 'var(--accent-light)', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        ${Number(item.amount).toFixed(2)}
      </span>
    </div>
  );
}
