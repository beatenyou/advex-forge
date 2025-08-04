import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AIHealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  responseTime: number;
  error?: string;
}

export const AIHealthIndicator = () => {
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus>({
    isHealthy: false,
    lastChecked: new Date(),
    responseTime: 0
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    const startTime = Date.now();
    
    try {
      // Use the new dedicated health check endpoint
      const response = await supabase.functions.invoke('ai-health-check');
      const responseTime = Date.now() - startTime;

      if (response.error) {
        setHealthStatus({
          isHealthy: false,
          lastChecked: new Date(),
          responseTime,
          error: response.error.message
        });
      } else if (response.data) {
        const healthData = response.data;
        setHealthStatus({
          isHealthy: healthData.status === 'healthy',
          lastChecked: new Date(),
          responseTime: healthData.responseTime || responseTime,
          error: healthData.status !== 'healthy' ? `System ${healthData.status}` : undefined
        });
      } else {
        setHealthStatus({
          isHealthy: true,
          lastChecked: new Date(),
          responseTime,
          error: undefined
        });
      }
    } catch (error: any) {
      setHealthStatus({
        isHealthy: false,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: error.message || 'Network connectivity issue'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (healthStatus.isHealthy) return <CheckCircle className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  const getStatusColor = () => {
    if (isChecking) return "secondary";
    return healthStatus.isHealthy ? "default" : "destructive";
  };

  const getStatusText = () => {
    if (isChecking) return "Checking...";
    if (healthStatus.isHealthy) return `Healthy (${healthStatus.responseTime}ms)`;
    return `Unhealthy: ${healthStatus.error}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
              <span className="ml-1 text-xs">AI</span>
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div>{getStatusText()}</div>
            <div className="text-xs text-muted-foreground">
              Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Click to refresh
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};