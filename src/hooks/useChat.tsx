// ============= Unified Chat Hook =============

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { aiChatService } from '@/services/AIChatService';
import { chatSessionService } from '@/services/ChatSessionService';
import { ChatMessage, ChatSession, ChatState } from '@/types/chat';

export const useChat = (sessionId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackActivity } = useAnalytics();
  const { canUseAI, currentUsage, quotaLimit, incrementUsage, planName } = useAIUsage();
  const { getSelectedModel } = useUserModelAccess();

  const [state, setState] = useState<ChatState>({
    messages: [],
    currentSession: null,
    isLoading: false,
    error: null
  });

  const isInitializedRef = useRef(false);

  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateState({ error });
    if (error) {
      console.error('🔥 useChat: Error occurred', error);
    }
  }, [updateState]);

  const loadSession = useCallback(async (targetSessionId: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      const session = await chatSessionService.loadSession(targetSessionId, user.id);
      const messages = await chatSessionService.loadMessages(targetSessionId);

      updateState({
        currentSession: session,
        messages,
        isLoading: false
      });

      console.log('✅ useChat: Session loaded successfully', targetSessionId);
    } catch (error: any) {
      console.error('❌ useChat: Failed to load session', targetSessionId, error);
      setError(error.message);
      updateState({ isLoading: false });
    }
  }, [user, updateState, setError]);

  const createNewSession = useCallback(async (title?: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      const session = await chatSessionService.createSession(user.id, title);
      
      updateState({
        currentSession: session,
        messages: [],
        isLoading: false
      });

      await trackActivity('session_created', `New session: ${session.id}`);
      
      console.log('✅ useChat: New session created', session.id);
      return session;
    } catch (error: any) {
      console.error('❌ useChat: Failed to create session', error);
      setError(error.message);
      updateState({ isLoading: false });
      
      toast({
        title: "Session Error",
        description: "Failed to create new chat session.",
        variant: "destructive",
      });
    }
  }, [user, updateState, setError, trackActivity, toast]);

  const sendMessage = useCallback(async (messageContent: string) => {
    if (!user || !state.currentSession) {
      setError('No active session');
      return;
    }

    if (!messageContent.trim()) {
      return;
    }

    if (!canUseAI) {
      toast({
        title: "AI Usage Limit Reached",
        description: `You've reached your ${planName} plan limit of ${quotaLimit} AI interactions this month.`,
        variant: "destructive"
      });
      return;
    }

    const selectedModel = getSelectedModel();
    if (!selectedModel?.provider_id) {
      setError('No AI model selected');
      toast({
        title: "Model Error",
        description: "No AI model selected. Please select a model first.",
        variant: "destructive"
      });
      return;
    }

    try {
      updateState({ isLoading: true, error: null });

      // Save user message
      const userMessage = await chatSessionService.saveMessage(
        state.currentSession.id,
        'user',
        messageContent
      );

      updateState({
        messages: [...state.messages, userMessage]
      });

      // Update session title if this is the first message
      if (state.messages.length === 0) {
        await chatSessionService.updateSessionTitle(state.currentSession.id, messageContent);
      }

      // Prepare AI request
      const requestPayload = {
        message: messageContent,
        sessionId: state.currentSession.id,
        selectedModelId: selectedModel.provider_id,
        conversationHistory: state.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };

      // Send to AI
      const response = await aiChatService.sendMessage(requestPayload);

      if (!response.response) {
        throw new Error('No response from AI service');
      }

      // Save assistant message
      const assistantMessage = await chatSessionService.saveMessage(
        state.currentSession.id,
        'assistant',
        response.response,
        response.provider_used,
        response.tokens_used
      );

      updateState({
        messages: [...state.messages, userMessage, assistantMessage],
        isLoading: false
      });

      // Update usage
      await incrementUsage();

      // Track success
      await trackActivity('ai_interaction_success', 
        `Provider: ${response.provider_used}, Tokens: ${response.tokens_used || 0}`
      );

      console.log('✅ useChat: Message sent successfully');

    } catch (error: any) {
      console.error('🔥 useChat: Failed to send message', error);
      
      setError(error.message);
      updateState({ isLoading: false });

      await trackActivity('ai_interaction_failed', `Error: ${error.message}`);

      toast({
        title: "AI Request Failed",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  }, [
    user, 
    state.currentSession, 
    state.messages, 
    canUseAI, 
    quotaLimit, 
    planName, 
    getSelectedModel,
    updateState, 
    setError, 
    toast, 
    incrementUsage, 
    trackActivity
  ]);

  const clearSession = useCallback(async () => {
    if (!user || !state.currentSession) return;

    try {
      await chatSessionService.deleteSession(state.currentSession.id, user.id);
      
      updateState({
        messages: [],
        currentSession: null,
        error: null
      });

      console.log('✅ useChat: Session cleared');
    } catch (error: any) {
      console.error('❌ useChat: Failed to clear session', error);
      setError(error.message);
    }
  }, [user, state.currentSession, updateState, setError]);

  const copyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied."
      });
      
      console.log('✅ useChat: Message copied', messageId);
    } catch (error) {
      console.error('❌ useChat: Failed to copy message', error);
      
      toast({
        title: "Copy failed",
        description: "Failed to copy message to clipboard.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Initialize session on mount
  const initialize = useCallback(async () => {
    if (!user || isInitializedRef.current) return;

    try {
      updateState({ isLoading: true, error: null });
      
      if (sessionId) {
        await loadSession(sessionId);
      } else {
        await createNewSession();
      }
      
      isInitializedRef.current = true;
      updateState({ isLoading: false });
    } catch (error) {
      console.error('❌ useChat: Failed to initialize', error);
      updateState({ isLoading: false });
      setError('Failed to initialize chat - please try refreshing');
    }
  }, [user, sessionId, loadSession, createNewSession, updateState, setError]);

  // Handle sessionId changes after initialization
  useEffect(() => {
    if (!user || !sessionId || !isInitializedRef.current) return;
    
    // If sessionId changed and we have a different current session, load the new one
    if (state.currentSession?.id !== sessionId) {
      console.log('📌 useChat: SessionId changed, loading new session', sessionId);
      loadSession(sessionId);
    }
  }, [sessionId, user, state.currentSession?.id, loadSession]);

  return {
    state,
    actions: {
      sendMessage,
      loadSession,
      createNewSession,
      clearSession,
      copyMessage,
      initialize
    },
    metadata: {
      canUseAI,
      currentUsage,
      quotaLimit,
      planName,
      selectedModel: getSelectedModel()
    }
  };
};