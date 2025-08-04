import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-message, x-model-id, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  console.log('🚀 AI Router starting - Method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.url.includes('/health') || req.method === 'GET') {
    console.log('✅ Health check OK');
    return new Response(JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Basic auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No auth header');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !userData?.user) {
      throw new Error('Auth failed');
    }

    const userId = userData.user.id;
    console.log('✅ User authenticated:', userId);
    
    // Parse request
    let requestData: any = {};
    
    try {
      const body = await req.text();
      requestData = body ? JSON.parse(body) : {};
    } catch {
      // Try headers as fallback
      const headerMessage = req.headers.get('X-Message');
      if (headerMessage) {
        requestData = {
          message: decodeURIComponent(headerMessage),
          selectedModelId: req.headers.get('X-Model-Id') || '',
          sessionId: req.headers.get('X-Session-Id') || `session-${Date.now()}`
        };
      }
    }
    
    const message = requestData.message || '';
    if (!message) {
      throw new Error('No message');
    }
    
    console.log('✅ Message parsed:', message.substring(0, 50) + '...');
    
    // Quick quota check
    const { data: quotaData, error: quotaError } = await supabase.rpc('check_ai_quota', {
      user_id_param: userId
    });

    if (quotaError || !quotaData?.[0]?.can_use_ai) {
      throw new Error('Quota exceeded');
    }
    
    console.log('✅ Quota OK');

    // Get default provider (simplified)
    const { data: config } = await supabase
      .from('ai_chat_config')
      .select('default_user_primary_model_id, system_prompt, max_tokens, temperature')
      .single();
    
    let targetProviderId = requestData.selectedModelId || config?.default_user_primary_model_id;
    
    if (!targetProviderId) {
      // Fallback to first available provider
      const { data: firstProvider } = await supabase
        .from('ai_providers')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      targetProviderId = firstProvider?.id;
    }

    if (!targetProviderId) {
      throw new Error('No provider available');
    }

    console.log('✅ Using provider:', targetProviderId);

    // Get provider
    const { data: provider } = await supabase
      .from('ai_providers')
      .select('type, model_name, base_url')
      .eq('id', targetProviderId)
      .single();

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Route to provider function
    const functionName = provider.type === 'openai' ? 'ai-chat-openai' : 'ai-chat-mistral';
    console.log('✅ Calling:', functionName);
    
    const payload = {
      message,
      model: provider.model_name,
      systemPrompt: config?.system_prompt || 'You are a helpful assistant.',
      maxTokens: config?.max_tokens || 1000,
      temperature: parseFloat(config?.temperature || '0.7')
    };
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });

    if (error) {
      throw new Error(`Provider error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response from provider');
    }

    // Track usage
    await supabase.rpc('increment_ai_usage', { user_id_param: userId });

    console.log('✅ Success!');
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});