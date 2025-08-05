// ============= Message List Component =============

import { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, CheckCheck, ChevronDown, ChevronUp, ArrowDown } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ChatMessage } from '@/types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCopyMessage: (content: string, messageId: string) => void;
  className?: string;
}

export const MessageList = ({ 
  messages, 
  isLoading, 
  onCopyMessage, 
  className = '' 
}: MessageListProps) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [collapsedMessages, setCollapsedMessages] = useState<Record<string, boolean>>({});
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-collapse logic for long messages
  useEffect(() => {
    const newCollapsedStates: Record<string, boolean> = {};
    
    messages.forEach(message => {
      if (message.role === 'assistant' && !collapsedMessages.hasOwnProperty(message.id)) {
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
    
    if (Object.keys(newCollapsedStates).length > 0) {
      setCollapsedMessages(prev => ({ ...prev, ...newCollapsedStates }));
    }
  }, [messages, collapsedMessages]);

  // Smart scrolling logic
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesEndRef.current) return;
    
    if (force || !isUserScrolledUp) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setIsUserScrolledUp(false);
      setShowScrollToBottomButton(false);
    }
  }, [isUserScrolledUp]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setIsUserScrolledUp(!isNearBottom);
      setShowScrollToBottomButton(!isAtBottom && messages.length > 3);
    }
  }, [messages.length]);

  // Auto-scroll for new messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Auto-scroll for new assistant messages or if user is at bottom
      if (lastMessage.role === 'assistant' || !isUserScrolledUp) {
        const timer = setTimeout(() => scrollToBottom(), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [messages.length, scrollToBottom, isUserScrolledUp]);

  const handleCopyMessage = async (content: string, messageId: string) => {
    await onCopyMessage(content, messageId);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleMessageCollapse = (messageId: string) => {
    setCollapsedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const renderMessage = (message: ChatMessage) => {
    const isCollapsed = collapsedMessages[message.id];
    const shouldShowCollapseButton = message.role === 'assistant' && message.content.length > 200;

    return (
      <div
        key={message.id}
        className={`group flex gap-3 p-4 rounded-lg transition-colors ${
          message.role === 'user'
            ? 'bg-primary/5 ml-8'
            : 'bg-muted/30 mr-8'
        }`}
      >
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </span>
              {message.provider_name && (
                <span className="text-xs text-muted-foreground/70">
                  via {message.provider_name}
                </span>
              )}
              {message.tokens_used && (
                <span className="text-xs text-muted-foreground/50">
                  {message.tokens_used} tokens
                </span>
              )}
            </div>
            
            {shouldShowCollapseButton && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMessageCollapse(message.id)}
                  className="h-7 w-7 p-0"
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className={`prose prose-sm max-w-none ${isCollapsed ? 'line-clamp-3' : ''}`}>
            {message.role === 'assistant' ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleMessageCollapse(message.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Show full message
            </Button>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyMessage(message.content, message.id)}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copiedMessageId === message.id ? (
                <CheckCheck className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex-1 ${className}`}>
      <ScrollArea 
        ref={scrollAreaRef}
        className="h-full"
        onScrollCapture={handleScroll}
      >
        <div className="space-y-4 p-4">
          {messages.length === 0 && !isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation by typing a message below.</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}

          {isLoading && (
            <div className="flex gap-3 p-4 rounded-lg bg-muted/30 mr-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    AI Assistant
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {showScrollToBottomButton && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-4 rounded-full h-10 w-10 p-0 shadow-lg"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};