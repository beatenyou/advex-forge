// ============= Chat Header Component =============

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { History, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { SessionHistory } from '@/components/SessionHistory';
import { CompactUsageDisplay } from '@/components/CompactUsageDisplay';
import { useAIUsage } from '@/hooks/useAIUsage';
import { ChatSession } from '@/types/chat';

interface ChatHeaderProps {
  currentSession: ChatSession | null;
  onNewSession: () => void;
  onClearSession: () => void;
  isLoading: boolean;
  showSessionHistory?: boolean;
  className?: string;
}

export const ChatHeader = ({
  currentSession,
  onNewSession,
  onClearSession,
  isLoading,
  showSessionHistory = true,
  className = ""
}: ChatHeaderProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const { canUseAI, currentUsage, quotaLimit, planName } = useAIUsage();

  const handleNewSession = () => {
    onNewSession();
    setShowHistory(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    // The parent component should handle this through the useChat hook
    setShowHistory(false);
  };

  return (
    <>
      <div className={`border-b border-border bg-card/30 backdrop-blur-sm p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            <div>
              <h3 className="font-semibold text-foreground">
                {currentSession?.title || 'New Conversation'}
              </h3>
              {currentSession && (
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(currentSession.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {/* Credits Display - Hidden on mobile to save space */}
            <div className="hidden sm:block">
              <CompactUsageDisplay
                currentUsage={currentUsage}
                quotaLimit={quotaLimit}
                planName={planName}
                canUseAI={canUseAI}
                className="bg-muted/50 px-3 py-1.5 rounded-md border"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {showSessionHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="h-8 w-8 p-0"
                title="Session History"
              >
                <History className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewSession}
              disabled={isLoading}
              className="h-8 w-8 p-0"
              title="New Session"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
            </Button>

            {currentSession && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSession}
                disabled={isLoading}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Clear Session"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showHistory && showSessionHistory && (
        <div className="border-b border-border bg-background">
          <SessionHistory
            currentSessionId={currentSession?.id}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
          />
        </div>
      )}
    </>
  );
};