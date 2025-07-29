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
    const { 
      message, 
      messages, 
      model = 'mistral-large-latest', 
      systemPrompt = 'You are a helpful AI assistant.', 
      maxTokens = 1000, 
      temperature = 0.7,
      agentId = null,
      conversationId = null
    } = await req.json();

    if (!message && !messages) {
      throw new Error('Message or messages array is required');
    }

    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      throw new Error('Mistral API key not configured');
    }

    console.log('Sending request to Mistral with model:', model, agentId ? `using agent: ${agentId}` : '');

    // If agent_id is provided, use the Conversations API
    if (agentId) {
      // For agents, we need to use the conversations API
      const requestBody = {
        agent_id: agentId,
        entries: [
          {
            type: "user_message",
            content: message || (messages && messages.length > 0 ? messages[messages.length - 1].content : '')
          }
        ]
      };

      const response = await fetch('https://api.mistral.ai/v1/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mistralApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Mistral Conversations API Error:', errorData);
        throw new Error(errorData.error?.message || `Failed to get response from Mistral Agent. Status: ${response.status}`);
      }

      const data = await response.json();
      
      // Find the assistant's response in the entries
      const assistantEntry = data.entries?.find((entry: any) => entry.type === 'assistant_message');
      const aiResponse = assistantEntry?.content || 'No response from agent';

      console.log('Successfully received response from Mistral Agent');

      return new Response(JSON.stringify({ 
        message: aiResponse,
        model,
        provider: 'mistral',
        tokensUsed: data.usage?.total_tokens || 0,
        conversationId: data.id,
        agentId: agentId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Traditional chat completions for non-agent requests
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

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
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
      console.error('Mistral API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get response from Mistral');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Successfully received response from Mistral');

    return new Response(JSON.stringify({ 
      message: aiResponse,
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