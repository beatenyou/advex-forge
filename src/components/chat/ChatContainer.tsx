// ============= Chat Container =============

import { useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { SessionHistory } from '@/components/SessionHistory';

interface ChatContainerProps {
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
  onClear?: () => void;
  showHeader?: boolean;
  className?: string;
}

export const ChatContainer = ({
  sessionId,
  initialPrompt = "",
  onSessionChange,
  onClear,
  showHeader = true,
  className = ""
}: ChatContainerProps) => {
  const { state, actions, metadata } = useChat(sessionId);

  // Initialize chat on mount
  useEffect(() => {
    actions.initialize();
  }, [actions.initialize]);

  // Notify parent of session changes
  useEffect(() => {
    if (state.currentSession && onSessionChange) {
      onSessionChange(state.currentSession.id);
    }
  }, [state.currentSession?.id, onSessionChange]);

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

      <MessageList
        messages={state.messages}
        isLoading={state.isLoading}
        onCopyMessage={actions.copyMessage}
        className="flex-1 min-h-0"
      />

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={state.isLoading}
        disabled={!metadata.canUseAI}
        initialValue={initialPrompt}
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