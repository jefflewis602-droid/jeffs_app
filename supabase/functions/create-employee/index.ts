import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { full_name, email, password } = await req.json();
  if (!full_name || !email || !password) {
    return new Response(JSON.stringify({ error: 'full_name, email, and password are required' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: authError?.message ?? 'Failed to create user' }), { status: 400, headers: corsHeaders });
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name,
    role: 'employee',
  });

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
