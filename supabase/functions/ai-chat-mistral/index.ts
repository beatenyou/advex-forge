import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, model = 'mistral-large-latest', systemPrompt, maxTokens = 1000, temperature = 0.7 } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      throw new Error('Mistral API key not configured');
    }

    console.log('Sending request to Mistral with model:', model);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: maxTokens,
        temperature,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mistral API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get response from Mistral');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Successfully received response from Mistral');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      model,
      provider: 'mistral',
      tokensUsed: data.usage?.total_tokens || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat-mistral function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      provider: 'mistral'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});