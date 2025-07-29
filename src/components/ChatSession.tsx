import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Copy, MessageSquare, Plus, Square, Send, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AIStatusIndicator } from '@/components/AIStatusIndicator';
import TextareaAutosize from 'react-textarea-autosize';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAIUsage } from '@/hooks/useAIUsage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
}

export const ChatSession = ({ onClear, sessionId }: ChatSessionProps) => {
  const { user } = useAuth();
  const { trackActivity, trackPerformance } = useAnalytics();
  const { canUseAI, currentUsage, quotaLimit, planName, refreshQuota } = useAIUsage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [requestTimeout, setRequestTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showStopButton, setShowStopButton] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [filteredPrompts, setFilteredPrompts] = useState<SavedPrompt[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to clear all messages and create new session
  const clearChatAndResetSession = async () => {
    setMessages([]);
    setCurrentSession(null);
    await loadOrCreateSession();
    // Scroll to top after clearing messages
    setTimeout(scrollToTop, 100);
  };

  useEffect(() => {
    loadOrCreateSession();
    fetchSavedPrompts();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Expose clear function to parent component
  useEffect(() => {
    if (onClear) {
      (window as any).__clearChatFunction = clearChatAndResetSession;
    }
    return () => {
      if ((window as any).__clearChatFunction) {
        delete (window as any).__clearChatFunction;
      }
    };
  }, [onClear]);

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

  const loadOrCreateSession = async () => {
    try {
      // Get the most recent active session
      const { data: sessions, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
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
            user_id: (await supabase.auth.getUser()).data.user?.id,
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
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: 'New Conversation'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(newSession);
      setMessages([]);
      setQuestion('');
      // Scroll to top after creating new session
      setTimeout(scrollToTop, 100);
    } catch (error) {
      console.error('Error creating new session:', error);
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
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    if (requestTimeout) {
      clearTimeout(requestTimeout);
      setRequestTimeout(null);
    }
    setIsStreaming(false);
    setStreamingMessage('');
    setIsLoading(false);
    setShowStopButton(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || isSending || !currentSession) return;

    // Check AI quota before sending
    if (!canUseAI) {
      toast({
        title: "AI Usage Limit Reached",
        description: `You've reached your ${planName} plan limit of ${quotaLimit} AI interactions this month. Upgrade your plan for more usage.`,
        variant: "destructive"
      });
      return;
    }

    const userQuestion = question.trim();
    const startTime = performance.now();
    setQuestion('');
    setIsSending(true);
    setStreamingMessage('');
    setIsStreaming(false);
    setCurrentProvider('');

    // Track chat activity
    await trackActivity('chat_message_sent', `Sent message: ${userQuestion.substring(0, 50)}...`);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    // Set timeout to show stop button after 30 seconds
    const timeout = setTimeout(() => {
      setShowStopButton(true);
    }, 30000);
    setRequestTimeout(timeout);

    try {
      // Save user message
      const userMessage = await saveMessage(currentSession.id, 'user', userQuestion);
      setMessages(prev => [...prev, userMessage as ChatMessage]);
      setIsSending(false);
      setIsLoading(true);

      // Update session title if this is the first message
      if (messages.length === 0) {
        await updateSessionTitle(currentSession.id, userQuestion);
      }

      // Get conversation context (last 20 messages)
      const conversationContext = messages.slice(-19).concat([userMessage as ChatMessage]);

      // Start streaming
      // Call AI with conversation context (keep loading state during API call)
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: userQuestion,
          messages: conversationContext,
          sessionId: currentSession.id
        }
      });

      // Handle quota exceeded error specifically
      if (error && error.message?.includes('quota exceeded')) {
        await refreshQuota(); // Refresh quota state
        throw new Error(`AI usage quota exceeded. You've used ${currentUsage}/${quotaLimit} AI interactions this month.`);
      }

      if (error) throw error;

      // Track AI interaction metrics
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      await trackPerformance('ai_response_time', responseTime, 'milliseconds', 'ai_chat');

      // AI interaction logging is now handled by the AI chat router edge function
      // No need to log here to avoid double counting

      // Clear timeout and stop button since we got a response
      if (requestTimeout) {
        clearTimeout(requestTimeout);
        setRequestTimeout(null);
      }
      setShowStopButton(false);

      // Set provider information
      if (data.providerName) {
        setCurrentProvider(data.providerName);
      }

      // Check if request was aborted
      if (controller.signal.aborted) {
        throw new Error('Request was cancelled');
      }

      // Now switch to streaming state after receiving API response
      setIsLoading(false);
      setIsStreaming(true);

      // Simulate streaming effect
      const fullMessage = data.message;
      setStreamingMessage('');
      
      // Stream the message with optimized speed
      const words = fullMessage.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        // Check if streaming was cancelled
        if (controller.signal.aborted) {
          break;
        }
        
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingMessage(currentText);
        
        // Faster streaming with word-by-word display
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Scroll to bottom during streaming
        scrollToBottom();
      }

      // Only save if not cancelled
      if (!controller.signal.aborted) {
        // Streaming complete - save the full message
        setIsStreaming(false);
        setStreamingMessage('');

        // Save AI response
        const aiMessage = await saveMessage(
          currentSession.id, 
          'assistant', 
          data.message,
          data.providerName,
          data.tokensUsed
        );
        
        setMessages(prev => [...prev, aiMessage as ChatMessage]);

        // Track successful AI response
        await trackActivity('ai_response_received', `Received response from ${data.providerName || 'unknown'}`);
        
        // Refresh quota after successful interaction
        await refreshQuota();

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
      if (requestTimeout) {
        clearTimeout(requestTimeout);
        setRequestTimeout(null);
      }
      setShowStopButton(false);
      
      if (error.message !== 'Request was cancelled') {
        console.error('Error in chat:', error);
        toast({
          title: "Error",
          description: "Failed to get AI response. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsSending(false);
      setIsStreaming(false);
      setStreamingMessage('');
      setAbortController(null);
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
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5" />
            {currentSession?.title || 'New Conversation'}
          </h2>
          <div className="flex items-center gap-2">
            <AIStatusIndicator />
            <Button
              variant="outline"
              size="sm"
              onClick={createNewSession}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
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
                        : 'bg-muted mr-12'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="space-y-2">
                        <MarkdownRenderer content={message.content} />
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
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between text-xs opacity-70">
                          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                          <Check className="h-3 w-3 text-green-400" />
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
                      <p className="text-sm">{question || "Sending message..."}</p>
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

              {(isStreaming && !isSending) || showStopButton ? (
                <div className="flex justify-center p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopStreaming}
                    className="bg-background/50 backdrop-blur-sm border-red-500/20 hover:bg-red-500/10"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {showStopButton ? 'Stop Request' : 'Stop'}
                  </Button>
                  {showStopButton && (
                    <span className="text-xs text-muted-foreground ml-2 flex items-center">
                      Request taking longer than expected
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input section - absolutely positioned within container */}
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
                      value={question}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        handlePromptSearch(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isSending && question.trim()) {
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
            {isStreaming ? (
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
                disabled={isLoading || isSending || !question.trim()}
                size="sm"
                className="px-4 py-2 shrink-0"
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
    </div>
  );
};