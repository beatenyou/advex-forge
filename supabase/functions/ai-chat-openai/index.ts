import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-message, x-model-id, x-session-id, x-simple-mode',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('ai-chat-openai: Processing request');
    
    // Hybrid body parsing - handle Supabase infrastructure bug where bodies are stripped
    let requestData: any = {};
    
    try {
      const bodyText = await req.text();
      console.log('Raw body length:', bodyText.length);
      
      if (bodyText.length > 0) {
        requestData = JSON.parse(bodyText);
        console.log('✅ Successfully parsed body data');
      } else {
        console.log('⚠️ Empty body detected, using header fallback');
        
        // Fallback to headers when body is empty
        const headerMessage = req.headers.get('X-Message');
        const headerModelId = req.headers.get('X-Model-Id');
        const headerSessionId = req.headers.get('X-Session-Id');
        
        if (headerMessage) {
          requestData = {
            message: headerMessage,
            model: 'gpt-4o-mini',
            systemPrompt: 'You are a helpful AI assistant.',
            maxTokens: 1000,
            temperature: 0.7,
            sessionId: headerSessionId
          };
          console.log('🔄 Using header fallback data');
        }
      }
    } catch (parseError) {
      console.error('Body parsing failed, trying header fallback:', parseError);
      
      // Fallback to headers when JSON parsing fails
      const headerMessage = req.headers.get('X-Message');
      if (headerMessage) {
        requestData = {
          message: headerMessage,
          model: 'gpt-4o-mini',
          systemPrompt: 'You are a helpful AI assistant.',
          maxTokens: 1000,
          temperature: 0.7
        };
        console.log('🔄 Using header fallback after parse error');
      }
    }

    const { 
      message, 
      messages, 
      model = 'gpt-4o-mini', 
      systemPrompt = 'You are a helpful AI assistant.', 
      maxTokens = 1000, 
      temperature = 0.7 
    } = requestData;

    if (!message && !messages) {
      throw new Error('Message or messages array is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Sending request to OpenAI with model:', model);

    // Build conversation messages
    let conversationMessages = [];
    
    // Add system prompt
    conversationMessages.push({
      role: 'system',
      content: systemPrompt || 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.'
    });

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Use conversation context
      conversationMessages.push(...messages);
    } else if (message) {
      // Legacy single message
      conversationMessages.push({
        role: 'user',
        content: message
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get response from OpenAI');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Successfully received response from OpenAI');

    return new Response(JSON.stringify({ 
      message: aiResponse,
      model,
      provider: 'openai',
      tokensUsed: data.usage?.total_tokens || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat-openai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      provider: 'openai'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});