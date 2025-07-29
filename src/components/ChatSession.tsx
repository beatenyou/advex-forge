import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Copy, MessageSquare, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AIStatusIndicator } from '@/components/AIStatusIndicator';

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

interface ChatSessionProps {
  onClear?: () => void;
}

export const ChatSession = ({ onClear }: ChatSessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Function to clear all messages and create new session
  const clearChatAndResetSession = async () => {
    setMessages([]);
    setCurrentSession(null);
    await loadOrCreateSession();
  };

  useEffect(() => {
    loadOrCreateSession();
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

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || !currentSession) return;

    const userQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    try {
      // Save user message
      const userMessage = await saveMessage(currentSession.id, 'user', userQuestion);
      setMessages(prev => [...prev, userMessage as ChatMessage]);

      // Update session title if this is the first message
      if (messages.length === 0) {
        await updateSessionTitle(currentSession.id, userQuestion);
      }

      // Get conversation context (last 20 messages)
      const conversationContext = messages.slice(-19).concat([userMessage as ChatMessage]);

      // Call AI with conversation context
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: userQuestion,
          messages: conversationContext,
          sessionId: currentSession.id
        }
      });

      if (error) throw error;

      // Save AI response
      const aiMessage = await saveMessage(
        currentSession.id, 
        'assistant', 
        data.message,
        data.providerName,
        data.tokensUsed
      );
      
      setMessages(prev => [...prev, aiMessage as ChatMessage]);

      // Update session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentSession.id);

    } catch (error) {
      console.error('Error in chat:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {currentSession?.title || 'New Conversation'}
          </CardTitle>
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
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
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
                        ? 'bg-primary text-primary-foreground ml-12'
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
                        <div className="text-xs opacity-70">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 mr-12">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && question.trim()) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};