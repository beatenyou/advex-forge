import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    const startTime = Date.now();

    // Test database connectivity
    const { data: configTest, error: configError } = await supabase
      .from('ai_chat_config')
      .select('is_enabled')
      .limit(1);

    if (configError) {
      throw new Error(`Database connectivity failed: ${configError.message}`);
    }

    // Test AI providers availability
    const { data: providers, error: providersError } = await supabase
      .from('ai_providers')
      .select('id, name, type, is_active')
      .eq('is_active', true);

    if (providersError) {
      throw new Error(`Providers check failed: ${providersError.message}`);
    }

    // Test edge functions availability
    const functionTests = [];
    const availableProviders = providers || [];
    
    for (const provider of availableProviders.slice(0, 2)) { // Test first 2 providers
      const functionName = provider.type === 'openai' ? 'ai-chat-openai' : 'ai-chat-mistral';
      
      try {
        const testResponse = await supabase.functions.invoke(functionName, {
          body: { 
            message: 'health check',
            model: 'gpt-4o-mini', 
            systemPrompt: 'Respond with "OK"',
            maxTokens: 10,
            temperature: 0.1,
            healthCheck: true
          }
        });
        
        functionTests.push({
          provider: provider.name,
          function: functionName,
          status: testResponse.error ? 'error' : 'healthy',
          error: testResponse.error?.message
        });
      } catch (error) {
        functionTests.push({
          provider: provider.name,
          function: functionName,
          status: 'error',
          error: error.message
        });
      }
    }

    const responseTime = Date.now() - startTime;
    const isHealthy = functionTests.every(test => test.status === 'healthy') && !configError;

    const healthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      checks: {
        database: configError ? 'error' : 'healthy',
        providers: {
          total: availableProviders.length,
          active: availableProviders.filter(p => p.is_active).length,
          tested: functionTests.length
        },
        functions: functionTests
      },
      version: '2.0.0',
      environment: 'production'
    };

    console.log('🏥 Health check completed:', {
      status: healthStatus.status,
      responseTime: responseTime,
      providersTested: functionTests.length,
      allHealthy: isHealthy
    });

    return new Response(JSON.stringify(healthStatus), {
      status: isHealthy ? 200 : 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Health-Status': healthStatus.status,
        'X-Response-Time': responseTime.toString()
      }
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      version: '2.0.0'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Health-Status': 'unhealthy'
      }
    });
  }
});