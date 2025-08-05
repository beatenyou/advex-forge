// ============= AI Chat Service =============

import { supabase } from "@/integrations/supabase/client";
import { AIRequestPayload, AIResponse } from "@/types/chat";

export class AIChatService {
  private static instance: AIChatService;
  private activeRequests = new Map<string, boolean>();

  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  async sendMessage(payload: AIRequestPayload): Promise<AIResponse> {
    const requestId = payload.requestId || this.generateRequestId();
    
    // Prevent duplicate requests
    if (this.activeRequests.get(requestId)) {
      throw new Error('Request already in progress');
    }

    this.activeRequests.set(requestId, true);

    try {
      console.log('🚀 AIChatService: Sending request', {
        requestId,
        messageLength: payload.message.length,
        historyLength: payload.conversationHistory.length,
        modelId: payload.selectedModelId
      });

      const enhancedPayload = {
        ...payload,
        requestId,
        timestamp: payload.timestamp || new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: enhancedPayload
      });

      if (error) {
        console.error('❌ AIChatService: Supabase function error', error);
        throw new Error(error.message || 'Failed to call AI service');
      }

      if (!data) {
        console.error('❌ AIChatService: No response data received');
        throw new Error('No response from AI service');
      }

      // Normalize response format - handle both data.response and data.message
      const normalizedResponse: AIResponse = {
        success: data.success !== false,
        response: data.response || data.message || data.content,
        message: data.message || data.response || data.content,
        error: data.error,
        provider_used: data.provider_used || data.provider,
        tokens_used: data.tokens_used || data.tokens,
        request_id: requestId
      };

      if (!normalizedResponse.success || !normalizedResponse.response) {
        throw new Error(normalizedResponse.error || 'Invalid response from AI service');
      }

      console.log('✅ AIChatService: Request successful', {
        requestId,
        responseLength: normalizedResponse.response.length,
        provider: normalizedResponse.provider_used,
        tokens: normalizedResponse.tokens_used
      });

      return normalizedResponse;

    } catch (error: any) {
      console.error('🔥 AIChatService: Request failed', { requestId, error: error.message });
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  isRequestActive(requestId?: string): boolean {
    if (!requestId) return this.activeRequests.size > 0;
    return this.activeRequests.get(requestId) || false;
  }

  cancelRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

export const aiChatService = AIChatService.getInstance();