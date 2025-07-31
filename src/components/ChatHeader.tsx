import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { CompactUsageDisplay } from '@/components/CompactUsageDisplay';
import { UserModelSelector } from '@/components/UserModelSelector';

interface ChatHeaderProps {
  currentUsage: number;
  quotaLimit: number;
  planName: string;
  canUseAI: boolean;
  onNewChat: () => void;
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
}

export function ChatHeader({
  currentUsage,
  quotaLimit,
  planName,
  canUseAI,
  onNewChat,
  currentSessionId,
  onSessionSelect
}: ChatHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Top Row - Usage and Controls */}
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Chat</h2>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Usage Display - Always visible on desktop */}
            <div className="hidden md:flex">
              <CompactUsageDisplay 
                currentUsage={currentUsage}
                quotaLimit={quotaLimit}
                planName={planName}
                canUseAI={canUseAI}
              />
            </div>
            
            {/* Mobile collapse toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="md:hidden h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Row - New Chat, Model Selector and History */}
      <div className={`transition-all duration-200 ease-out ${isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-16'} md:max-h-16`}>
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* New Chat Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onNewChat}
                className="flex items-center gap-2 px-3"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
              
              {/* AI Model Selector */}
              <UserModelSelector compact />
            </div>
            
            {/* Usage on mobile when expanded - smaller and right-aligned */}
            <div className="md:hidden flex-shrink-0">
              <CompactUsageDisplay 
                currentUsage={currentUsage}
                quotaLimit={quotaLimit}
                planName={planName}
                canUseAI={canUseAI}
                className="scale-75 origin-right"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}