import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { useAISystemHealth } from '@/hooks/useAISystemHealth';
import { cn } from '@/lib/utils';

interface EnhancedAIStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EnhancedAIStatusIndicator: React.FC<EnhancedAIStatusIndicatorProps> = ({
  className,
  showDetails = false,
  size = 'sm'
}) => {
  const { health, checkHealth, isHealthy, isDegraded, isUnhealthy, isChecking } = useAISystemHealth();

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className={cn("animate-spin", getSizeClass())} />;
    if (isHealthy) return <CheckCircle className={cn("text-green-500", getSizeClass())} />;
    if (isDegraded) return <AlertCircle className={cn("text-yellow-500", getSizeClass())} />;
    return <AlertCircle className={cn("text-red-500", getSizeClass())} />;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'md': return 'h-4 w-4';
      case 'lg': return 'h-5 w-5';
      default: return 'h-3 w-3';
    }
  };

  const getStatusColor = () => {
    if (isChecking) return "secondary";
    if (isHealthy) return "default";
    if (isDegraded) return "outline";
    return "destructive";
  };

  const getStatusText = () => {
    if (isChecking) return "Checking AI System...";
    if (isHealthy) return `AI System Healthy (${health.responseTime}ms)`;
    if (isDegraded) return `AI System Degraded: ${health.error}`;
    return `AI System Unhealthy: ${health.error}`;
  };

  const getProviderStatusIcon = (provider: any) => {
    switch (provider.status) {
      case 'healthy': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return <Wifi className="h-3 w-3 text-gray-400" />;
    }
  };

  if (showDetails) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={isChecking}
            className="h-8 px-2"
          >
            <Activity className="h-4 w-4 mr-1" />
            <Badge variant={getStatusColor()} className="ml-1">
              {getStatusIcon()}
              <span className="ml-1 text-xs">
                {isHealthy ? 'Healthy' : isDegraded ? 'Degraded' : 'Issues'}
              </span>
            </Badge>
          </Button>
        </div>
        
        {health.providers.total > 0 && (
          <div className="text-xs space-y-1">
            <div className="font-medium">AI Providers ({health.providers.active}/{health.providers.total} active)</div>
            {health.functions.map((func, index) => (
              <div key={index} className="flex items-center space-x-2 pl-2">
                {getProviderStatusIcon(func)}
                <span className="flex-1">{func.provider}</span>
                <span className={cn(
                  "text-xs",
                  func.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                )}>
                  {func.status}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Last checked: {health.lastChecked.toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={isChecking}
            className={cn("h-8 px-2", className)}
          >
            {size === 'lg' && <Activity className="h-4 w-4 mr-1" />}
            <Badge variant={getStatusColor()} className="ml-1">
              {getStatusIcon()}
              <span className="ml-1 text-xs">
                {isHealthy ? (
                  <span className="text-green-600 font-medium">AI</span>
                ) : (
                  <span>AI</span>
                )}
              </span>
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm space-y-2">
            <div className="font-medium">{getStatusText()}</div>
            
            {health.providers.total > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Providers: {health.providers.active}/{health.providers.total} active
                </div>
                {health.functions.slice(0, 3).map((func, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    {getProviderStatusIcon(func)}
                    <span>{func.provider}</span>
                    <span className={func.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                      {func.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Last checked: {health.lastChecked.toLocaleTimeString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Click to refresh • Updates every 30s
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};