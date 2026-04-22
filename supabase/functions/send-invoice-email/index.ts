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
    .select('*, customers(name, email)')
    .eq('id', invoice_id)
    .single();

  if (!invoice) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404 });

  const customer = invoice.customers as any;
  if (!customer?.email) {
    return new Response(JSON.stringify({ error: 'Customer has no email address' }), { status: 400 });
  }

  const invoiceViewerUrl = Deno.env.get('INVOICE_VIEWER_URL') ?? 'https://tlc-invoices.vercel.app';
  const shareUrl = `${invoiceViewerUrl}/invoice/${invoice.share_token}`;
  const invoiceNum = String(invoice_id).slice(0, 8).toUpperCase();

  const emailHtml = `
    <div style="background:#1A1A1A;color:#F5F5F0;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
      <h1 style="color:#A89070;font-size:20px;letter-spacing:3px;margin-bottom:8px;">TLC LANDSCAPE</h1>
      <p style="color:#666660;font-size:12px;margin-bottom:32px;">Professional Landscaping Services</p>

      <p style="font-size:16px;margin-bottom:16px;">Hi ${customer.name},</p>
      <p style="color:#A0A09B;line-height:1.6;margin-bottom:24px;">
        Your invoice for the period <strong style="color:#F5F5F0;">${invoice.billing_period_start} – ${invoice.billing_period_end}</strong>
        is ready. The total amount due is <strong style="color:#A89070;font-size:18px;">$${Number(invoice.total).toFixed(2)}</strong>.
      </p>

      <a href="${shareUrl}" style="display:inline-block;background:#8B7355;color:#F5F5F0;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;letter-spacing:1px;margin-bottom:24px;">
        View Invoice Online
      </a>

      <p style="color:#A0A09B;font-size:13px;line-height:1.6;margin-bottom:8px;">
        Payment is due within 30 days. Thank you for your business!
      </p>
      <p style="color:#666660;font-size:12px;">
        Invoice #INV-${invoiceNum}
      </p>
    </div>
  `;

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 });
  }

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL') ?? 'billing@tlclandscape.com',
      to: [customer.email],
      subject: `TLC Landscape Invoice — ${invoice.billing_period_start} to ${invoice.billing_period_end}`,
      html: emailHtml,
    }),
  });

  if (!emailResponse.ok) {
    const err = await emailResponse.text();
    return new Response(JSON.stringify({ error: `Resend API error: ${err}` }), { status: 500, headers: corsHeaders });
  }

  await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoice_id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
