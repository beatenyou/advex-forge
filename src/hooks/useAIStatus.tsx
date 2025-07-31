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

    // Listen for DOM events from model selection (critical for side panel)
    const handleModelChange = (event: any) => {
      console.log('🎯 AI Status: Received modelChanged event in useAIStatus', event.detail);
      const { modelId, modelName, modelType } = event.detail;
      
      if (modelId) {
        console.log('🔄 AI Status: Updating status immediately for model change:', modelName, modelId);
        setCurrentModelId(modelId);
        // Force immediate status update without delay to prevent stale state
        checkAIStatus(modelId);
      }
    };

    // Listen to the DOM event dispatched by model selection
    console.log('🎯 AI Status: Setting up modelChanged event listener');
    window.addEventListener('modelChanged', handleModelChange);

    // Listen for global refresh events to ensure all instances update
    const handleGlobalRefresh = (event: any) => {
      console.log('🌐 AI Status: Received global refresh event', event.detail);
      const { modelId } = event.detail;
      if (modelId) {
        setCurrentModelId(modelId);
        checkAIStatus(modelId);
      }
    };
    window.addEventListener('globalStatusRefresh', handleGlobalRefresh);

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

    // Listen for broadcast events from the database trigger
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
      window.removeEventListener('modelChanged', handleModelChange);
      window.removeEventListener('globalStatusRefresh', handleGlobalRefresh);
      supabase.removeChannel(preferencesChannel);
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
      
      // Use the target model ID (user's selection) - this should show what user selected
      if (targetModelId) {
        currentProvider = activeProviders.find(p => p.id === targetModelId);
        console.log('🎯 Found provider for user selection:', currentProvider?.name, 'ID:', currentProvider?.id);
      }
      
      // Fall back to default provider if no valid selection
      if (!currentProvider) {
        currentProvider = activeProviders.find(p => p.id === configResult.data.default_provider_id);
        console.log('🔄 Using default provider fallback:', currentProvider?.name);
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
      console.log('✅ AI Status: Setting status to operational with provider:', currentProvider.name);
      setStatus({
        status: 'operational',
        message: `Using ${currentProvider.name}`, 
        details: `AI provider: ${currentProvider.name} (${currentProvider.type.toUpperCase()})`
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
    console.log('🔄 AI Status: Broadcasting refresh to all connected clients');
    
    // Broadcast refresh event to all instances
    const channel = supabase.channel('ai-status-global-refresh');
    await channel.send({
      type: 'broadcast',
      event: 'status-refresh',
      payload: { timestamp: Date.now() }
    });
    
    // Also refresh this instance
    checkAIStatus();
  };

  return { status, loading, refresh: refreshAll };
};