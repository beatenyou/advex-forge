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
      const { data, error } = await supabase
        .from('user_model_access')
        .select(`
          id,
          provider_id,
          is_enabled,
          granted_at,
          ai_providers!inner(
            id,
            name,
            type,
            model_name,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .eq('ai_providers.is_active', true);

      if (error) throw error;

      let models = data?.map(item => ({
        ...item,
        provider: item.ai_providers as any
      })) || [];

      // If user has no model access, provide default models from ai_chat_config
      if (models.length === 0) {
        console.log('No user model access found, fetching default models');
        
        const { data: configData } = await supabase
          .from('ai_chat_config')
          .select('default_user_primary_model_id, default_user_secondary_model_id')
          .single();

        const defaultModelIds = [
          configData?.default_user_primary_model_id,
          configData?.default_user_secondary_model_id
        ].filter(Boolean);

        if (defaultModelIds.length > 0) {
          const { data: defaultModels } = await supabase
            .from('ai_providers')
            .select('*')
            .in('id', defaultModelIds)
            .eq('is_active', true);

          models = defaultModels?.map(provider => ({
            id: `default-${provider.id}`,
            provider_id: provider.id,
            is_enabled: true,
            granted_at: new Date().toISOString(),
            provider,
            ai_providers: provider as any // Add this property to match the type
          })) || [];
        }
      }

      setUserModels(models);

      // Set first available model as selected if none selected
      if (!selectedModelId && models.length > 0) {
        setSelectedModelId(models[0].provider_id);
      }

    } catch (error) {
      console.error('Error fetching user models:', error);
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