import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, providerId } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Chat Router - Processing request');

    // Get AI configuration
    const { data: config, error: configError } = await supabase
      .from('ai_chat_config')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      throw new Error('AI chat is not configured or disabled');
    }

    // Determine which provider to use
    let targetProviderId = providerId || config.default_provider_id;
    
    if (!targetProviderId) {
      // Get the first active provider if no default is set
      const { data: firstProvider } = await supabase
        .from('ai_providers')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      targetProviderId = firstProvider?.id;
    }

    if (!targetProviderId) {
      throw new Error('No AI provider available');
    }

    // Get provider details
    const { data: provider, error: providerError } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('id', targetProviderId)
      .eq('is_active', true)
      .single();

    if (providerError || !provider) {
      throw new Error('AI provider not found or inactive');
    }

    console.log('Using provider:', provider.name, 'Type:', provider.type);

    // Route to appropriate provider function
    const functionName = provider.type === 'openai' ? 'ai-chat-openai' : 'ai-chat-mistral';
    
    const providerResponse = await supabase.functions.invoke(functionName, {
      body: {
        message,
        model: provider.model_name,
        systemPrompt: config.system_prompt,
        maxTokens: config.max_tokens,
        temperature: parseFloat(config.temperature)
      }
    });

    if (providerResponse.error) {
      throw new Error(providerResponse.error.message || 'Provider function error');
    }

    const result = providerResponse.data;

    return new Response(JSON.stringify({
      ...result,
      providerId: provider.id,
      providerName: provider.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat-router function:', error);
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});