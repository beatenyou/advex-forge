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

  console.log('🔧 useAIStatus hook initialized, currentModelId:', currentModelId);

  // Fetch user's selected model from database
  const fetchUserSelectedModel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('selected_model_id')
        .eq('user_id', user.id)
        .single();

      return preferences?.selected_model_id || null;
    } catch (error) {
      console.error('Error fetching user model preference:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🚀 AI Status: useAIStatus hook initializing...');
    
    // Load user's model preference and check status
    const initializeStatus = async () => {
      console.log('🔄 AI Status: Initializing status check...');
      const userModelId = await fetchUserSelectedModel();
      console.log('🔍 AI Status: Found user model ID:', userModelId);
      setCurrentModelId(userModelId);
      checkAIStatus(userModelId);
    };

    initializeStatus();

    // Consolidated event handler for all AI system updates
    const handleAISystemRefresh = async (event: any) => {
      console.log('🎯 AI Status: Received aiSystemRefresh event', event.detail);
      const { modelId, source } = event.detail;
      
      if (modelId) {
        console.log('🔄 AI Status: Updating status for new model:', modelId, 'from:', source);
        
        // Only update if the model actually changed
        if (modelId !== currentModelId) {
          setCurrentModelId(modelId);
          setLoading(true);
          await checkAIStatus(modelId);
          console.log('✅ AI Status: Model change status check completed for:', modelId);
        } else {
          console.log('🔄 AI Status: Same model, refreshing status anyway');
          setLoading(true);
          await checkAIStatus(modelId);
        }
      } else {
        // Refresh with current model
        console.log('🔄 AI Status: Refreshing status with current model');
        setLoading(true);
        await checkAIStatus(currentModelId);
      }
    };

    // Set up simplified event listener
    console.log('🎯 AI Status: Setting up aiSystemRefresh event listener');
    window.addEventListener('aiSystemRefresh', handleAISystemRefresh);

    // Listen for realtime changes to user_preferences table (user-specific)
    const preferencesChannel = supabase
      .channel('user-preferences-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences'
        },
        async (payload) => {
          console.log('🔄 AI Status: User preferences changed via realtime', payload);
          
          // Check if this change affects the current user
          const { data: { user } } = await supabase.auth.getUser();
          const { new: newRecord } = payload;
          
          if (user && newRecord?.user_id === user.id && newRecord?.selected_model_id) {
            console.log('📡 AI Status: Current user model selection changed, updating status');
            console.log('📡 AI Status: New model ID:', newRecord.selected_model_id);
            
            // Update status immediately with the new model ID
            setCurrentModelId(newRecord.selected_model_id);
            checkAIStatus(newRecord.selected_model_id);
          } else {
            console.log('📡 AI Status: Ignoring realtime update - not for current user or no model ID');
          }
        }
      )
      .subscribe();

    // Listen for postgres notifications from the database trigger
    const setupNotificationChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      return supabase
        .channel('model-selection-notifications')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          console.log('🔄 AI Status: Received postgres notification', payload);
          const { new: newRecord } = payload;
          
          if (newRecord && 'selected_model_id' in newRecord && newRecord.selected_model_id) {
            console.log('📡 AI Status: Model selection changed via trigger, updating status');
            setCurrentModelId(newRecord.selected_model_id as string);
            await checkAIStatus(newRecord.selected_model_id as string);
            
            // Force UI refresh
            window.dispatchEvent(new CustomEvent('forceStatusRefresh', { 
              detail: { modelId: newRecord.selected_model_id, timestamp: Date.now() } 
            }));
          }
        })
        .subscribe();
    };
    
    const notificationChannelPromise = setupNotificationChannel();

    // Listen for broadcast events from the database trigger (fallback)
    const broadcastChannel = supabase
      .channel('ai-model-broadcast')
      .on('broadcast', { event: 'model_changed' }, async (payload) => {
        console.log('🔄 AI Status: Received model change broadcast', payload);
        
        // Check if this affects the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user && payload.payload?.user_id === user.id) {
          console.log('📡 AI Status: Broadcast for current user, refreshing');
          const userModelId = await fetchUserSelectedModel();
          setCurrentModelId(userModelId);
          checkAIStatus(userModelId);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('aiSystemRefresh', handleAISystemRefresh);
      supabase.removeChannel(preferencesChannel);
      notificationChannelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
      supabase.removeChannel(broadcastChannel);
    };
  }, []);

  const checkAIStatus = async (modelId?: string | null) => {
    try {
      setLoading(true);
      
      // Use provided modelId or fetch from user preferences
      let targetModelId = modelId;
      if (targetModelId === undefined) {
        targetModelId = currentModelId || await fetchUserSelectedModel();
      }
      
      // Update current model ID state if we have a new one
      if (targetModelId !== currentModelId) {
        console.log('🎯 AI Status: Updating current model ID from', currentModelId, 'to', targetModelId);
        setCurrentModelId(targetModelId);
      }
      
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
      
      // Get currently selected model (prioritize user's preference)
      let currentProvider = null;
      let statusLabel = '';
      
      // Use the target model ID (user's selection) - this should show what user selected
      if (targetModelId) {
        currentProvider = activeProviders.find(p => p.id === targetModelId);
        if (currentProvider) {
          // Display the exact selected model name
          statusLabel = `${currentProvider.name}`;
          console.log('🎯 Found provider for user selection:', currentProvider.name, 'ID:', currentProvider.id);
        }
      }
      
      // Fall back to default provider if no valid selection
      if (!currentProvider) {
        currentProvider = activeProviders.find(p => 
          p.id === configResult.data.default_user_primary_model_id || 
          p.id === configResult.data.default_user_secondary_model_id ||
          p.id === configResult.data.default_provider_id
        );
        if (currentProvider) {
          statusLabel = `${currentProvider.name} (Default)`;
          console.log('🔄 Using default provider fallback:', currentProvider.name);
        }
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

      // All configuration checks passed - show the exact model that's selected
      console.log('✅ AI Status: Setting status to operational with provider:', currentProvider.name, 'type:', currentProvider.type);
      setStatus({
        status: 'operational',
        message: statusLabel,
        details: `${currentProvider.type.toUpperCase()} provider ready`
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
    console.log('🔄 AI Status: Triggering global AI system refresh');
    
    // Trigger the consolidated refresh event
    const refreshEvent = new CustomEvent('aiSystemRefresh', { 
      detail: { 
        timestamp: Date.now(),
        source: 'useAIStatus.refreshAll'
      } 
    });
    window.dispatchEvent(refreshEvent);
  };

  return { status, loading, refresh: refreshAll };
};