import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  History, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react';
import { useAIUsage } from '@/hooks/useAIUsage';
import { formatDistanceToNow } from 'date-fns';

interface RecentSession {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatHeaderExtensionProps {
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onNewSession?: () => void;
  recentSessions?: RecentSession[];
  className?: string;
}

export function ChatHeaderExtension({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  recentSessions = [],
  className = ""
}: ChatHeaderExtensionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { canUseAI, currentUsage, quotaLimit, planName, usagePercentage } = useAIUsage();

  const getUsageStatus = () => {
    if (usagePercentage >= 95) return { color: 'text-red-500', icon: AlertTriangle };
    if (usagePercentage >= 80) return { color: 'text-yellow-500', icon: AlertTriangle };
    return { color: 'text-green-500', icon: CheckCircle };
  };

  const status = getUsageStatus();
  const StatusIcon = status.icon;
  const remaining = Math.max(0, quotaLimit - currentUsage);

  return (
    <div className={`border-b border-border/50 bg-background/95 backdrop-blur-sm ${className}`}>
      {/* Compact Bar - Always Visible */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Credits Display */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <Badge variant={planName === 'Free' ? 'secondary' : 'default'} className="text-[10px] px-1 py-0">
              {planName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <StatusIcon className={`h-2.5 w-2.5 ${status.color} flex-shrink-0`} />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {currentUsage}/{quotaLimit}
            </span>
            <Progress 
              value={usagePercentage} 
              className="h-1 flex-1 min-w-[30px]"
            />
          </div>
        </div>

        {/* History & Expand Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <History className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Recent Chats</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onNewSession}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New
                  </Button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {recentSessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No recent chats</p>
                  ) : (
                    recentSessions.slice(0, 5).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => onSessionSelect?.(session.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-sm text-xs hover:bg-accent transition-colors ${
                          currentSessionId === session.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="truncate font-medium">
                          {session.title || 'Untitled Chat'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-2 pt-1 border-t border-border/30">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{remaining} requests remaining</span>
            {!canUseAI && (
              <span className="text-destructive font-medium">Quota exceeded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}