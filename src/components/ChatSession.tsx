import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Copy, CheckCheck, History, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { SessionHistory } from "./SessionHistory";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useAIUsage } from "@/hooks/useAIUsage";
import { useUserModelAccess } from "@/hooks/useUserModelAccess";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAIChatDebugger } from "@/hooks/useAIChatDebugger";
import { useAIChatErrorHandler } from "@/hooks/useAIChatErrorHandler";
import { useReliableAIChat } from "@/hooks/useReliableAIChat";
import { ChatDebugPanel } from "./ChatDebugPanel";
import TextareaAutosize from 'react-textarea-autosize';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  session_id: string;
  tokens_used?: number;
  provider_name?: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSessionProps {
  onClear?: () => void;
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
}

export const ChatSession = ({ onClear, sessionId, initialPrompt, onSessionChange }: ChatSessionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackActivity } = useAnalytics();
  
  // Simplified debugging to fix network issues
  const aiDebugger = useAIChatDebugger();
  const errorHandler = useAIChatErrorHandler();
  
  // Reliable AI chat with enhanced retry logic
  const reliableAIChat = useReliableAIChat({
    maxRetries: 3,
    retryDelay: 1000,
    useProgressiveFallback: true
  });
  
  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [question, setQuestion] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [collapsedMessages, setCollapsedMessages] = useState<Record<string, boolean>>({});
  
  // AI usage and model state
  const { canUseAI, currentUsage, quotaLimit, incrementUsage, refreshQuota, planName } = useAIUsage();
  const { getSelectedModel } = useUserModelAccess();
  
  // Ref to prevent multiple requests
  const isRequestActiveRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load or create session
  useEffect(() => {
    const initializeSession = async () => {
      if (!user) return;

      try {
        if (sessionId) {
          await loadSpecificSession(sessionId);
        } else {
          await createNewSession();
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };

    initializeSession();
  }, [user, sessionId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadSpecificSession = async (sessionId: string) => {
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user?.id)
        .single();

      if (sessionError) throw sessionError;

      setCurrentSession(sessionData);
      await loadMessages(sessionId);
      
      console.log('✅ Session loaded successfully:', sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
      await createNewSession();
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
      
      // Auto-collapse long AI messages
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

  const createNewSession = async () => {
    try {
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
      
      // Notify parent component about session change
      onSessionChange?.(newSession.id);
      
      // Track session creation
      await trackActivity('session_created', `New session: ${newSession.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Session Error",
        description: "Failed to create new chat session.",
        variant: "destructive",
      });
    }
  };

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    try {
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + "..." 
        : firstMessage;
      
      await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const saveMessage = async (
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string,
    providerName?: string,
    tokensUsed?: number
  ) => {
    try {
      const messageData = {
        session_id: sessionId,
        role,
        content,
        ...(providerName && { provider_name: providerName }),
        ...(tokensUsed && { tokens_used: tokensUsed })
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!question.trim()) {
      console.log('❌ Empty question submitted');
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the AI chat.",
        variant: "destructive"
      });
      return;
    }

    if (!currentSession) {
      toast({
        title: "Session Error",
        description: "No chat session available. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    // Check AI quota
    if (!canUseAI) {
      toast({
        title: "AI Usage Limit Reached",
        description: `You've reached your ${planName} plan limit of ${quotaLimit} AI interactions this month.`,
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (isRequestActiveRef.current) {
      console.log('⚠️ Request already in progress, ignoring new submission');
      return;
    }

    const userQuestion = question.trim();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setQuestion(''); // Clear input immediately
    isRequestActiveRef.current = true;
    setIsLoading(true);

    console.log('🚀 Starting AI request - User:', user.id, 'Session:', currentSession.id);

    try {
      // Start request tracking
      const currentSelectedModel = getSelectedModel();
      const modelIdToUse = currentSelectedModel?.provider_id;
      const modelName = 'AI Model'; // Simplified for now
      
      if (!modelIdToUse) {
        throw new Error('No AI model selected. Please select a model first.');
      }
      
      aiDebugger.startRequestTracking(requestId, modelIdToUse, modelName);

      // Save user message immediately
      const userMessage = await saveMessage(currentSession.id, 'user', userQuestion);
      setMessages(prev => [...prev, userMessage as ChatMessage]);

      // Update session title if this is the first message
      if (messages.length === 0) {
        await updateSessionTitle(currentSession.id, userQuestion);
      }

      
      
      // Prepare request payload for reliable AI chat
      const requestPayload = {
        message: userQuestion,
        sessionId: currentSession.id,
        selectedModelId: modelIdToUse,
        conversationHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        conversationId: currentSession.id,
        requestId,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Request payload prepared:', {
        messageLength: userQuestion.length,
        historyLength: messages.length,
        modelId: modelIdToUse,
        sessionId: currentSession.id,
        requestId
      });

      

      // Use reliable AI chat with enhanced error handling and retries
      const data = await reliableAIChat.sendMessage(requestPayload);

      if (!data) {
        throw new Error('No response received from AI service');
      }

      console.log('✅ AI response received:', {
        responseLength: data.response?.length,
        success: data.success,
        provider: data.provider_used,
        tokensUsed: data.tokens_used,
        requestId
      });

      // Validate response
      if (!data.success || !data.response) {
        throw new Error(data.error || 'Invalid response from AI service');
      }

      // Increment AI usage
      await incrementUsage();

      // Save assistant message
      const assistantMessage = await saveMessage(
        currentSession.id, 
        'assistant', 
        data.response,
        data.provider_used,
        data.tokens_used
      );
      
      setMessages(prev => [...prev, assistantMessage as ChatMessage]);

      // End request tracking with success
      aiDebugger.endRequestTracking(
        requestId,
        modelIdToUse,
        true,
        data.tokens_used
      );

      // Update session debug info
      aiDebugger.updateSessionDebugInfo(
        currentSession.id,
        messages.length + 2, // +2 for user and assistant messages just added
        (messages.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0)) + (data.tokens_used || 0)
      );

      console.log('✅ Chat interaction completed successfully');
      
      // Track successful interaction
      await trackActivity('ai_interaction_success', 
        `Provider: ${data.provider_used}, Tokens: ${data.tokens_used || 0}, Retries: ${reliableAIChat.retryCount}`
      );

    } catch (error: any) {
      console.error('🔥 AI request failed:', error);
      
      // Get model info for error tracking
      const currentSelectedModel = getSelectedModel();
      const modelIdForError = currentSelectedModel?.provider_id || 'unknown';
      
      // End request tracking with failure
      aiDebugger.endRequestTracking(
        requestId,
        modelIdForError,
        false,
        undefined,
        error.name || 'unknown_error',
        error.message
      );

      // Handle error with user-friendly messaging
      errorHandler.handleError(error, {
        requestId,
        sessionId: currentSession.id,
        modelId: modelIdForError
      });
      
      // Track failed interaction
      await trackActivity('ai_interaction_failed', 
        `Error: ${error.message}, Retries: ${reliableAIChat.retryCount}`
      );
      
    } finally {
      isRequestActiveRef.current = false;
      setIsLoading(false);
    }
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied.",
      });
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy message to clipboard.",
        variant: "destructive",
      });
    }
  };

  const toggleMessageCollapse = (messageId: string) => {
    setCollapsedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleSessionSelect = async (sessionId: string) => {
    console.log('📚 ChatSession: Session selected from history', sessionId);
    
    try {
      await loadSpecificSession(sessionId);
      setShowHistory(false);
      onSessionChange?.(sessionId);
      console.log('✅ ChatSession: Session selection completed', sessionId);
    } catch (error) {
      console.error('❌ ChatSession: Session selection failed', sessionId, error);
    }
  };

  const handleNewSession = () => {
    createNewSession();
    setShowHistory(false);
  };

  const clearChat = async () => {
    if (currentSession) {
      try {
        // Delete all messages for this session
        await supabase
          .from('chat_messages')
          .delete()
          .eq('session_id', currentSession.id);

        // Delete the session
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', currentSession.id);

        console.log('✅ Chat cleared successfully');
        
        // Create a new session
        await createNewSession();
        
        onClear?.();
      } catch (error) {
        console.error('Error clearing chat:', error);
        toast({
          title: "Error",
          description: "Failed to clear chat.",
          variant: "destructive",
        });
      }
    }
  };

  if (!user) {
    return (
      <Card className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to use the AI chat.</p>
        </div>
      </Card>
    );
  }

  if (showHistory) {
    return (
      <SessionHistory
        currentSessionId={currentSession?.id}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span className="font-medium">AI Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(true)}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
          >
            Clear
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        AI Assistant
                        {message.provider_name && ` • ${message.provider_name}`}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyMessage(message.content, message.id)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedMessageId === message.id ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        {(message.content.length > 500 || message.content.split('\n').length > 8) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMessageCollapse(message.id)}
                            className="h-6 w-6 p-0"
                          >
                            {collapsedMessages[message.id] ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className={collapsedMessages[message.id] ? 'line-clamp-3' : ''}>
                      <MarkdownRenderer content={message.content} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-primary-foreground/70 mb-1">You</div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <TextareaAutosize
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 min-h-[40px] max-h-32 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !question.trim()}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {!canUseAI && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            AI usage limit reached ({currentUsage}/{quotaLimit}). Upgrade for more usage.
          </div>
        )}
      </div>

      {/* Debug Panel - only show in development or when debug mode is enabled */}
      <ChatDebugPanel 
        sessionId={currentSession?.id}
        messageCount={messages.length}
        totalTokensUsed={messages.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0)}
      />
    </div>
  );
};