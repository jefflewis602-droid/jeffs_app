import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, billing_period_start, billing_period_end, total, status, pdf_url, customers(name, email, address)')
    .eq('share_token', token)
    .single();

  if (error || !invoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: corsHeaders });
  }

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('line_type, description, amount')
    .eq('invoice_id', invoice.id)
    .order('line_type');

  return new Response(JSON.stringify({ invoice, line_items: lineItems ?? [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
