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
    // Get user from auth header for quota checking
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required for AI chat');
    }

    // Create client with service role to check quotas
    const authToken = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    
    if (userError || !userData.user) {
      throw new Error('Invalid authentication token');
    }

    const userId = userData.user.id;
    
    // Check AI usage quota before processing
    const { data: quotaData, error: quotaError } = await supabase.rpc('check_ai_quota', {
      user_id_param: userId
    });

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      throw new Error('Failed to check AI usage quota');
    }

    if (!quotaData || quotaData.length === 0 || !quotaData[0].can_use_ai) {
      return new Response(JSON.stringify({ 
        error: 'AI usage quota exceeded',
        quota_exceeded: true,
        current_usage: quotaData?.[0]?.current_usage || 0,
        quota_limit: quotaData?.[0]?.quota_limit || 50,
        plan_name: quotaData?.[0]?.plan_name || 'Free'
      }), {
        status: 429, // Too Many Requests
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, messages, providerId, sessionId, conversationId, selectedModelId } = await req.json();

    // Support both single message (legacy) and conversation context (new)
    if (!message && !messages) {
      throw new Error('Message or messages array is required');
    }

    console.log('🚀 AI Chat Router - Processing request for user:', userId, 'at', new Date().toISOString());
    console.log('📨 Received selectedModelId:', selectedModelId);
    
    // Validate selectedModelId
    if (selectedModelId) {
      console.log('🎯 User selected specific model:', selectedModelId);
    } else {
      console.log('⚠️ No selectedModelId provided, will use fallback logic');
    }

    // Get AI configuration
    const { data: config, error: configError } = await supabase
      .from('ai_chat_config')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      throw new Error('AI chat is not configured or disabled');
    }

    // Check user model access and determine provider
    let targetProviderId = null;
    let isUsingFallback = false;
    
    // Check if user is admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isAdmin = profileData?.role === 'admin';

    if (selectedModelId) {
      // User has selected a specific model - verify access
      console.log('🔍 Verifying access to selectedModelId:', selectedModelId, 'isAdmin:', isAdmin);
      
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
          console.log('✅ Admin can use selected model:', selectedProvider.name, 'ID:', selectedProvider.id);
        } else {
          console.log('❌ Admin selected model not found or inactive:', selectedModelId);
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

        console.log('👤 User access check result for model', selectedModelId, ':', userAccess);

        if (userAccess && userAccess.ai_providers) {
          targetProviderId = selectedModelId;
          console.log('✅ User can use selected model:', userAccess.ai_providers.name, 'ID:', selectedModelId);
        } else {
          // Check if model exists but user doesn't have access
          const { data: providerExists } = await supabase
            .from('ai_providers')
            .select('name, is_active')
            .eq('id', selectedModelId)
            .single();
          
          if (providerExists) {
            console.log('❌ User does not have access to selected model:', providerExists.name, 'Active:', providerExists.is_active);
          } else {
            console.log('❌ Selected model does not exist:', selectedModelId);
          }
        }
      }
    } else {
      console.log('⚠️ No selectedModelId provided, proceeding with fallback logic');
    }

    // Fallback to user's available models or admin defaults
    if (!targetProviderId) {
      console.log('🔄 No target provider found, using fallback logic');
      isUsingFallback = true;
      
      if (isAdmin) {
        // Admin fallback to primary provider
        targetProviderId = providerId || config.primary_provider_id || config.default_provider_id;
        console.log('🔧 Admin fallback attempt 1:', targetProviderId);
        
        if (!targetProviderId) {
          const { data: firstProvider } = await supabase
            .from('ai_providers')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();
          targetProviderId = firstProvider?.id;
          console.log('🔧 Admin fallback attempt 2 (first active):', targetProviderId);
        }
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

        console.log('👤 User fallback models query result:', userModels);

        if (userModels) {
          targetProviderId = userModels.provider_id;
          console.log('👤 User fallback selected:', targetProviderId);
        }
      }
    } else {
      console.log('✅ Using specified target provider:', targetProviderId);
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

    console.log('🎯 FINAL SELECTION - Using provider:', provider.name, 'ID:', provider.id, 'Type:', provider.type, 'Fallback:', isUsingFallback);
    console.log('🔗 Provider mapping - selectedModelId:', selectedModelId, '-> targetProviderId:', targetProviderId, '-> finalProvider:', provider.id);

    // Route to appropriate provider function
    const functionName = provider.type === 'openai' ? 'ai-chat-openai' : 'ai-chat-mistral';
    
    let providerResponse;
    let finalProvider = provider;

    try {
    
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
      
      providerResponse = await supabase.functions.invoke(functionName, {
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
    } catch (primaryError) {
      console.error('Primary provider error:', primaryError);
      
      // Try fallback to secondary provider if enabled and available
      if (config.failover_enabled && config.secondary_provider_id && !isUsingFallback) {
        console.log('Attempting fallback to secondary provider');
        
        try {
          // Get secondary provider details
          const { data: secondaryProvider, error: secondaryProviderError } = await supabase
            .from('ai_providers')
            .select('*')
            .eq('id', config.secondary_provider_id)
            .eq('is_active', true)
            .single();

          if (secondaryProviderError || !secondaryProvider) {
            throw new Error('Secondary provider not found or inactive');
          }

          finalProvider = secondaryProvider;
          isUsingFallback = true;
          console.log('Using secondary provider:', secondaryProvider.name, 'Type:', secondaryProvider.type);

          const secondaryFunctionName = secondaryProvider.type === 'openai' ? 'ai-chat-openai' : 'ai-chat-mistral';
          
          // Prepare conversation context again for secondary provider
          let conversationMessages = [];
          if (messages && Array.isArray(messages)) {
            conversationMessages = messages.slice(-20).map((msg: any) => ({
              role: msg.role,
              content: msg.content
            }));
          } else if (message) {
            conversationMessages = [{ role: 'user', content: message }];
          }

          providerResponse = await supabase.functions.invoke(secondaryFunctionName, {
            body: {
              message: message || conversationMessages[conversationMessages.length - 1]?.content,
              messages: conversationMessages,
              model: secondaryProvider.model_name,
              systemPrompt: config.system_prompt,
              maxTokens: config.max_tokens,
              temperature: parseFloat(config.temperature),
              agentId: secondaryProvider.agent_id,
              conversationId: conversationId,
              baseUrl: secondaryProvider.base_url
            }
          });

          if (providerResponse.error) {
            throw new Error(providerResponse.error.message || 'Secondary provider function error');
          }

          console.log('Successfully used secondary provider');
        } catch (secondaryError) {
          console.error('Secondary provider also failed:', secondaryError);
          throw primaryError; // Throw original error if both fail
        }
      } else {
        throw primaryError; // No fallback available or enabled
      }
    }

    const result = providerResponse.data;

    console.log('💳 Incrementing AI usage for user:', userId, 'using provider:', finalProvider.name);
    try {
      // Increment general AI usage
      const { data: incrementResult, error: incrementError } = await supabase.rpc('increment_ai_usage', {
        user_id_param: userId
      });
      console.log('💳 General usage increment result:', { incrementResult, incrementError });
      
      // Also increment model-specific usage
      const { data: modelIncrementResult, error: modelIncrementError } = await supabase.rpc('increment_model_usage', {
        user_id_param: userId,
        provider_id_param: finalProvider.id,
        tokens_used_param: result.tokensUsed || 1,
        response_time_param: null,
        session_id_param: sessionId
      });
      console.log('💳 Model usage increment result:', { modelIncrementResult, modelIncrementError });
      
      if (incrementError || modelIncrementError) {
        console.error('Failed to increment usage:', { incrementError, modelIncrementError });
        // Don't fail the request, just log the error
      }
    } catch (usageError) {
      console.error('Error tracking AI usage:', usageError);
      // Don't fail the request, just log the error
    }

    return new Response(JSON.stringify({
      ...result,
      providerId: finalProvider.id,
      providerName: finalProvider.name,
      usedFallback: isUsingFallback,
      originalProvider: isUsingFallback ? provider.name : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat-router function:', error);
    
    // Enhanced error logging with detailed context
    try {
      const errorDetails = {
        error_message: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString(),
        config_id: config?.id,
        provider_id: targetProviderId,
        provider_name: provider?.name,
        provider_type: provider?.type,
        model_name: provider?.model_name,
        failover_enabled: config?.failover_enabled,
        used_fallback: isUsingFallback,
        request_timeout: config?.request_timeout_seconds
      };

      const userContext = {
        user_id: userId,
        session_id: sessionId,
        conversation_id: conversationId,
        message_length: message?.length || 0,
        messages_count: messages?.length || 0,
        request_headers: Object.fromEntries(req.headers.entries())
      };

      // Enhanced error classification logic
      const classifyError = (errorMessage: string, errorDetails: any) => {
        const message = errorMessage.toLowerCase();
        
        // Check for specific error patterns
        if (message.includes('quota') || message.includes('usage quota exceeded') || message.includes('limit')) {
          return 'quota_exceeded';
        }
        if (message.includes('timeout') || message.includes('timed out') || message.includes('request timeout')) {
          return 'timeout';
        }
        if (message.includes('authentication') || message.includes('unauthorized') || message.includes('invalid token')) {
          return 'auth_error';
        }
        if (message.includes('api key') || message.includes('invalid key') || message.includes('forbidden')) {
          return 'api_key_error';
        }
        if (message.includes('rate limit') || message.includes('too many requests')) {
          return 'rate_limit_error';
        }
        if (message.includes('provider') || message.includes('model') || provider?.name) {
          return 'provider_error';
        }
        if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
          return 'network_error';
        }
        if (message.includes('configuration') || message.includes('not configured')) {
          return 'configuration_error';
        }
        
        // Check error details for more context
        if (errorDetails?.error_message) {
          const detailMessage = errorDetails.error_message.toLowerCase();
          if (detailMessage.includes('functionsfetcherror')) {
            return 'network_error';
          }
        }
        
        return 'system_error';
      };

      // Log error to ai_interactions table with enhanced classification
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: userId,
          session_id: sessionId,
          success: false,
          error_type: classifyError(error.message, errorDetails),
          provider_name: provider?.name || 'unknown',
          request_type: 'chat_router',
          error_details: errorDetails,
          user_context: userContext,
          browser_info: req.headers.get('User-Agent') || 'unknown',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log error details:', logError);
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      error_id: `ai_router_${Date.now()}`, // For easier tracking
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});