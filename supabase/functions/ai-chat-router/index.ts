import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-message, x-model-id, x-session-id, x-simple-mode',
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
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required for AI chat');
    }

    const authToken = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    
    if (userError || !userData.user) {
      throw new Error('Invalid authentication token');
    }

    const userId = userData.user.id;
    console.log('User authenticated:', userId);
    
    // Check AI quota
    const { data: quotaData, error: quotaError } = await supabase.rpc('check_ai_quota', {
      user_id_param: userId
    });

    if (quotaError) {
      throw new Error('Failed to check AI usage quota');
    }

    if (!quotaData || quotaData.length === 0 || !quotaData[0].can_use_ai) {
      return new Response(JSON.stringify({ 
        error: 'AI usage quota exceeded',
        quota_exceeded: true,
        current_usage: quotaData?.[0]?.current_usage || 0,
        quota_limit: quotaData?.[0]?.quota_limit || 50
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hybrid request parsing - handle Supabase infrastructure issue where bodies are stripped
    let requestBody: any = {};
    let message: string = '';
    let messages: any[] = [];
    let selectedModelId: string = '';
    let sessionId: string = '';
    let conversationId: string = '';
    
    const contentLength = req.headers.get('content-length');
    const contentType = req.headers.get('content-type');
    const url = new URL(req.url);
    
    console.log('Hybrid parsing - Request info:', { 
      contentLength, 
      contentType, 
      hasBody: !!req.body,
      hasHeaders: req.headers.has('X-Message'),
      hasUrlParams: url.searchParams.has('message')
    });
    
    // Try to parse body first (normal case)
    let bodyParsingSuccess = false;
    if (contentLength !== '0' && contentLength !== null) {
      try {
        const bodyText = await req.text();
        if (bodyText && bodyText.trim().length > 0) {
          requestBody = JSON.parse(bodyText);
          bodyParsingSuccess = true;
          console.log('✅ Body parsing successful');
        }
      } catch (parseError) {
        console.log('⚠️ Body parsing failed, trying fallback methods');
      }
    }
    
    // Extract data from body if available
    if (bodyParsingSuccess && requestBody) {
      message = requestBody.message || '';
      messages = requestBody.messages || [];
      selectedModelId = requestBody.selectedModelId || '';
      sessionId = requestBody.sessionId || '';
      conversationId = requestBody.conversationId || '';
    }
    
    // Fallback: Extract from headers (for Supabase infrastructure issue)
    if (!message && req.headers.has('X-Message')) {
      message = decodeURIComponent(req.headers.get('X-Message') || '');
      selectedModelId = req.headers.get('X-Model-Id') || '';
      sessionId = req.headers.get('X-Session-Id') || '';
      conversationId = sessionId; // Use session ID as conversation ID
      console.log('🔄 Using header fallback for message:', message.substring(0, 50));
    }
    
    // Fallback: Extract from URL parameters
    if (!message && url.searchParams.has('message')) {
      message = url.searchParams.get('message') || '';
      selectedModelId = url.searchParams.get('selectedModelId') || '';
      sessionId = url.searchParams.get('sessionId') || '';
      conversationId = url.searchParams.get('conversationId') || '';
      console.log('🔄 Using URL parameter fallback for message:', message.substring(0, 50));
    }
    
    if (!message && !messages) {
      throw new Error('Message or messages array is required');
    }

    console.log('Processing request for user:', userId, 'selectedModelId:', selectedModelId);

    // Get AI configuration
    const { data: config, error: configError } = await supabase
      .from('ai_chat_config')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      throw new Error('AI chat is not configured or disabled');
    }

    // Check if user is admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isAdmin = profileData?.role === 'admin';
    let targetProviderId = null;

    if (selectedModelId) {
      // User has selected a specific model - verify access
      if (isAdmin) {
        // Admin can use any active model
        const { data: selectedProvider } = await supabase
          .from('ai_providers')
          .select('*')
          .eq('id', selectedModelId)
          .eq('is_active', true)
          .single();

        if (selectedProvider) {
          targetProviderId = selectedModelId;
          console.log('Admin using selected model:', selectedProvider.name);
        }
      } else {
        // Regular user - check model access
        const { data: userAccess } = await supabase
          .from('user_model_access')
          .select('provider_id, ai_providers!inner(name, type, is_active)')
          .eq('user_id', userId)
          .eq('provider_id', selectedModelId)
          .eq('is_enabled', true)
          .eq('ai_providers.is_active', true)
          .single();

        if (userAccess && userAccess.ai_providers) {
          targetProviderId = selectedModelId;
          console.log('User using selected model:', userAccess.ai_providers.name);
        }
      }
    }

    // Fallback if no valid selection
    if (!targetProviderId) {
      if (isAdmin) {
        // Admin fallback to first active model
        const { data: firstProvider } = await supabase
          .from('ai_providers')
          .select('id, name')
          .eq('is_active', true)
          .limit(1)
          .single();
        targetProviderId = firstProvider?.id;
        console.log('Admin fallback to:', firstProvider?.name);
      } else {
        // Regular user - get first available model
        const { data: userModels } = await supabase
          .from('user_model_access')
          .select('provider_id, ai_providers!inner(id, is_active)')
          .eq('user_id', userId)
          .eq('is_enabled', true)
          .eq('ai_providers.is_active', true)
          .limit(1)
          .single();

        if (userModels) {
          targetProviderId = userModels.provider_id;
          console.log('User fallback to provider:', targetProviderId);
        }
      }
    }

    if (!targetProviderId) {
      throw new Error('No AI provider available for this user');
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
    
    // Prepare conversation context
    let conversationMessages = [];
    if (messages && Array.isArray(messages)) {
      conversationMessages = messages.slice(-20).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));
    } else if (message) {
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
      },
      headers: {
        'Content-Type': 'application/json',
        // Pass data via headers as fallback for Supabase infrastructure bug
        'X-Message': message || conversationMessages[conversationMessages.length - 1]?.content || '',
        'X-Model-Id': provider.id,
        'X-Session-Id': sessionId || '',
        'X-Simple-Mode': 'true'
      }
    });

    if (providerResponse.error) {
      throw new Error(providerResponse.error.message || 'Provider function error');
    }

    const result = providerResponse.data;

    // Increment usage
    try {
      await supabase.rpc('increment_ai_usage', {
        user_id_param: userId
      });
      
      await supabase.rpc('increment_model_usage', {
        user_id_param: userId,
        provider_id_param: provider.id,
        tokens_used_param: result.tokensUsed || 1,
        session_id_param: sessionId
      });
    } catch (usageError) {
      console.error('Error tracking AI usage:', usageError);
    }

    return new Response(JSON.stringify({
      ...result,
      providerId: provider.id,
      providerName: provider.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat-router function:', error);
    
    // Log error to database
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: null, // We might not have userId if auth failed
          success: false,
          error_type: 'system_error',
          provider_name: 'router',
          request_type: 'chat_router',
          error_details: { message: error.message },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});