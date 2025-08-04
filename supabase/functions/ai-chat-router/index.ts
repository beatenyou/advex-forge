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

  // Log all incoming headers for debugging
  const allHeaders = {};
  for (const [key, value] of req.headers.entries()) {
    allHeaders[key.toLowerCase()] = value;
  }
  
  console.log('🚀 AI Chat Router: Request received', { 
    method: req.method, 
    url: req.url,
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length'),
    hasAuth: !!req.headers.get('authorization'),
    allHeaders: Object.keys(allHeaders),
    customHeaders: Object.keys(allHeaders).filter(h => h.startsWith('x-'))
  });

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
    console.log('✅ User authenticated:', userId);
    
    // Enhanced request body reconstruction with multiple fallback mechanisms
    let requestData: any = {};
    let rawBodyText = '';
    let bodyParsingSuccess = false;
    
    // Step 1: Try to get the raw request body
    try {
      const clonedRequest = req.clone();
      rawBodyText = await clonedRequest.text();
      console.log('📥 Raw body received:', { 
        length: rawBodyText.length, 
        hasContent: rawBodyText.trim().length > 0,
        preview: rawBodyText.substring(0, 100)
      });
      
      if (rawBodyText && rawBodyText.trim().length > 0) {
        try {
          requestData = JSON.parse(rawBodyText);
          bodyParsingSuccess = true;
          console.log('✅ Body parsed successfully:', {
            hasMessage: !!requestData.message,
            hasMessages: !!requestData.messages,
            hasSessionId: !!requestData.sessionId,
            hasSelectedModelId: !!requestData.selectedModelId
          });
        } catch (jsonError) {
          console.log('⚠️ JSON parsing failed:', jsonError.message);
        }
      }
    } catch (bodyError) {
      console.log('⚠️ Body reading failed:', bodyError.message);
    }
    
    // Step 2: Enhanced header fallback reconstruction (case-insensitive)
    if (!bodyParsingSuccess) {
      console.log('🔄 Reconstructing request from headers...');
      
      // Helper function for case-insensitive header retrieval
      const getHeader = (name) => {
        return req.headers.get(name) || req.headers.get(name.toLowerCase()) || req.headers.get(name.toUpperCase());
      };
      
      const headerMessage = getHeader('X-Message');
      const headerModelId = getHeader('X-Model-Id');
      const headerSessionId = getHeader('X-Session-Id');
      const headerConversationHistory = getHeader('X-Conversation-History');
      
      if (headerMessage || headerModelId || headerSessionId) {
        requestData = {
          message: headerMessage ? decodeURIComponent(headerMessage) : '',
          selectedModelId: headerModelId || '',
          sessionId: headerSessionId || '',
          conversationId: headerSessionId || '',
          messages: headerConversationHistory ? JSON.parse(decodeURIComponent(headerConversationHistory)) : []
        };
        
        console.log('✅ Request reconstructed from headers:', {
          messageLength: requestData.message.length,
          hasSessionId: !!requestData.sessionId,
          hasSelectedModelId: !!requestData.selectedModelId
        });
        
        bodyParsingSuccess = true;
      }
    }
    
    // Step 3: URL parameter fallback
    if (!bodyParsingSuccess) {
      console.log('🔄 Trying URL parameter fallback...');
      const url = new URL(req.url);
      
      if (url.searchParams.has('message')) {
        requestData = {
          message: url.searchParams.get('message') || '',
          selectedModelId: url.searchParams.get('selectedModelId') || '',
          sessionId: url.searchParams.get('sessionId') || '',
          conversationId: url.searchParams.get('conversationId') || '',
          messages: []
        };
        bodyParsingSuccess = true;
        console.log('✅ Request reconstructed from URL parameters');
      }
    }
    
    // Validate reconstructed request data
    const message = requestData.message || '';
    const messages = requestData.messages || [];
    const selectedModelId = requestData.selectedModelId || '';
    const sessionId = requestData.sessionId || '';
    const conversationId = requestData.conversationId || sessionId;
    
    console.log('📋 Final request validation:', {
      hasMessage: message.length > 0,
      hasMessages: messages.length > 0,
      hasSelectedModelId: selectedModelId.length > 0,
      hasSessionId: sessionId.length > 0,
      messagePreview: message.substring(0, 50)
    });
    
    // Enhanced validation with specific error messages
    if (!message && (!messages || messages.length === 0)) {
      throw new Error('Request validation failed: No message content provided. This usually indicates a request body transmission issue.');
    }
    
    if (!selectedModelId) {
      throw new Error('Request validation failed: No AI model selected. Please ensure a model is selected before sending messages.');
    }
    
    if (!sessionId) {
      throw new Error('Request validation failed: No session ID provided. Please ensure the chat session is properly initialized.');
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
    
    // Prepare conversation context with enhanced validation
    let conversationMessages = [];
    if (messages && Array.isArray(messages) && messages.length > 0) {
      conversationMessages = messages.slice(-20).map((msg: any) => ({
        role: msg.role || 'user',
        content: msg.content || ''
      })).filter(msg => msg.content.trim().length > 0);
      console.log('💬 Using conversation context:', conversationMessages.length, 'messages');
    } else if (message) {
      conversationMessages = [{ role: 'user', content: message }];
      console.log('💬 Using single message context');
    }
    
    if (conversationMessages.length === 0) {
      throw new Error('No valid conversation messages to process');
    }
    
    // Enhanced payload for provider function with redundant data transmission
    const providerPayload = {
      message: message || conversationMessages[conversationMessages.length - 1]?.content,
      messages: conversationMessages,
      model: provider.model_name,
      systemPrompt: config.system_prompt,
      maxTokens: config.max_tokens,
      temperature: parseFloat(config.temperature),
      agentId: provider.agent_id,
      conversationId: conversationId,
      baseUrl: provider.base_url,
      // Add redundant fields for robustness
      requestId: `${userId}-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending to provider function:', {
      functionName,
      messageLength: providerPayload.message?.length || 0,
      messagesCount: providerPayload.messages?.length || 0,
      model: providerPayload.model,
      hasAgentId: !!providerPayload.agentId,
      payloadSize: JSON.stringify(providerPayload).length
    });
    
    // Enhanced provider function call with multiple transmission methods
    const providerResponse = await supabase.functions.invoke(functionName, {
      body: providerPayload,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Triple redundancy: send critical data via headers as fallback
        'X-Message': encodeURIComponent(providerPayload.message || ''),
        'X-Model-Id': provider.id,
        'X-Session-Id': sessionId || '',
        'X-Agent-Id': provider.agent_id || '',
        'X-Model-Name': provider.model_name || '',
        'X-Request-Id': providerPayload.requestId,
        'X-Simple-Mode': 'true',
        // Add additional debugging headers
        'X-Debug-Provider': provider.name,
        'X-Debug-Type': provider.type,
        'X-Debug-Timestamp': providerPayload.timestamp
      }
    });

    // Enhanced provider response handling
    console.log('📥 Provider response received:', {
      hasError: !!providerResponse.error,
      hasData: !!providerResponse.data,
      errorMessage: providerResponse.error?.message,
      dataKeys: providerResponse.data ? Object.keys(providerResponse.data) : []
    });

    if (providerResponse.error) {
      console.error('❌ Provider function error:', providerResponse.error);
      
      // Classify provider errors for better user experience
      let errorMessage = 'AI provider error: ' + (providerResponse.error.message || 'Unknown provider error');
      
      if (providerResponse.error.message?.includes('timeout')) {
        errorMessage = 'AI provider timeout - please try again with a shorter message';
      } else if (providerResponse.error.message?.includes('quota') || providerResponse.error.message?.includes('limit')) {
        errorMessage = 'AI provider quota exceeded - please try again later';
      } else if (providerResponse.error.message?.includes('API key') || providerResponse.error.message?.includes('authentication')) {
        errorMessage = 'AI provider authentication error - please contact support';
      } else if (providerResponse.error.message?.includes('model')) {
        errorMessage = 'AI model error - please try selecting a different model';
      }
      
      throw new Error(errorMessage);
    }

    if (!providerResponse.data) {
      throw new Error('No response data received from AI provider');
    }

    const result = providerResponse.data;
    console.log('✅ Provider response validated:', {
      hasMessage: !!result.message,
      messageLength: result.message?.length || 0,
      tokensUsed: result.tokensUsed || 0,
      providerId: result.providerId || 'unknown'
    });

    // Enhanced usage tracking with better error handling
    console.log('📊 Tracking usage for successful request...');
    try {
      // Track general AI usage
      const { error: usageError } = await supabase.rpc('increment_ai_usage', {
        user_id_param: userId
      });
      
      if (usageError) {
        console.error('❌ Failed to increment AI usage:', usageError);
      } else {
        console.log('✅ AI usage incremented for user:', userId);
      }
      
      // Track model-specific usage
      const { error: modelUsageError } = await supabase.rpc('increment_model_usage', {
        user_id_param: userId,
        provider_id_param: provider.id,
        tokens_used_param: result.tokensUsed || 1,
        session_id_param: sessionId
      });
      
      if (modelUsageError) {
        console.error('❌ Failed to increment model usage:', modelUsageError);
      } else {
        console.log('✅ Model usage incremented:', {
          provider: provider.name,
          tokens: result.tokensUsed || 1,
          session: sessionId
        });
      }
      
      // Log successful interaction for analytics
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: userId,
          session_id: sessionId,
          provider_name: provider.name,
          success: true,
          tokens_used: result.tokensUsed || 1,
          response_time_ms: Date.now() - Date.parse(new Date().toISOString()), // Approximate
          request_type: 'chat',
          created_at: new Date().toISOString()
        });
        
    } catch (usageError) {
      console.error('❌ Error tracking AI usage (non-critical):', usageError);
      // Don't throw here - usage tracking failure shouldn't break the response
    }

    // Enhanced response with debugging information
    const enhancedResult = {
      ...result,
      providerId: provider.id,
      providerName: provider.name,
      modelName: provider.model_name,
      requestTimestamp: new Date().toISOString(),
      // Add debugging info in non-production
      debug: {
        userId: userId.substring(0, 8) + '...',
        sessionId: sessionId.substring(0, 8) + '...',
        messageLength: message.length,
        tokensUsed: result.tokensUsed || 1
      }
    };
    
    console.log('🎉 Successfully processed AI request:', {
      provider: provider.name,
      messageLength: message.length,
      responseLength: result.message?.length || 0,
      tokensUsed: result.tokensUsed || 1,
      processingComplete: true
    });

    return new Response(JSON.stringify(enhancedResult), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Provider-Used': provider.name,
        'X-Model-Used': provider.model_name,
        'X-Request-Success': 'true'
      },
    });

  } catch (error) {
    console.error('❌ Critical error in ai-chat-router function:', error);
    
    // Enhanced error classification for better debugging
    let errorType = 'system_error';
    let errorStatus = 500;
    let userFriendlyMessage = 'An unexpected error occurred. Please try again.';
    
    if (error.message?.includes('Authentication')) {
      errorType = 'auth_error';
      errorStatus = 401;
      userFriendlyMessage = 'Authentication failed. Please refresh the page and try again.';
    } else if (error.message?.includes('quota')) {
      errorType = 'quota_error';
      errorStatus = 429;
      userFriendlyMessage = error.message; // Keep quota messages as-is
    } else if (error.message?.includes('validation') || error.message?.includes('required')) {
      errorType = 'validation_error';
      errorStatus = 400;
      userFriendlyMessage = 'Request validation failed. Please ensure all required fields are provided.';
    } else if (error.message?.includes('Provider') || error.message?.includes('model')) {
      errorType = 'provider_error';
      errorStatus = 503;
      userFriendlyMessage = 'AI service temporarily unavailable. Please try again in a moment.';
    } else if (error.message?.includes('timeout')) {
      errorType = 'timeout_error';
      errorStatus = 504;
      userFriendlyMessage = 'Request timed out. Please try again with a shorter message.';
    }
    
    // Enhanced error logging with more context
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: null, // We might not have userId if auth failed early
          success: false,
          error_type: errorType,
          provider_name: 'router',
          request_type: 'chat_router',
          error_details: { 
            message: error.message,
            stack: error.stack,
            userAgent: 'edge-function',
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('❌ Failed to log error to database:', logError);
    }

    // Return structured error response
    const errorResponse = {
      error: userFriendlyMessage,
      error_type: errorType,
      error_code: errorStatus,
      timestamp: new Date().toISOString(),
      debug_message: error.message, // For debugging purposes
      retry_suggested: !['auth_error', 'validation_error'].includes(errorType)
    };

    console.log('🚨 Returning error response:', {
      type: errorType,
      status: errorStatus,
      message: userFriendlyMessage,
      originalError: error.message
    });

    return new Response(JSON.stringify(errorResponse), {
      status: errorStatus,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Error-Type': errorType,
        'X-Request-Success': 'false'
      },
    });
  }
});