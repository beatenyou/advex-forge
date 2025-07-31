import { Circle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAIStatus, AIStatusType } from '@/hooks/useAIStatus';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { cn } from '@/lib/utils';

interface AIStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getStatusConfig = (status: AIStatusType) => {
  switch (status) {
    case 'operational':
      return {
        icon: Circle,
        color: 'text-green-500',
        bgColor: 'bg-green-500/20',
        label: 'Operational',
        description: 'AI system is working normally'
      };
    case 'issues':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/20',
        label: 'Issues',
        description: 'AI system has some issues but may be functional'
      };
    case 'not-configured':
      return {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/20',
        label: 'Not Configured',
        description: 'AI system is not configured or offline'
      };
  }
};

const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return { icon: 'w-3 h-3', container: 'w-6 h-6', text: 'text-xs' };
    case 'md':
      return { icon: 'w-4 h-4', container: 'w-8 h-8', text: 'text-sm' };
    case 'lg':
      return { icon: 'w-5 h-5', container: 'w-10 h-10', text: 'text-base' };
  }
};

export const AIStatusIndicator = ({ 
  showLabel = false, 
  size = 'md', 
  className 
}: AIStatusIndicatorProps) => {
  const { status: aiStatus, loading, refresh } = useAIStatus();
  const { isAdmin } = useAdminCheck();
  const statusConfig = getStatusConfig(aiStatus.status);
  
  console.log('🖥️ AIStatusIndicator render - status:', aiStatus.status, 'details:', aiStatus.details, 'className:', className);
  const sizeConfig = getSizeConfig(size);
  const StatusIcon = statusConfig.icon;

  const indicator = (
    <div className={cn(
      "flex items-center gap-2",
      className
    )}>
      <div className={cn(
        "rounded-full flex items-center justify-center relative",
        sizeConfig.container,
        statusConfig.bgColor
      )}>
        <StatusIcon 
          className={cn(
            sizeConfig.icon,
            statusConfig.color
          )}
          fill="currentColor"
        />
        {loading && (
          <RefreshCw 
            className={cn(
              "absolute inset-0 animate-spin",
              sizeConfig.icon,
              "text-muted-foreground"
            )}
          />
        )}
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn(
            "font-medium",
            sizeConfig.text,
            statusConfig.color
          )}>
            {statusConfig.label}
          </span>
          {aiStatus.details && (
            <span className={cn(
              "text-muted-foreground",
              size === 'sm' ? 'text-xs' : 'text-xs'
            )}>
              {aiStatus.details}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto hover:bg-transparent"
              onClick={refresh}
              disabled={loading}
            >
              {indicator}
            </Button>
          ) : (
            <div className="cursor-default">
              {indicator}
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{aiStatus.message}</p>
            {aiStatus.details && (
              <p className="text-xs text-muted-foreground">{aiStatus.details}</p>
            )}
            {isAdmin ? (
              <p className="text-xs text-muted-foreground">Click to refresh status</p>
            ) : (
              <p className="text-xs text-muted-foreground">System status</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};