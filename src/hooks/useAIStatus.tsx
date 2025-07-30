import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AIStatusType = 'operational' | 'issues' | 'not-configured';

export interface AIStatus {
  status: AIStatusType;
  message: string;
  details?: string;
}

export const useAIStatus = () => {
  const [status, setStatus] = useState<AIStatus>({
    status: 'not-configured',
    message: 'Checking AI system status...',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAIStatus();

    // Set up realtime channel for AI status updates
    const channel = supabase
      .channel('ai-status-updates')
      .on('broadcast', { event: 'status-refresh' }, () => {
        checkAIStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAIStatus = async () => {
    try {
      setLoading(true);
      
      // Check AI configuration and providers
      const [configResult, providersResult] = await Promise.all([
        supabase.from('ai_chat_config').select('*').single(),
        supabase.from('ai_providers').select('*').eq('is_active', true)
      ]);

      // Check if AI chat is enabled
      if (configResult.error || !configResult.data?.is_enabled) {
        setStatus({
          status: 'not-configured',
          message: 'AI Chat Disabled',
          details: 'AI chat functionality is disabled in configuration'
        });
        return;
      }

      // Check if there are active providers
      if (providersResult.error || !providersResult.data || providersResult.data.length === 0) {
        setStatus({
          status: 'not-configured',
          message: 'No AI Providers',
          details: 'No active AI providers configured'
        });
        return;
      }

      const activeProviders = providersResult.data;
      const defaultProvider = activeProviders.find(p => p.id === configResult.data.default_provider_id);

      // Check if default provider is set and active
      if (!defaultProvider) {
        setStatus({
          status: 'issues',
          message: 'No Default Provider',
          details: 'Default AI provider not set or inactive'
        });
        return;
      }

      // All configuration checks passed - assume operational without AI test call
      // Only actual user interactions should count toward usage
      setStatus({
        status: 'operational',
        message: 'AI System Online', 
        details: `Using ${defaultProvider.name} (${defaultProvider.type.toUpperCase()})`
      });

    } catch (error) {
      console.error('Error checking AI status:', error);
      setStatus({
        status: 'not-configured',
        message: 'Status Check Failed',
        details: 'Unable to determine AI system status'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    // Broadcast refresh event to all instances
    const channel = supabase.channel('ai-status-updates');
    await channel.send({
      type: 'broadcast',
      event: 'status-refresh',
      payload: {}
    });
    
    // Also refresh this instance
    checkAIStatus();
  };

  return { status, loading, refresh: refreshAll };
};