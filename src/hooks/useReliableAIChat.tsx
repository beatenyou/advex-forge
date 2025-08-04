import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReliableAIChatOptions {
  maxRetries?: number;
  retryDelay?: number;
  useProgressiveFallback?: boolean;
}

interface AIRequestData {
  message: string;
  sessionId: string;
  modelId: string;
  conversationHistory: any[];
}

export const useReliableAIChat = (options: ReliableAIChatOptions = {}) => {
  const { maxRetries = 3, retryDelay = 1000, useProgressiveFallback = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Health check function
  const checkRouterHealth = useCallback(async (): Promise<boolean> => {
    try {
      const SUPABASE_URL = "https://csknxtzjfdqoaoforrfm.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNza254dHpqZmRxb2FvZm9ycmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTczMTgsImV4cCI6MjA2OTI5MzMxOH0.MNglSbyBWQw2BcxTzC0stq13FNyi9Hxsv3sSGYP_G1M";
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-router`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': SUPABASE_KEY,
        },
      });
      return response.ok;
    } catch (error) {
      console.warn('🔍 Router health check failed:', error);
      return false;
    }
  }, []);

  // Direct HTTP fallback method
  const sendDirectHTTP = useCallback(async (requestData: AIRequestData): Promise<any> => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('Not authenticated');
    }

    console.log('🔄 Attempting direct HTTP fallback');
    
    const SUPABASE_URL = "https://csknxtzjfdqoaoforrfm.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNza254dHpqZmRxb2FvZm9ycmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTczMTgsImV4cCI6MjA2OTI5MzMxOH0.MNglSbyBWQw2BcxTzC0stq13FNyi9Hxsv3sSGYP_G1M";
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-router`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.data.session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        // Send data in headers as backup
        'X-Message': encodeURIComponent(requestData.message),
        'X-Session-Id': requestData.sessionId,
        'X-Model-Id': requestData.modelId,
        'X-Conversation-History': encodeURIComponent(JSON.stringify(requestData.conversationHistory)),
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }, []);

  // Supabase client method
  const sendViaSupabaseClient = useCallback(async (requestData: AIRequestData): Promise<any> => {
    console.log('🔄 Attempting Supabase client method');
    
    const { data, error } = await supabase.functions.invoke('ai-chat-router', {
      body: requestData,
      headers: {
        // Send data in headers as backup
        'X-Message': encodeURIComponent(requestData.message),
        'X-Session-Id': requestData.sessionId,
        'X-Model-Id': requestData.modelId,
        'X-Conversation-History': encodeURIComponent(JSON.stringify(requestData.conversationHistory)),
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }, []);

  // Progressive retry with multiple methods
  const sendWithRetry = useCallback(async (requestData: AIRequestData): Promise<any> => {
    setIsLoading(true);
    setRetryCount(0);

    const methods = [
      { name: 'Supabase Client', fn: sendViaSupabaseClient },
      { name: 'Direct HTTP', fn: sendDirectHTTP },
    ];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      setRetryCount(attempt + 1);

      // Try health check first on subsequent attempts
      if (attempt > 0) {
        const isHealthy = await checkRouterHealth();
        if (!isHealthy) {
          console.warn(`⚠️ Health check failed on attempt ${attempt + 1}`);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            continue;
          }
        }
      }

      // Try each method on each attempt
      for (const method of methods) {
        try {
          console.log(`🚀 Attempt ${attempt + 1}/${maxRetries} using ${method.name}`);
          const result = await method.fn(requestData);
          
          if (result) {
            console.log(`✅ Success with ${method.name} on attempt ${attempt + 1}`);
            setIsLoading(false);
            setRetryCount(0);
            return result;
          }
        } catch (error: any) {
          console.warn(`❌ ${method.name} failed on attempt ${attempt + 1}:`, error.message);
          
          // If this is the last method and last attempt, throw the error
          if (method === methods[methods.length - 1] && attempt === maxRetries - 1) {
            throw error;
          }
        }
      }

      // Wait before next attempt
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('All retry attempts failed');
  }, [maxRetries, retryDelay, sendViaSupabaseClient, sendDirectHTTP, checkRouterHealth]);

  const sendMessage = useCallback(async (requestData: AIRequestData) => {
    try {
      const result = await sendWithRetry(requestData);
      return result;
    } catch (error: any) {
      console.error('🔥 Final AI request failure:', error);
      
      toast({
        title: "AI Request Failed",
        description: `Failed after ${maxRetries} attempts: ${error.message}`,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
      setRetryCount(0);
    }
  }, [sendWithRetry, maxRetries, toast]);

  return {
    sendMessage,
    isLoading,
    retryCount,
    checkHealth: checkRouterHealth,
  };
};