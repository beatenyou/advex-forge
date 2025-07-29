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
      // URL encode the agent ID to handle special characters like colons
      const encodedAgentId = encodeURIComponent(agentId);
      const apiUrl = `https://api.mistral.ai/v1/agents/${encodedAgentId}/conversations`;
      
      console.log('Making request to URL:', apiUrl);
      
      // For agents, use the conversations API with proper format
      const requestBody = {
        inputs: message || (messages && messages.length > 0 ? messages[messages.length - 1].content : ''),
        model: model
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mistralApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Mistral Agents Conversations API Error:', errorData);
        console.error('Full response details:', { status: response.status, statusText: response.statusText, url: apiUrl });
        throw new Error(errorData.error?.message || errorData.detail || `Failed to get response from Mistral Agent. Status: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

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