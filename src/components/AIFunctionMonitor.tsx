import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FunctionStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export const AIFunctionMonitor = () => {
  const [functions, setFunctions] = useState<FunctionStatus[]>([
    { name: 'ai-chat-router', status: 'unknown', lastChecked: new Date() },
    { name: 'ai-chat-openai', status: 'unknown', lastChecked: new Date() },
    { name: 'ai-chat-mistral', status: 'unknown', lastChecked: new Date() },
    { name: 'ai-health-check', status: 'unknown', lastChecked: new Date() },
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkFunctionHealth = async (functionName: string): Promise<FunctionStatus> => {
    const startTime = Date.now();
    
    try {
      // Try to invoke the function with a health check
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { healthCheck: true },
        method: 'GET'
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: functionName,
          status: 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: error.message
        };
      }

      return {
        name: functionName,
        status: 'healthy',
        responseTime,
        lastChecked: new Date()
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
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: "Hello, this is a test message",
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
          description: "Router is working correctly",
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
                  <h4 className="font-medium">{func.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {func.lastChecked.toLocaleTimeString()}
                    {func.responseTime && ` (${func.responseTime}ms)`}
                  </p>
                  {func.error && (
                    <p className="text-sm text-red-500 mt-1">{func.error}</p>
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