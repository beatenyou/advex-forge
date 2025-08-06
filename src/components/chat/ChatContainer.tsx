// ============= Chat Container =============

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { SessionHistory } from '@/components/SessionHistory';
import { FastChatLoader } from './FastChatLoader';
import { useAIChatPreloader } from '@/hooks/useAIChatPreloader';

interface ChatContainerProps {
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
  onClear?: () => void;
  showHeader?: boolean;
  className?: string;
  isChatActive?: boolean; // Track if chat is already active
}

export const ChatContainer = ({
  sessionId,
  initialPrompt = "",
  onSessionChange,
  onClear,
  showHeader = true,
  className = "",
  isChatActive = false
}: ChatContainerProps) => {
  const { state, actions, metadata } = useChat(sessionId);
  const { isConnectionWarm, triggerWarmup } = useAIChatPreloader();
  const lastPromptRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  // Initialize chat on mount and trigger warmup if needed
  useEffect(() => {
    if (!hasInitializedRef.current) {
      // Optimize initialization by reducing delay
      const initTimer = setTimeout(() => {
        actions.initialize();
        hasInitializedRef.current = true;
      }, 100); // Reduced from no delay to 100ms for smoother UX
      
      // Trigger warmup if connection is cold, but don't wait for it
      if (!isConnectionWarm) {
        triggerWarmup();
      }
      
      return () => clearTimeout(initTimer);
    }
  }, []); // Remove all dependencies to prevent re-initialization

  // Notify parent of session changes
  useEffect(() => {
    if (state.currentSession && onSessionChange) {
      onSessionChange(state.currentSession.id);
    }
  }, [state.currentSession?.id, onSessionChange]);

  // Handle dynamic prompt changes for technique switching
  useEffect(() => {
    // Skip if no prompt, same as last prompt, or chat not ready
    if (!initialPrompt || 
        !state.currentSession || 
        initialPrompt === lastPromptRef.current ||
        state.isLoading) {
      return;
    }

    // If chat is active (has messages) and this is a new prompt, auto-send it
    if (isChatActive && state.messages.length > 0 && hasInitializedRef.current) {
      console.log('🔄 Auto-sending new technique prompt:', initialPrompt);
      actions.sendMessage(initialPrompt);
    }

    // Update the ref to track this prompt
    lastPromptRef.current = initialPrompt;
    
    // Mark as initialized after first run
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
    }
  }, [initialPrompt, state.currentSession, state.messages.length, state.isLoading, isChatActive, actions.sendMessage]);

  const handleSendMessage = async (message: string) => {
    await actions.sendMessage(message);
  };

  const handleNewSession = async () => {
    await actions.createNewSession();
  };

  const handleClearSession = async () => {
    await actions.clearSession();
    onClear?.();
  };

  const handleSessionSelect = async (newSessionId: string) => {
    await actions.loadSession(newSessionId);
  };

  if (state.error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-6">
          <p className="text-destructive mb-4">Error: {state.error}</p>
          <button 
            onClick={() => actions.createNewSession()}
            className="text-primary underline"
          >
            Create New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showHeader && (
        <ChatHeader
          currentSession={state.currentSession}
          onNewSession={handleNewSession}
          onClearSession={handleClearSession}
          isLoading={state.isLoading}
        />
      )}

      {/* Show fast loader when initializing */}
      {state.isLoading && !state.messages.length && (
        <div className="flex-1 flex items-center justify-center">
          <FastChatLoader 
            isLoading={true} 
            isConnectionWarm={isConnectionWarm}
          />
        </div>
      )}

      {(!state.isLoading || state.messages.length > 0) && (
        <MessageList
          messages={state.messages}
          isLoading={state.isLoading}
          onCopyMessage={actions.copyMessage}
          className="flex-1 min-h-0"
        />
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={state.isLoading}
        disabled={!metadata.canUseAI}
        initialValue={isChatActive && state.messages.length > 0 ? "" : initialPrompt}
        placeholder={
          metadata.canUseAI 
            ? "Type your message..." 
            : `AI limit reached (${metadata.currentUsage}/${metadata.quotaLimit})`
        }
      />

      {!metadata.canUseAI && (
        <div className="p-2 bg-muted/50 text-center text-xs text-muted-foreground">
          You've reached your {metadata.planName} plan limit. Upgrade for more interactions.
        </div>
      )}
    </div>
  );
};