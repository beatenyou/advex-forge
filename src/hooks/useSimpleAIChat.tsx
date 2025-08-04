import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIRequestData {
  message: string;
  sessionId: string;
  selectedModelId: string;
  conversationHistory: any[];
  conversationId?: string;
  requestId?: string;
  timestamp?: string;
}

export const useSimpleAIChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (requestData: AIRequestData) => {
    setIsLoading(true);
    
    try {
      // Simple Supabase client request - no complex fallbacks
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          ...requestData,
          conversationId: requestData.conversationId || requestData.sessionId,
          requestId: requestData.requestId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: requestData.timestamp || new Date().toISOString()
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('AI request failed:', error);
      
      toast({
        title: "AI Request Failed",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    sendMessage,
    isLoading,
  };
};