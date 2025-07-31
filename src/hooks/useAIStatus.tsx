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
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  useEffect(() => {
    checkAIStatus();

    // Set up realtime channel for AI status updates
    const channel = supabase
      .channel('ai-status-updates')
      .on('broadcast', { event: 'status-refresh' }, () => {
        checkAIStatus();
      })
      .subscribe();

    // Listen for model changes to update status display immediately
    const handleModelChange = (event: CustomEvent) => {
      const { providerId, model, timestamp } = event.detail || {};
      
      console.log('🔄 AI Status: Model changed event received', { providerId, model, timestamp });
      
      if (providerId) {
        setCurrentModelId(providerId);
        
        // Update status immediately with enhanced model info
        if (model?.provider) {
          const newStatus = {
            status: 'operational' as AIStatusType,
            message: 'AI System Online',
            details: `Using ${model.provider.name} (${model.provider.type.toUpperCase()})`
          };
          
          console.log('✅ AI Status: Immediate update', newStatus);
          setStatus(newStatus);
          
          // Broadcast status update to other components
          const channel = supabase.channel('ai-status-updates');
          channel.send({
            type: 'broadcast',
            event: 'status-refresh',
            payload: { 
              immediate: true, 
              model: model,
              timestamp: Date.now()
            }
          });
        }
      }
      
      // Also do full status check as backup
      setTimeout(() => checkAIStatus(), 100);
    };

    window.addEventListener('modelChanged', handleModelChange as EventListener);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('modelChanged', handleModelChange);
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
      
      // Get currently selected model
      let currentProvider = null;
      
      if (currentModelId) {
        currentProvider = activeProviders.find(p => p.id === currentModelId);
      }
      
      // Fall back to default provider if no valid selection
      if (!currentProvider) {
        currentProvider = activeProviders.find(p => p.id === configResult.data.default_provider_id);
      }

      // Check if we have a valid provider
      if (!currentProvider) {
        setStatus({
          status: 'issues',
          message: 'No Active Provider',
          details: 'No active AI provider available'
        });
        return;
      }

      // All configuration checks passed
      setStatus({
        status: 'operational',
        message: 'AI System Online', 
        details: `Using ${currentProvider.name} (${currentProvider.type.toUpperCase()})`
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