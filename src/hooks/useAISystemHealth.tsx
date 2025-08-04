import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AISystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'checking';
  lastChecked: Date;
  responseTime: number;
  error?: string;
  providers: {
    total: number;
    active: number;
    tested: number;
  };
  functions: Array<{
    provider: string;
    function: string;
    status: string;
    error?: string;
  }>;
}

export const useAISystemHealth = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<AISystemHealth>({
    status: 'checking',
    lastChecked: new Date(),
    responseTime: 0,
    providers: { total: 0, active: 0, tested: 0 },
    functions: []
  });

  const checkHealth = useCallback(async () => {
    if (!user) return;

    setHealth(prev => ({ ...prev, status: 'checking' }));
    
    try {
      const startTime = Date.now();
      const response = await supabase.functions.invoke('ai-health-check');
      const responseTime = Date.now() - startTime;

      if (response.error) {
        setHealth({
          status: 'unhealthy',
          lastChecked: new Date(),
          responseTime,
          error: response.error.message,
          providers: { total: 0, active: 0, tested: 0 },
          functions: []
        });
      } else if (response.data) {
        const healthData = response.data;
        setHealth({
          status: healthData.status || 'unhealthy',
          lastChecked: new Date(),
          responseTime: healthData.responseTime || responseTime,
          error: healthData.status !== 'healthy' ? healthData.error : undefined,
          providers: healthData.checks?.providers || { total: 0, active: 0, tested: 0 },
          functions: healthData.checks?.functions || []
        });
      } else {
        setHealth({
          status: 'healthy',
          lastChecked: new Date(),
          responseTime,
          providers: { total: 0, active: 0, tested: 0 },
          functions: []
        });
      }
    } catch (error) {
      setHealth({
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Network connectivity issue',
        providers: { total: 0, active: 0, tested: 0 },
        functions: []
      });
    }
  }, [user]);

  // Set up real-time monitoring with Supabase Pro features
  useEffect(() => {
    if (!user) return;

    // Initial check
    checkHealth();

    // Set up regular health checks
    const healthInterval = setInterval(checkHealth, 30000); // Every 30 seconds

    // Listen for real-time AI system changes using Supabase Realtime
    const channel = supabase
      .channel('ai-system-health')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_providers'
        },
        () => {
          console.log('AI providers changed, rechecking health...');
          checkHealth();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_chat_config'
        },
        () => {
          console.log('AI config changed, rechecking health...');
          checkHealth();
        }
      )
      .subscribe();

    return () => {
      clearInterval(healthInterval);
      supabase.removeChannel(channel);
    };
  }, [user, checkHealth]);

  return {
    health,
    checkHealth,
    isHealthy: health.status === 'healthy',
    isDegraded: health.status === 'degraded',
    isUnhealthy: health.status === 'unhealthy',
    isChecking: health.status === 'checking'
  };
};