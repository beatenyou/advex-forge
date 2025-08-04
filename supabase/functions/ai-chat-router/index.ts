import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-message, x-model-id, x-session-id, x-simple-mode, x-conversation-history, x-request-id, x-user-id, x-timestamp, x-client-version, x-message-length, x-messages-count, x-validation-token, x-conversation-id, x-agent-id, x-model-name, x-debug-provider, x-debug-type, x-debug-timestamp',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
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

  // Add simple health check endpoint
  const url = new URL(req.url);
  if (url.pathname === '/health' || req.method === 'GET') {
    console.log('🏥 Health check requested');
    return new Response(JSON.stringify({ 
      status: 'healthy', 
      service: 'ai-chat-router',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('🚀 AI Chat Router: Request received', { 
    method: req.method, 
    url: req.url,
    hasAuth: !!req.headers.get('authorization')
  });

  try {
    // Simplified authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const authToken = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    
    if (userError || !userData.user) {
      throw new Error('Invalid authentication token');
    }

    const userId = userData.user.id;
    
    // Simplified request parsing
    let requestData: any = {};
    
    try {
      const body = await req.text();
      if (body) {
        requestData = JSON.parse(body);
      }
    } catch (error) {
      // Fallback to headers
      const message = req.headers.get('X-Message');
      const modelId = req.headers.get('X-Model-Id');
      const sessionId = req.headers.get('X-Session-Id');
      
      if (message) {
        requestData = {
          message: decodeURIComponent(message),
          selectedModelId: modelId || '',
          sessionId: sessionId || `simple-${Date.now()}`
        };
      }
    }
    
    // Basic validation and defaults
    const message = requestData.message || '';
    let selectedModelId = requestData.selectedModelId || '';
    let sessionId = requestData.sessionId || `session-${Date.now()}`;
    
    if (!message) {
      throw new Error('No message provided');
    }
    
    // Simple mode defaults
    if (!selectedModelId) {
      const { data: config } = await supabase
        .from('ai_chat_config')
        .select('default_user_primary_model_id')
        .single();
      selectedModelId = config?.default_user_primary_model_id || '';
    }
    
    // Check AI quota with enhanced error handling
    console.log('🔍 Checking AI quota for user:', userId);
    const { data: quotaData, error: quotaError } = await supabase.rpc('check_ai_quota', {
      user_id_param: userId
    });

    if (quotaError) {
      console.error('❌ Quota check failed:', quotaError);
      throw new Error('Failed to check AI usage quota: ' + quotaError.message);
    }

    if (!quotaData || quotaData.length === 0 || !quotaData[0].can_use_ai) {
      console.log('⚠️ Quota exceeded for user:', userId, quotaData?.[0]);
      return new Response(JSON.stringify({ 
        error: 'AI usage quota exceeded',
        quota_exceeded: true,
        current_usage: quotaData?.[0]?.current_usage || 0,
        quota_limit: quotaData?.[0]?.quota_limit || 50,
        plan_name: quotaData?.[0]?.plan_name || 'Unknown'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Quota check passed:', {
      currentUsage: quotaData[0].current_usage,
      quotaLimit: quotaData[0].quota_limit,
      planName: quotaData[0].plan_name
    });

    console.log('🎯 Processing validated request:', { 
      userId, 
      selectedModelId, 
      messageLength: message.length,
      sessionId: sessionId
    });

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

    // Route to appropriate provider function with enhanced error handling
    const functionName = provider.type === 'openai' ? 'ai-chat-openai' : 'ai-chat-mistral';
    console.log('🔗 Routing to provider function:', functionName, 'for provider:', provider.name);
    
    // Simple conversation setup
    const conversationMessages = requestData.messages || [{ role: 'user', content: message }];
    
    // Basic payload for provider function
    const providerPayload = {
      message: message,
      messages: conversationMessages,
      model: provider.model_name,
      systemPrompt: config.system_prompt,
      maxTokens: config.max_tokens,
      temperature: parseFloat(config.temperature),
      agentId: provider.agent_id,
      conversationId: sessionId,
      baseUrl: provider.base_url
    };
    
    console.log('📤 Calling provider:', functionName);
    
    // Call provider function
    const providerResponse = await supabase.functions.invoke(functionName, {
      body: providerPayload
    });

    if (providerResponse.error) {
      throw new Error(providerResponse.error.message);
    }

    if (!providerResponse.data) {
      throw new Error('No response from AI provider');
    }

    const result = providerResponse.data;
    
    // Track usage
    await supabase.rpc('increment_ai_usage', { user_id_param: userId });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Router error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});