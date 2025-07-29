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
    const { message, messages, providerId, sessionId, conversationId } = await req.json();

    // Support both single message (legacy) and conversation context (new)
    if (!message && !messages) {
      throw new Error('Message or messages array is required');
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
    
    // Prepare conversation context or single message
    let conversationMessages = [];
    if (messages && Array.isArray(messages)) {
      // Use conversation context (new format)
      conversationMessages = messages.slice(-20).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));
    } else if (message) {
      // Legacy single message format
      conversationMessages = [{ role: 'user', content: message }];
    }
    
    const providerResponse = await supabase.functions.invoke(functionName, {
      body: {
        message: message || conversationMessages[conversationMessages.length - 1]?.content,
        messages: conversationMessages,
        model: provider.model_name,
        systemPrompt: config.system_prompt,
        maxTokens: config.max_tokens,
        temperature: parseFloat(config.temperature),
        agentId: provider.agent_id,
        conversationId: conversationId,
        baseUrl: provider.base_url
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