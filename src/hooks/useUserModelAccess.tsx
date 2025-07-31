import { useState, useEffect } from 'react';
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

  // Select a model
  const selectModel = (providerId: string) => {
    const model = userModels.find(m => m.provider_id === providerId);
    if (model) {
      setSelectedModelId(providerId);
      localStorage.setItem('selectedModelId', providerId);
    }
  };

  // Get currently selected model
  const getSelectedModel = () => {
    return userModels.find(m => m.provider_id === selectedModelId);
  };

  useEffect(() => {
    if (user) {
      // Restore selected model from localStorage
      const savedModelId = localStorage.getItem('selectedModelId');
      if (savedModelId) {
        setSelectedModelId(savedModelId);
      }
      
      loadModels();
    }
  }, [user]);

  return {
    userModels,
    selectedModelId,
    selectedModel: getSelectedModel(),
    loading,
    selectModel,
    refreshModels: loadModels
  };
}