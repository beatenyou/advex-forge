import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Copy, MessageSquare, Plus, Square, Send, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { CollapsibleMessage } from '@/components/CollapsibleMessage';

import TextareaAutosize from 'react-textarea-autosize';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAIUsage } from '@/hooks/useAIUsage';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { ChatHeader } from '@/components/ChatHeader';
import { EnhancedHistoryTab } from '@/components/EnhancedHistoryTab';
import { useChatContext } from '@/contexts/ChatContext';
import { useLocation } from 'react-router-dom';
import { AIStatusRecovery } from '@/components/AIStatusRecovery';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  provider_name?: string;
  tokens_used?: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SavedPrompt {
  id: string;
  title: string;
  prompt_text: string;
  category: string;
  is_favorite: boolean;
}

interface ChatSessionProps {
  onClear?: () => void;
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
}

export const ChatSession = ({ onClear, sessionId, initialPrompt, onSessionChange }: ChatSessionProps) => {
  const { user } = useAuth();
  const { trackActivity, trackPerformance } = useAnalytics();
  const { canUseAI, currentUsage, quotaLimit, planName, refreshQuota } = useAIUsage();
  const { selectedModel, selectedModelId, getSelectedModel, refreshModels } = useUserModelAccess();
  const location = useLocation();
  
  // Use global chat context for state management
  const {
    messages, setMessages,
    currentSession, setCurrentSession,
    streamingState, setStreamingState,
    currentQuestion, setCurrentQuestion,
    isLoading, setIsLoading,
    isSending, setIsSending,
    restoreStateFromModeSwitch
  } = useChatContext();
  
  // Local state for UI-specific concerns
  const [requestTimeout, setRequestTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showStopButton, setShowStopButton] = useState(false);
  const isRequestActiveRef = useRef(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [filteredPrompts, setFilteredPrompts] = useState<SavedPrompt[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [collapsedMessages, setCollapsedMessages] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Destructure streaming state for easier access
  const { isStreaming, streamingMessage, abortController, currentProvider } = streamingState;
  
  // Helper to set question locally and in context
  const setQuestion = (value: string) => {
    setCurrentQuestion(value);
  };

  // Function to clear all messages and create new session
  const clearChatAndResetSession = async () => {
    setMessages([]);
    setCurrentSession(null);
    setCollapsedMessages({});
    setStreamingState({
      isStreaming: false,
      streamingMessage: '',
      abortController: null,
      currentProvider: ''
    });
    await loadOrCreateSession();
    // Scroll to top after clearing messages
    setTimeout(scrollToTop, 100);
  };

  // Handle state restoration on mount or navigation
  useEffect(() => {
    const shouldRestoreState = location.state?.preserveChat && !hasRestoredState;
    const isManualSessionLoad = sessionId && !location.state?.preserveChat;
    
    console.log('🔄 ChatSession: Effect triggered', {
      sessionId,
      shouldRestoreState,
      isManualSessionLoad,
      hasRestoredState,
      locationState: location.state
    });
    
    if (shouldRestoreState) {
      console.log('🔄 ChatSession: Attempting state restoration');
      const restored = restoreStateFromModeSwitch();
      setHasRestoredState(true);
      
      if (!restored) {
        console.log('🔄 ChatSession: State restoration failed, loading normally');
        if (sessionId) {
          loadSpecificSession(sessionId);
        } else {
          loadOrCreateSession();
        }
      } else {
        console.log('✅ ChatSession: State restored successfully');
      }
    } else if (isManualSessionLoad || (!hasRestoredState && !sessionId)) {
      // Manual session load or initial load without session
      console.log('🔄 ChatSession: Manual session load or initial load');
      if (sessionId) {
        loadSpecificSession(sessionId);
      } else {
        loadOrCreateSession();
      }
      setHasRestoredState(true);
    }
  }, [sessionId, location.state, hasRestoredState]);

  // Handle initial prompt when component mounts or initialPrompt changes
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() && !currentQuestion && hasRestoredState) {
      setQuestion(initialPrompt);
      // Auto-focus the textarea after setting the prompt
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(initialPrompt.length, initialPrompt.length);
        }
      }, 100);
    }
  }, [initialPrompt, currentQuestion, hasRestoredState]);

  // Fetch saved prompts and check admin status when component mounts
  useEffect(() => {
    fetchSavedPrompts();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Expose clear function to parent component and listen for model changes
  useEffect(() => {
    if (onClear) {
      (window as any).__clearChatFunction = clearChatAndResetSession;
    }

    // Listen for model changes and refresh state immediately
    const handleModelChange = (event: CustomEvent) => {
      console.log('🔄 Model changed in ChatSession:', event.detail);
      const { providerId, model } = event.detail;
      
      // Update current provider display immediately
      setStreamingState({ currentProvider: model?.provider?.name || '' });
      
      // Refresh the model access hook to get latest state
      refreshModels();
      
      // Model switched - no visual indicator needed
      
      console.log('✅ ChatSession model change handled and refreshed:', { 
        providerId, 
        modelName: model?.provider?.name,
        refreshTriggered: true,
        visualIndicatorAdded: messages.length > 0
      });
    };

    window.addEventListener('modelChanged', handleModelChange as EventListener);

    return () => {
      if ((window as any).__clearChatFunction) {
        delete (window as any).__clearChatFunction;
      }
      window.removeEventListener('modelChanged', handleModelChange as EventListener);
    };
  }, [onClear, refreshModels]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchSavedPrompts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_prompts')
        .select('id, title, prompt_text, category, is_favorite')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('title', { ascending: true });

      if (error) throw error;
      setSavedPrompts(data || []);
    } catch (error) {
      console.error('Error fetching saved prompts:', error);
    }
  };

  const handlePromptSearch = (searchTerm: string) => {
    if (!searchTerm || !searchTerm.startsWith('/')) {
      setShowPromptSuggestions(false);
      setFilteredPrompts([]);
      return;
    }

    const searchQuery = searchTerm.slice(1).toLowerCase(); // Remove the '/'
    
    if (searchQuery === '') {
      // Show all prompts when user just types '/'
      setFilteredPrompts(savedPrompts);
      setShowPromptSuggestions(true);
    } else {
      // Filter prompts by title, category, or content
      const filtered = savedPrompts.filter(prompt => 
        prompt.title.toLowerCase().includes(searchQuery) ||
        prompt.category.toLowerCase().includes(searchQuery) ||
        prompt.prompt_text.toLowerCase().includes(searchQuery)
      );
      setFilteredPrompts(filtered);
      setShowPromptSuggestions(filtered.length > 0);
    }
  };

  const selectPrompt = (prompt: SavedPrompt) => {
    setQuestion(prompt.prompt_text);
    setShowPromptSuggestions(false);
    setFilteredPrompts([]);
    
    // Focus the textarea after selection
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const scrollToTop = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = 0;
      }
    }
  };

  const loadSpecificSession = async (sessionId: string, retryCount = 0) => {
    console.log('📚 ChatSession: Loading specific session', { sessionId, retryCount });
    
    try {
      setIsLoadingSession(true);
      setLoadingError(null);
      
      // Load specific session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user?.id) // Ensure user can only load their own sessions
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116' && retryCount < 2) {
          // Session not found, retry once
          console.log('🔄 ChatSession: Session not found, retrying...', retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          return loadSpecificSession(sessionId, retryCount + 1);
        }
        throw sessionError;
      }

      console.log('✅ ChatSession: Session loaded', session);
      setCurrentSession(session);
      await loadMessages(session.id);
      
      // Notify parent component about session change
      if (onSessionChange && session.id !== sessionId) {
        onSessionChange(session.id);
      }
      
    } catch (error) {
      console.error('❌ ChatSession: Error loading specific session:', error);
      setLoadingError(`Failed to load session: ${error.message}`);
      
      toast({
        title: "Error",
        description: "Failed to load chat session",
        variant: "destructive",
      });
      
      // If it's a critical error, fall back to creating a new session
      if (retryCount >= 2) {
        console.log('🔄 ChatSession: Max retries reached, creating new session');
        await loadOrCreateSession();
      }
    } finally {
      setIsLoadingSession(false);
    }
  };

  const loadOrCreateSession = async () => {
    try {
      // Get the most recent active session for the user
      const { data: sessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      let session = sessions?.[0];

      if (!session) {
        // Create a new session if none exists
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user?.id,
            title: 'New Conversation'
          })
          .select()
          .single();

        if (createError) throw createError;
        session = newSession;
      }

      setCurrentSession(session);
      await loadMessages(session.id);
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Error",
        description: "Failed to load chat session",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messages = (data || []) as ChatMessage[];
      setMessages(messages);
      
      // Auto-collapse long AI messages when loading from database
      const newCollapsedStates: Record<string, boolean> = {};
      messages.forEach(message => {
        if (message.role === 'assistant') {
          const shouldAutoCollapse = (
            message.content.length > 500 ||
            message.content.split('\n').length > 8 ||
            (message.content.match(/```/g) || []).length >= 2 ||
            (message.content.match(/^[\s]*[-\*\+]\s/gm) || []).length > 5
          );
          
          if (shouldAutoCollapse) {
            newCollapsedStates[message.id] = true;
          }
        }
      });
      
      setCollapsedMessages(prev => ({ ...prev, ...newCollapsedStates }));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    console.log('📚 ChatSession: Session selected from history', sessionId);
    
    try {
      await loadSpecificSession(sessionId);
      setShowHistory(false); // Close history only after successful load
      console.log('✅ ChatSession: Session selection completed', sessionId);
    } catch (error) {
      console.error('❌ ChatSession: Session selection failed', sessionId, error);
      // Keep history open if session loading failed
    }
  };

  const handleToggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const handleHistoryNewSession = () => {
    createNewSession();
    setShowHistory(false);
  };

  const createNewSession = async () => {
    console.log('🆕 Creating new session - showHistory state:', showHistory);
    
    try {
      // Reset history view first to ensure proper state
      setShowHistory(false);
      
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user?.id,
          title: 'New Conversation'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ New session created:', newSession.id);

      setCurrentSession(newSession);
      setMessages([]);
      setCollapsedMessages({});
      setQuestion('');
      
      // Log session creation
      if (user) {
        await supabase.rpc('log_session_activity', {
          p_user_id: user.id,
          p_session_id: newSession.id,
          p_action: 'session_created',
          p_details: { title: newSession.title },
          p_user_agent: navigator.userAgent
        });
      }
      
      // Scroll to top after creating new session
      setTimeout(scrollToTop, 100);
      
      console.log('🎯 New session setup complete - returning to chat view');
    } catch (error) {
      console.error('❌ Error creating new session:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
    }
  };

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    
    try {
      await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, providerName?: string, tokensUsed?: number) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          provider_name: providerName,
          tokens_used: tokensUsed
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };


  const stopStreaming = () => {
    console.log('🛑 Stopping AI request...');
    
    if (abortController) {
      abortController.abort();
      setStreamingState({ abortController: null });
      console.log('✅ Abort controller signaled');
    }
    
    if (requestTimeout) {
      clearTimeout(requestTimeout);
      setRequestTimeout(null);
      console.log('✅ Request timeout cleared');
    }
    
    setStreamingState({
      isStreaming: false,
      streamingMessage: ''
    });
    setIsLoading(false);
    setShowStopButton(false);
    
    toast({
      title: "Request Stopped",
      description: "AI request has been cancelled",
    });
    
    console.log('✅ AI request stopped successfully');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isLoading || isSending || !currentSession) return;

    // Reset all states at the beginning to ensure clean start
    setShowStopButton(false);
    isRequestActiveRef.current = true; // Mark request as active
    setStreamingState({
      streamingMessage: '',
      isStreaming: false,
      currentProvider: '',
      abortController: null
    });

    // Check AI quota before sending
    if (!canUseAI) {
      toast({
        title: "AI Usage Limit Reached",
        description: `You've reached your ${planName} plan limit of ${quotaLimit} AI interactions this month. Upgrade your plan for more usage.`,
        variant: "destructive"
      });
      return;
    }

    const userQuestion = currentQuestion.trim();
    const startTime = performance.now();
    setQuestion('');
    setIsSending(true);

    // Track chat activity
    await trackActivity('chat_message_sent', `Sent message: ${userQuestion.substring(0, 50)}...`);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setStreamingState({ abortController: controller });

    // Set timeout to show stop button after 45 seconds with race condition protection
    const timeout = setTimeout(() => {
      // Only show stop button if request is still active
      if (isRequestActiveRef.current) {
        console.log('⏰ 45-second timeout reached - showing stop button');
        setShowStopButton(true);
      } else {
        console.log('⏰ 45-second timeout reached but request is no longer active - not showing stop button');
      }
    }, 45000);
    setRequestTimeout(timeout);

    try {
      // Save user message
      const userMessage = await saveMessage(currentSession.id, 'user', userQuestion);
      setMessages([...messages, userMessage as ChatMessage]);
      setIsSending(false);
      setIsLoading(true);

      // Update session title if this is the first message
      if (messages.length === 0) {
        await updateSessionTitle(currentSession.id, userQuestion);
      }

      // Get conversation context (last 20 messages)
      const conversationContext = messages.slice(-19).concat([userMessage as ChatMessage]);

      // Get the most current selected model and validate it exists
      const currentSelectedModel = getSelectedModel();
      const modelIdToUse = currentSelectedModel?.provider_id;
      
      console.log('🤖 Making AI chat router call - User:', user?.id, 'Session:', currentSession.id);
      console.log('🎯 Model selection validation:', { 
        selectedModelObject: currentSelectedModel,
        modelIdToUse,
        modelName: currentSelectedModel?.provider?.name,
        modelType: currentSelectedModel?.provider?.type,
        isValidModel: !!currentSelectedModel,
        selectedModelIdFromHook: selectedModelId
      });
      
      // Validate model selection before making request
      if (!modelIdToUse) {
        throw new Error('No AI model selected. Please select a model first.');
      }
      
      // Enhanced payload preparation with debugging
      const requestPayload = {
        message: userQuestion,
        messages: conversationContext,
        sessionId: currentSession.id,
        selectedModelId: modelIdToUse
      };
      
      console.log('🚀 Making AI request with payload:', {
        message: userQuestion.substring(0, 100) + '...',
        messagesCount: conversationContext.length,
        sessionId: currentSession.id,
        selectedModelId: modelIdToUse,
        payloadSize: JSON.stringify(requestPayload).length,
        hasValidSession: !!currentSession.id,
        hasValidModel: !!modelIdToUse
      });
      
      // Log the exact request being sent for debugging
      console.log('📤 Full request payload:', JSON.stringify(requestPayload, null, 2));

      const result = await Promise.race([
        supabase.functions.invoke('ai-chat-router', {
          body: requestPayload,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Add fallback headers for Supabase infrastructure issue
            'X-Message': encodeURIComponent(requestPayload.message || ''),
            'X-Model-Id': requestPayload.selectedModelId || '',
            'X-Session-Id': requestPayload.sessionId || ''
          }
        }),
        // Increased timeout to 60 seconds to handle slower responses
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 60 seconds - please try again')), 60000)
        )
      ]) as { data: any; error: any };
      
      const { data, error } = result;
      console.log('🤖 AI chat router response received:', { 
        data: data ? { providerName: data.providerName, providerId: data.providerId } : null, 
        selectedModelSent: modelIdToUse,
        actualProviderUsed: data?.providerId,
        modelMatch: modelIdToUse === data?.providerId,
        error: error?.message 
      });
      
      // Verify the correct model was used
      if (data && modelIdToUse !== data.providerId) {
        console.warn('⚠️ Model mismatch! Requested:', modelIdToUse, 'Used:', data.providerId);
      }

      // Handle quota exceeded error specifically
      if (error && error.message?.includes('quota exceeded')) {
        await refreshQuota(); // Refresh quota state
        throw new Error(`AI usage quota exceeded. You've used ${currentUsage}/${quotaLimit} AI interactions this month.`);
      }

      if (error) {
        console.error('❌ AI Chat Router Error:', error);
        
        // Clear loading states immediately on error
        setIsLoading(false);
        setIsSending(false);
        setShowStopButton(false);
        if (requestTimeout) {
          clearTimeout(requestTimeout);
          setRequestTimeout(null);
        }
        
        // Enhanced user-friendly error messages with better classification
        let errorMessage = 'Failed to get AI response. Please try again.';
        let retryable = true;
        
        if (error.message?.includes('quota exceeded')) {
          errorMessage = `AI usage quota exceeded. You've used ${currentUsage}/${quotaLimit} AI interactions this month.`;
          retryable = false;
        } else if (error.message?.includes('timeout') || error.message?.includes('60 seconds')) {
          errorMessage = 'Request timed out after 60 seconds. Please try again with a shorter message.';
        } else if (error.message?.includes('Empty request body') || error.message?.includes('Request body is empty') || error.message?.includes('deployment') || error.message?.includes('configuration issue')) {
          errorMessage = 'Edge function deployment issue detected. The AI chat router is not receiving request bodies properly. Please contact support to resolve this configuration issue.';
          retryable = false;
        } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('NetworkError')) {
          errorMessage = 'Network connection issue. Please check your connection and try again.';
        } else if (error.message?.includes('authentication') || error.message?.includes('Invalid authentication')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.';
          retryable = false;
        } else if (error.message?.includes('API key') || error.message?.includes('not configured')) {
          errorMessage = 'AI service configuration issue. Please contact support.';
          retryable = false;
        } else if (error.message?.includes('provider') || error.message?.includes('inactive')) {
          errorMessage = 'AI service temporarily unavailable. Please try again in a moment.';
        } else if (error.message?.includes('Model not found') || error.message?.includes('model access')) {
          errorMessage = 'Selected AI model is not available. Please select a different model.';
          retryable = false;
        }
        
        toast({
          title: "AI Error",
          description: errorMessage,
          variant: "destructive",
          action: retryable ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Retry the same request
                setQuestion(userQuestion);
                setTimeout(() => handleSubmit(e), 100);
              }}
            >
              Retry
            </Button>
          ) : undefined,
        });

        // Enhanced error logging with detailed context
        const errorContext = {
          user_id: user?.id,
          session_id: currentSession?.id,
          error_message: error.message,
          error_stack: error.stack,
          request_timestamp: new Date().toISOString(),
          browser_info: navigator.userAgent,
          user_agent: navigator.userAgent,
          message_preview: userQuestion.substring(0, 100), // First 100 chars for context
          conversation_length: conversationContext.length,
          current_usage: currentUsage,
          quota_limit: quotaLimit,
          plan_name: planName
        };

        // Log detailed error to ai_interactions table
        try {
          await supabase
            .from('ai_interactions')
            .insert({
              user_id: user?.id,
              session_id: currentSession?.id,
              success: false,
              error_type: error.message?.includes('quota') ? 'quota_exceeded' : 
                         error.message?.includes('timeout') ? 'timeout' :
                         error.message?.includes('network') ? 'network_error' : 'unknown_error',
              provider_name: currentProvider || 'unknown',
              request_type: 'chat',
              error_details: {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
              },
              user_context: errorContext,
              browser_info: navigator.userAgent,
              created_at: new Date().toISOString()
            });
        } catch (logError) {
          console.error('Failed to log AI interaction error:', logError);
        }

        throw error;
      }

      // Track AI interaction metrics
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      await trackPerformance('ai_response_time', responseTime, 'milliseconds', 'ai_chat');

      // AI interaction logging is now handled by the AI chat router edge function
      // No need to log here to avoid double counting

      // Clear timeout and stop button since we got a response
      isRequestActiveRef.current = false; // Mark request as inactive
      if (requestTimeout) {
        clearTimeout(requestTimeout);
        setRequestTimeout(null);
      }
      setShowStopButton(false);
      console.log('✅ Request completed successfully - marked as inactive');

      // Set provider information and log usage
      if (data.providerName) {
        setStreamingState({ currentProvider: data.providerName });
        console.log('✅ AI response from provider:', data.providerName, 'Provider ID:', data.providerId);
      }

      // Check if request was aborted
      if (controller.signal.aborted) {
        throw new Error('Request was cancelled');
      }

      // Now switch to streaming state after receiving API response
      setIsLoading(false);
      setStreamingState({
        isStreaming: true,
        streamingMessage: ''
      });

      // Simulate streaming effect
      const fullMessage = data.message;
      
      // Stream the message with optimized speed
      const words = fullMessage.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        // Check if streaming was cancelled
        if (controller.signal.aborted) {
          break;
        }
        
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingState({ streamingMessage: currentText });
        
        // Faster streaming with word-by-word display
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Scroll to bottom during streaming
        scrollToBottom();
      }

      // Only save if not cancelled
      if (!controller.signal.aborted) {
        // Streaming complete - save the full message
        setStreamingState({
          isStreaming: false,
          streamingMessage: ''
        });

        // Save AI response
        const aiMessage = await saveMessage(
          currentSession.id, 
          'assistant', 
          data.message,
          data.providerName,
          data.tokensUsed
        );
        
        setMessages([...messages, aiMessage as ChatMessage]);

        // Auto-collapse long AI responses
        const shouldAutoCollapse = (
          data.message.length > 500 ||
          data.message.split('\n').length > 8 ||
          (data.message.match(/```/g) || []).length >= 2 ||
          (data.message.match(/^[\s]*[-\*\+]\s/gm) || []).length > 5
        );

        if (shouldAutoCollapse) {
          setCollapsedMessages(prev => ({
            ...prev,
            [aiMessage.id]: true
          }));
        }

        // Track successful AI response
        await trackActivity('ai_response_received', `Received response from ${data.providerName || 'unknown'}`);

        // Update session timestamp
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentSession.id);
      }

    } catch (error) {
      // Track failed AI interaction
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // AI interaction error logging is handled by the AI chat router edge function
      // No need to log here to avoid double counting - just log to console for debugging
      console.error('AI Chat Error for user:', user?.id, error.message);

      await trackActivity('ai_response_error', `AI response failed: ${error.message}`);

      // Clear timeout and stop button on error
      isRequestActiveRef.current = false; // Mark request as inactive
      if (requestTimeout) {
        clearTimeout(requestTimeout);
        setRequestTimeout(null);
      }
      setShowStopButton(false);
      console.log('❌ Request failed - marked as inactive');
      
      if (error.message !== 'Request was cancelled') {
        console.error('Error in chat:', error);
        
        // Check if it's a quota exceeded error
        let errorTitle = "Error";
        let errorDescription = "Failed to get AI response. Please try again.";
        
        try {
          // Try to parse the error response to check for quota exceeded
          const errorData = JSON.parse(error.message);
          if (errorData.quota_exceeded) {
            errorTitle = "AI Limit Reached";
            errorDescription = `You've reached your AI interaction limit (${errorData.current_usage}/${errorData.quota_limit}). Purchase more credits in your billing preferences to continue using AI features.`;
          }
        } catch (parseError) {
          // If error message isn't JSON, check if it contains quota information
          if (error.message.includes('quota exceeded') || error.message.includes('usage quota exceeded')) {
            errorTitle = "AI Limit Reached";
            errorDescription = "You've reached your AI interaction limit. Purchase more credits in your billing preferences to continue using AI features.";
          }
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        });
      }
    } finally {
      // Ensure request is marked as inactive in all cases
      isRequestActiveRef.current = false;
      setIsLoading(false);
      setIsSending(false);
      setShowStopButton(false);
      setStreamingState({
        isStreaming: false,
        streamingMessage: '',
        abortController: null
      });
      
      // Clear any remaining timeout
      if (requestTimeout) {
        clearTimeout(requestTimeout);
        setRequestTimeout(null);
      }
      console.log('🔧 Finally block executed - request marked as inactive');
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full min-h-0 relative">
      <ChatHeader
        currentUsage={currentUsage}
        quotaLimit={quotaLimit}
        planName={planName}
        canUseAI={canUseAI}
        onNewChat={createNewSession}
        currentSessionId={currentSession?.id}
        onSessionSelect={handleSessionSelect}
        showHistory={showHistory}
        onToggleHistory={handleToggleHistory}
      />

      <div className="flex-1 overflow-hidden min-h-0">
        {showHistory ? (
          <div className="h-full p-4">
            <EnhancedHistoryTab
              currentSessionId={currentSession?.id}
              onSessionSelect={handleSessionSelect}
              onNewSession={handleHistoryNewSession}
            />
          </div>
        ) : (
          <ScrollArea 
            ref={scrollAreaRef} 
            className="h-full max-h-full p-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation by asking a question below</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-red-950 text-red-100 ml-12'
                          : message.role === 'system'
                          ? 'bg-primary/10 text-primary-foreground mx-4 text-center border border-primary/20'
                          : 'bg-muted mr-12'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="space-y-2">
                          <CollapsibleMessage
                            content={message.content}
                            messageId={message.id}
                            isCollapsed={collapsedMessages[message.id]}
                            onToggleCollapse={(messageId, collapsed) => {
                              setCollapsedMessages(prev => ({
                                ...prev,
                                [messageId]: collapsed
                              }));
                            }}
                          />
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">
                              {message.provider_name && `${message.provider_name} • `}
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyMessage(message.content)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : message.role === 'system' ? (
                        <div className="text-xs font-medium">
                          {message.content}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between text-xs opacity-70">
                            <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyMessage(message.content)}
                                className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Check className="h-3 w-3 text-green-400" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-end">
                    <div className="bg-red-950 text-red-100 rounded-lg p-3 ml-12 max-w-[80%]">
                      <div className="space-y-2">
                        <p className="text-sm">{currentQuestion || "Sending message..."}</p>
                        <div className="flex items-center justify-between text-xs opacity-70">
                          <span>Sending...</span>
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <Send className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isStreaming && streamingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 mr-12">
                      <div className="space-y-2">
                        <MarkdownRenderer content={streamingMessage} />
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">Streaming...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isLoading && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 mr-12">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="relative flex items-center justify-center">
                          <div className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-mono font-bold animate-pulse border border-red-400 shadow-lg shadow-red-500/20">
                            RT
                          </div>
                          <div className="absolute inset-0 bg-red-500/30 rounded-lg animate-ping"></div>
                          <div className="absolute inset-0 bg-red-400/10 rounded-lg animate-pulse"></div>
                        </div>
                        <span className="text-sm text-muted-foreground animate-pulse">Processing...</span>
                        {currentProvider && (
                          <span className="text-xs text-muted-foreground/60 ml-2">
                            via {currentProvider}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {showStopButton ? (
                  <div className="flex justify-center p-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopStreaming}
                      className="bg-background/50 backdrop-blur-sm border-red-500/20 hover:bg-red-500/10"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Request
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2 flex items-center">
                      Request taking longer than expected
                    </span>
                  </div>
                ) : null}

                {/* AI Status Recovery - Show when there are sync issues */}
                {!selectedModel && user && (
                  <div className="flex justify-center p-4">
                    <AIStatusRecovery onRecoveryComplete={() => {
                      console.log('🔧 AI status recovery completed');
                    }} />
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Input section - hidden when showing history */}
      {!showHistory && (
        <div className="border-t border-border bg-background/95 backdrop-blur-sm shrink-0 relative">
        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Popover open={showPromptSuggestions} onOpenChange={setShowPromptSuggestions}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <TextareaAutosize
                      ref={textareaRef}
                      placeholder="Type your message... (Use / for saved prompts)"
                      value={currentQuestion}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        handlePromptSearch(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isSending && currentQuestion.trim()) {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }
                        if (e.key === 'Escape') {
                          setShowPromptSuggestions(false);
                        }
                      }}
                      className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading || isSending}
                      minRows={1}
                      maxRows={6}
                    />
                  </div>
                </PopoverTrigger>
                {showPromptSuggestions && filteredPrompts.length > 0 && (
                  <PopoverContent className="w-[400px] p-0" align="start" side="top">
                    <Command>
                      <CommandInput placeholder="Search saved prompts..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No saved prompts found.</CommandEmpty>
                        <CommandGroup heading="Saved Prompts">
                          {filteredPrompts.map((prompt) => (
                            <CommandItem
                              key={prompt.id}
                              onSelect={() => selectPrompt(prompt)}
                              className="cursor-pointer hover:bg-muted/50 data-[selected=true]:bg-muted"
                            >
                              <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground">{prompt.title}</span>
                                  <div className="flex items-center gap-1">
                                    {prompt.is_favorite && (
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                    )}
                                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                      {prompt.category}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {prompt.prompt_text}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
            </div>
             {showStopButton ? (
              <Button 
                type="button" 
                variant="destructive" 
                size="sm"
                onClick={stopStreaming}
                className="flex items-center gap-2 px-3 py-2 shrink-0"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
             ) : (
                <Button
                  type="submit" 
                  disabled={isLoading || isSending || !currentQuestion.trim()}
                  size="sm"
                  className="px-4 py-2"
                >
                  {isLoading || isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};