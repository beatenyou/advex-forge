// ============= Chat Input Component =============

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

export const ChatInput = ({
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = "Type your message...",
  initialValue = "",
  className = ""
}: ChatInputProps) => {
  const [message, setMessage] = useState(initialValue);
  const [lastHelperMessage, setLastHelperMessage] = useState(initialValue);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update message when initialValue changes
  useEffect(() => {
    if (initialValue) {
      // If no message or message matches the last helper message, update with new helper
      if (!message.trim() || message === lastHelperMessage) {
        setMessage(initialValue);
        setLastHelperMessage(initialValue);
        setIsUserTyping(false);
      }
      // If user is typing something different, don't override
      else if (message !== lastHelperMessage) {
        // User has typed something, keep their content
        setIsUserTyping(true);
      }
    }
  }, [initialValue, message, lastHelperMessage]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    setIsUserTyping(false);
    setLastHelperMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, isLoading, disabled, onSendMessage]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Track if user is actively typing (different from helper message)
    if (newValue !== lastHelperMessage && newValue.trim() !== '') {
      setIsUserTyping(true);
    } else if (newValue.trim() === '') {
      setIsUserTyping(false);
    }
  }, [lastHelperMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className={`border-t border-border bg-background p-4 ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <TextareaAutosize
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            minRows={1}
            maxRows={6}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-[150px]"
            style={{
              lineHeight: '1.5'
            }}
          />
          
          {message.length > 0 && (
            <div className="absolute bottom-1 right-1 text-xs text-muted-foreground bg-background/80 px-1 rounded">
              {message.length}
            </div>
          )}
        </div>
        
        <Button
          type="submit"
          size="sm"
          disabled={!canSend}
          className="px-3 py-2 h-auto min-h-[40px] self-end"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
      
      {disabled && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Chat is currently disabled
        </p>
      )}
    </div>
  );
};