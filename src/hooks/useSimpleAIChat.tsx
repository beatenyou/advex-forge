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
      console.log('🚀 Sending AI request:', requestData);
      
      // Enhanced request payload with proper structure
      const enhancedRequestData = {
        message: requestData.message,
        sessionId: requestData.sessionId,
        selectedModelId: requestData.selectedModelId,
        conversationHistory: requestData.conversationHistory || [],
        conversationId: requestData.conversationId || requestData.sessionId,
        requestId: requestData.requestId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: requestData.timestamp || new Date().toISOString()
      };

      console.log('📤 Calling ai-chat-router with payload:', enhancedRequestData);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: enhancedRequestData
      });

      console.log('📥 AI router response:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(error.message || 'Failed to call AI service');
      }

      if (!data) {
        console.error('❌ No response data received:', data);
        throw new Error('No response from AI service');
      }

      console.log('✅ AI request successful:', data);
      return data;
    } catch (error: any) {
      console.error('🔥 AI request failed:', error);
      
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