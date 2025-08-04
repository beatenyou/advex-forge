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
      const SUPABASE_URL = "https://csknxtzjfdqoaoforrfm.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNza254dHpqZmRxb2FvZm9ycmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTczMTgsImV4cCI6MjA2OTI5MzMxOH0.MNglSbyBWQw2BcxTzC0stq13FNyi9Hxsv3sSGYP_G1M";
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-router`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': SUPABASE_KEY,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      setHealthStatus({
        isHealthy: response.ok,
        lastChecked: new Date(),
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      });
    } catch (error: any) {
      setHealthStatus({
        isHealthy: false,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        error: error.message
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
    if (isChecking) return "default";
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