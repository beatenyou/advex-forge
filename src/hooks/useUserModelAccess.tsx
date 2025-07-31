import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UserModelAccess {
  id: string;
  provider_id: string;
  is_enabled: boolean;
  granted_at: string;
  provider?: {
    id: string;
    name: string;
    type: string;
    model_name: string;
    is_active: boolean;
  };
}

export function useUserModelAccess() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userModels, setUserModels] = useState<UserModelAccess[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's available models
  const fetchUserModels = async () => {
    if (!user) {
      setUserModels([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🤖 Fetching AI models for user:', user.id);
      
      // First get user model access records
      const { data: accessData, error } = await supabase
        .from('user_model_access')
        .select('id, provider_id, is_enabled, granted_at')
        .eq('user_id', user.id)
        .eq('is_enabled', true);

      if (error) {
        console.log('📝 Query error or no user_model_access:', error);
      }

      let models: UserModelAccess[] = [];

      if (accessData && accessData.length > 0) {
        // Get the AI providers for these access records
        const { data: providersData, error: providersError } = await supabase
          .from('ai_providers')
          .select('id, name, type, model_name, is_active')
          .eq('is_active', true)
          .in('id', accessData.map(access => access.provider_id));

        if (providersError) {
          console.error('Error fetching providers:', providersError);
        } else {
          // Manually join the data
          models = accessData
            .map(access => {
              const provider = providersData?.find(p => p.id === access.provider_id);
              if (!provider) return null;
              
              return {
                ...access,
                provider
              };
            })
            .filter(Boolean) as UserModelAccess[];
        }
      }

      console.log('📊 Found user model access records:', models.length);

      // If user has no model access, provide default models from ai_chat_config
      if (models.length === 0) {
        console.log('🔄 No user model access found, fetching default models');
        
        const { data: configData, error: configError } = await supabase
          .from('ai_chat_config')
          .select('default_user_primary_model_id, default_user_secondary_model_id')
          .single();

        if (configError) {
          console.error('❌ Config fetch error:', configError);
          throw new Error('Failed to load AI configuration');
        }

        console.log('⚙️ Config data:', configData);

        const defaultModelIds = [
          configData?.default_user_primary_model_id,
          configData?.default_user_secondary_model_id
        ].filter(Boolean);

        console.log('🎯 Default model IDs:', defaultModelIds);

        if (defaultModelIds.length > 0) {
          const { data: defaultModels, error: modelsError } = await supabase
            .from('ai_providers')
            .select('*')
            .in('id', defaultModelIds)
            .eq('is_active', true);

          if (modelsError) {
            console.error('❌ Default models fetch error:', modelsError);
            throw new Error('Failed to load default AI models');
          }

          console.log('✅ Found default models:', defaultModels?.length);

          models = defaultModels?.map(provider => ({
            id: `default-${provider.id}`,
            provider_id: provider.id,
            is_enabled: true,
            granted_at: new Date().toISOString(),
            provider,
            ai_providers: provider as any
          })) || [];
        } else {
          console.warn('⚠️ No default model IDs configured');
        }
      }

      console.log('🎉 Final models array:', models.length);
      setUserModels(models);

      // Set first available model as selected if none selected
      if (!selectedModelId && models.length > 0) {
        console.log('🎯 Setting default model:', models[0].provider_id);
        setSelectedModelId(models[0].provider_id);
      }

    } catch (error) {
      console.error('❌ Critical error fetching user models:', error);
      setUserModels([]);
      toast({
        title: "Error",
        description: "Failed to load available AI models",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin (has access to all models)
  const checkAdminStatus = async () => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return data?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Get all available models for admin users
  const fetchAllModels = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(provider => ({
        id: `admin-${provider.id}`,
        provider_id: provider.id,
        is_enabled: true,
        granted_at: new Date().toISOString(),
        provider
      })) || [];

    } catch (error) {
      console.error('Error fetching all models:', error);
      return [];
    }
  };

  // Load user models or all models for admin
  const loadModels = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const isAdmin = await checkAdminStatus();
    
    if (isAdmin) {
      const allModels = await fetchAllModels();
      setUserModels(allModels);
      if (!selectedModelId && allModels.length > 0) {
        setSelectedModelId(allModels[0].provider_id);
      }
    } else {
      await fetchUserModels();
    }
    
    setLoading(false);
  };

  // Select a model with database persistence
  const selectModel = useCallback(async (providerId: string) => {
    const model = userModels.find(m => m.provider_id === providerId);
    if (!model || !user) {
      console.warn('🚨 Cannot save model preference: model not found or user not authenticated');
      console.log('Available models:', userModels.map(m => ({ id: m.provider_id, name: m.provider?.name })));
      return;
    }

    console.log('🎯 SELECTING MODEL:', { 
      clickedProviderId: providerId, 
      modelName: model.provider?.name,
      modelType: model.provider?.type 
    });
    
    // Update state immediately for instant UI feedback
    setSelectedModelId(providerId);
    
    try {
      // Save to database with explicit logging
      console.log('💾 Saving to database:', { user_id: user.id, selected_model_id: providerId });
      
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          selected_model_id: providerId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select('selected_model_id');
      
      if (error) {
        console.error('❌ Error saving model preference:', error);
        // Revert state on error
        setSelectedModelId(null);
        return;
      }
      
      console.log('✅ Database save successful:', data);
      
      // Wait a small moment for the database trigger to fire
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Dispatch enhanced event with complete model data for immediate UI sync
      const modelChangeEvent = new CustomEvent('modelChanged', { 
        detail: { 
          modelId: providerId,
          modelName: model.provider?.name,
          modelType: model.provider?.type,
          providerId, 
          model: { 
            provider: {
              id: model.provider?.id,
              name: model.provider?.name,
              type: model.provider?.type,
              model_name: model.provider?.model_name
            },
            provider_id: model.provider_id
          },
          selectedModelId: providerId,
          timestamp: Date.now() 
        } 
      });
      
      console.log('🚀 Model Selection: Dispatching modelChanged event with detail:', modelChangeEvent.detail);
      window.dispatchEvent(modelChangeEvent);
      
      // Also trigger a global refresh to ensure all status indicators update
      const globalRefreshEvent = new CustomEvent('globalStatusRefresh', {
        detail: { modelId: providerId, timestamp: Date.now() }
      });
      window.dispatchEvent(globalRefreshEvent);
      
      // Force immediate refresh of all connected components
      const forceRefreshEvent = new CustomEvent('forceStatusRefresh', {
        detail: { modelId: providerId, timestamp: Date.now() }
      });
      window.dispatchEvent(forceRefreshEvent);
      
      console.log('🎉 Model selection complete:', { 
        savedProviderId: providerId, 
        modelName: model.provider?.name,
        uiUpdated: true,
        databaseUpdated: true
      });
      
    } catch (error) {
      console.error('💥 Critical error updating model preference:', error);
      // Revert state on error
      setSelectedModelId(null);
    }
  }, [userModels, user]);

  // Get currently selected model with validation
  const getSelectedModel = () => {
    const model = userModels.find(m => m.provider_id === selectedModelId);
    if (!model && selectedModelId) {
      console.warn('⚠️ Selected model not found in userModels:', { selectedModelId, availableModels: userModels.map(m => m.provider_id) });
    }
    return model;
  };

  useEffect(() => {
    if (user) {
      loadModels();
    }
  }, [user]);

  // Listen for model changes from other components and refresh state
  useEffect(() => {
    const handleModelChange = (event: CustomEvent) => {
      const { selectedModelId: newSelectedModelId } = event.detail;
      if (newSelectedModelId && newSelectedModelId !== selectedModelId) {
        console.log('🔄 useUserModelAccess: Refreshing state for model change:', newSelectedModelId);
        setSelectedModelId(newSelectedModelId);
      }
    };

    window.addEventListener('modelChanged', handleModelChange as EventListener);
    return () => {
      window.removeEventListener('modelChanged', handleModelChange as EventListener);
    };
  }, [selectedModelId]);

  // Load user's saved model preference from database
  const loadUserModelPreference = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('selected_model_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.log('No user preferences found, will use default');
        return null;
      }
      
      return data?.selected_model_id;
    } catch (error) {
      console.error('Error loading user model preference:', error);
      return null;
    }
  };

  // Load and set user's saved model preference after models are loaded
  useEffect(() => {
    const loadSavedPreference = async () => {
      if (userModels.length > 0 && !selectedModelId && user) {
        const savedModelId = await loadUserModelPreference();
        
        if (savedModelId && userModels.find(m => m.provider_id === savedModelId)) {
          console.log('🔄 Restoring saved model from database:', savedModelId);
          setSelectedModelId(savedModelId);
        } else if (userModels.length > 0) {
          // Set first available model as default
          const defaultModel = userModels[0];
          console.log('🎯 Setting default model:', defaultModel.provider_id);
          setSelectedModelId(defaultModel.provider_id);
        }
      }
    };
    
    loadSavedPreference();
  }, [userModels, selectedModelId, user]);

  return {
    userModels,
    selectedModelId,
    selectedModel: getSelectedModel(),
    loading,
    selectModel,
    getSelectedModel,
    refreshModels: loadModels
  };
}