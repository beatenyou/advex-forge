import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FunctionStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
  successRate?: number;
  provider?: string;
}

export const AIFunctionMonitor = () => {
  const [functions, setFunctions] = useState<FunctionStatus[]>([
    { name: 'ai-chat-router', status: 'unknown', lastChecked: new Date() },
    { name: 'ai-chat-openai', status: 'unknown', lastChecked: new Date(), provider: 'OpenAI' },
    { name: 'ai-chat-mistral', status: 'unknown', lastChecked: new Date(), provider: 'Mistral' },
    { name: 'ai-health-check', status: 'unknown', lastChecked: new Date() },
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const checkFunctionHealth = async (functionName: string): Promise<FunctionStatus> => {
    const startTime = Date.now();
    
    try {
      if (functionName === 'ai-chat-router') {
        return await checkRouterHealth();
      } else if (functionName === 'ai-health-check') {
        return await checkHealthEndpoint();
      } else {
        // For provider functions, test through router
        return await checkProviderThroughRouter(functionName);
      }
    } catch (error: any) {
      return {
        name: functionName,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  };

  const checkRouterHealth = async (): Promise<FunctionStatus> => {
    const startTime = Date.now();
    
    try {
      // Test router with a simple health check message
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: "Health check",
          selectedModelId: "",
          sessionId: `health-check-${Date.now()}`
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'ai-chat-router',
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: error.message
        };
      }

      return {
        name: 'ai-chat-router',
        status: 'healthy',
        responseTime,
        lastChecked: new Date()
      };
    } catch (error: any) {
      return {
        name: 'ai-chat-router',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  };

  const checkHealthEndpoint = async (): Promise<FunctionStatus> => {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-health-check');
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'ai-health-check',
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: error.message
        };
      }

      const status = data?.status === 'healthy' ? 'healthy' : 
                   data?.status === 'degraded' ? 'degraded' : 'unhealthy';

      return {
        name: 'ai-health-check',
        status,
        responseTime,
        lastChecked: new Date()
      };
    } catch (error: any) {
      return {
        name: 'ai-health-check',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  };

  const checkProviderThroughRouter = async (functionName: string): Promise<FunctionStatus> => {
    const startTime = Date.now();
    
    try {
      // Get provider ID for the function
      const { data: providers } = await supabase
        .from('ai_providers')
        .select('id, type')
        .eq('is_active', true);

      if (!providers || providers.length === 0) {
        return {
          name: functionName,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: 'No active providers found'
        };
      }

      const providerType = functionName === 'ai-chat-openai' ? 'openai' : 'mistral';
      const provider = providers.find(p => p.type === providerType);

      if (!provider) {
        return {
          name: functionName,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: `No ${providerType} provider found`
        };
      }

      // Test through router with specific provider
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: "Health check",
          selectedModelId: provider.id,
          sessionId: `health-check-${functionName}-${Date.now()}`
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: functionName,
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: error.message,
          provider: providerType
        };
      }

      return {
        name: functionName,
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
        provider: providerType
      };
    } catch (error: any) {
      return {
        name: functionName,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  };

  const checkAllFunctions = async () => {
    setIsChecking(true);
    
    try {
      const promises = functions.map(f => checkFunctionHealth(f.name));
      const results = await Promise.all(promises);
      setFunctions(results);
      
      const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
      
      if (unhealthyCount > 0) {
        toast({
          title: "Function Issues Detected",
          description: `${unhealthyCount} functions are not responding properly`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "All Functions Healthy",
          description: "All AI functions are responding normally",
        });
      }
    } catch (error: any) {
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const testAIRouter = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to test the AI router",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: "Hello, this is a comprehensive test message for the AI router",
          selectedModelId: "",
          sessionId: `test-${Date.now()}`
        }
      });

      if (error) {
        toast({
          title: "AI Router Test Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "AI Router Test Success",
          description: `Router responded: ${data?.message?.substring(0, 50)}...`,
        });
      }
    } catch (error: any) {
      toast({
        title: "AI Router Test Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkAllFunctions();
    const interval = setInterval(checkAllFunctions, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: FunctionStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: FunctionStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500 text-white">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          AI Function Monitor
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testAIRouter}
              disabled={isChecking}
            >
              Test AI Router
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={checkAllFunctions}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {functions.map((func) => (
            <div key={func.name} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                {getStatusIcon(func.status)}
                <div>
                  <h4 className="font-medium">
                    {func.name}
                    {func.provider && <span className="text-xs text-muted-foreground ml-2">({func.provider})</span>}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {func.lastChecked.toLocaleTimeString()}
                    {func.responseTime && ` (${func.responseTime}ms)`}
                  </p>
                  {func.error && (
                    <p className="text-sm text-red-500 mt-1">{func.error}</p>
                  )}
                  {func.successRate !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Success rate: {(func.successRate * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
              {getStatusBadge(func.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};