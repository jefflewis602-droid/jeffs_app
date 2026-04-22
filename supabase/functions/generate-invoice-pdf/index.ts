import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { invoice_id } = await req.json();
  if (!invoice_id) return new Response(JSON.stringify({ error: 'invoice_id required' }), { status: 400 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customers(name, email, address, phone)')
    .eq('id', invoice_id)
    .single();

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoice_id)
    .order('line_type');

  if (!invoice) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 });

  const customer = invoice.customers as any;
  const items = lineItems ?? [];

  const lineItemRows = items.map((item: any) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2E2E2E;color:#F5F5F0;font-size:14px;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2E2E2E;color:#A89070;font-size:14px;text-align:right;white-space:nowrap;">$${Number(item.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1A1A1A; color: #F5F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; border-bottom: 1px solid #3A3A3A; padding-bottom: 32px; }
  .company { }
  .company-name { font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #A89070; }
  .company-sub { font-size: 12px; color: #666660; letter-spacing: 1px; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: 700; color: #F5F5F0; letter-spacing: 2px; }
  .invoice-num { color: #A89070; font-size: 14px; margin-top: 4px; }
  .invoice-date { color: #A0A09B; font-size: 13px; margin-top: 2px; }
  .bill-section { margin-bottom: 36px; }
  .bill-label { font-size: 11px; color: #666660; letter-spacing: 2px; margin-bottom: 8px; }
  .bill-name { font-size: 16px; font-weight: 600; color: #F5F5F0; }
  .bill-detail { font-size: 13px; color: #A0A09B; margin-top: 2px; }
  .period { font-size: 13px; color: #A0A09B; margin-top: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #242424; }
  thead th { padding: 12px; text-align: left; font-size: 11px; color: #666660; letter-spacing: 1px; font-weight: 600; }
  thead th:last-child { text-align: right; }
  .total-row { background: #242424; }
  .total-row td { padding: 16px 12px; font-size: 16px; font-weight: 700; color: #A89070; }
  .total-row td:last-child { text-align: right; font-size: 20px; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #3A3A3A; }
  .footer-text { color: #666660; font-size: 12px; line-height: 1.6; }
</style>
</head>
<body>
<div class="header">
  <div class="company">
    <div class="company-name">TLC LANDSCAPE</div>
    <div class="company-sub">Professional Landscaping Services</div>
  </div>
  <div class="invoice-meta">
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-num">#INV-${String(invoice.id).slice(0, 8).toUpperCase()}</div>
    <div class="invoice-date">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
</div>

<div class="bill-section">
  <div class="bill-label">BILL TO</div>
  <div class="bill-name">${customer?.name ?? 'Customer'}</div>
  ${customer?.address ? `<div class="bill-detail">${customer.address}</div>` : ''}
  ${customer?.email ? `<div class="bill-detail">${customer.email}</div>` : ''}
  ${customer?.phone ? `<div class="bill-detail">${customer.phone}</div>` : ''}
  <div class="period">Billing Period: ${invoice.billing_period_start} – ${invoice.billing_period_end}</div>
</div>

<table>
  <thead>
    <tr>
      <th>DESCRIPTION</th>
      <th style="text-align:right;">AMOUNT</th>
    </tr>
  </thead>
  <tbody>
    ${lineItemRows}
  </tbody>
  <tfoot>
    <tr class="total-row">
      <td>TOTAL DUE</td>
      <td style="text-align:right;">$${Number(invoice.total).toFixed(2)}</td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  <div class="footer-text">
    Payment is due within 30 days.<br>
    Thank you for your business — we appreciate you choosing TLC Landscape.
  </div>
</div>
</body>
</html>`;

  const pdfFilename = `invoices/${invoice_id}.html`;
  const htmlBytes = new TextEncoder().encode(html);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(pdfFilename, htmlBytes, {
      contentType: 'text/html',
      upsert: true,
    });

  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: corsHeaders });
  }

  const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(pdfFilename);

  await supabase.from('invoices').update({ pdf_url: urlData.publicUrl }).eq('id', invoice_id);

  return new Response(JSON.stringify({ pdf_url: urlData.publicUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
