import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ModelUsage {
  provider_id: string;
  provider_name: string;
  current_usage: number;
  usage_limit: number | null;
  can_use_model: boolean;
}

export function useModelQuotas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modelUsages, setModelUsages] = useState<ModelUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModelUsages = async () => {
    if (!user) {
      setModelUsages([]);
      setLoading(false);
      return;
    }

    try {
      // Get user's model access records
      const { data: accessData, error: accessError } = await supabase
        .from('user_model_access')
        .select('provider_id, usage_current, usage_limit, is_enabled')
        .eq('user_id', user.id)
        .eq('is_enabled', true);

      if (accessError) throw accessError;

      // Get active AI providers that the user has access to
      let providerIds: string[] = [];
      if (accessData && accessData.length > 0) {
        providerIds = accessData.map(access => access.provider_id);
      } else {
        // If no access data, get default models from config
        const { data: configData, error: configError } = await supabase
          .from('ai_chat_config')
          .select('default_user_primary_model_id, default_user_secondary_model_id')
          .limit(1)
          .single();

        if (configError) throw configError;
        
        if (configData) {
          providerIds = [
            configData.default_user_primary_model_id,
            configData.default_user_secondary_model_id
          ].filter(Boolean);
        }
      }

      if (providerIds.length === 0) {
        setModelUsages([]);
        setLoading(false);
        return;
      }

      // Get active AI providers
      const { data: providersData, error: providersError } = await supabase
        .from('ai_providers')
        .select('id, name, type, model_name, is_active')
        .eq('is_active', true)
        .in('id', providerIds);

      if (providersError) throw providersError;

      // Create usage data - either from access records or default unlimited
      const usages: ModelUsage[] = providerIds
        .map(providerId => {
          const provider = providersData?.find(p => p.id === providerId);
          if (!provider) return null;
          
          const access = accessData?.find(a => a.provider_id === providerId);
          
          return {
            provider_id: providerId,
            provider_name: provider.name,
            current_usage: access?.usage_current || 0,
            usage_limit: access?.usage_limit || null, // null = unlimited for default models
            can_use_model: access?.usage_limit === null || access?.usage_limit === undefined || 
                          (access?.usage_current || 0) < (access?.usage_limit || Infinity)
          };
        })
        .filter(Boolean) as ModelUsage[];

      setModelUsages(usages);
    } catch (error) {
      console.error('Error fetching model usages:', error);
      toast({
        title: "Error",
        description: "Failed to load model usage information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkModelQuota = async (providerId: string) => {
    if (!user) return { canUse: false, usage: 0, limit: 0 };

    try {
      const { data, error } = await supabase.rpc('check_model_quota', {
        user_id_param: user.id,
        provider_id_param: providerId
      });

      if (error) throw error;

      const result = data?.[0];
      return {
        canUse: result?.can_use_model || false,
        usage: result?.current_usage || 0,
        limit: result?.usage_limit || 0,
        providerName: result?.provider_name || 'Unknown'
      };
    } catch (error) {
      console.error('Error checking model quota:', error);
      return { canUse: false, usage: 0, limit: 0 };
    }
  };

  const getUsagePercentage = (providerId: string) => {
    const usage = modelUsages.find(u => u.provider_id === providerId);
    if (!usage || usage.usage_limit === null) return 0;
    return usage.usage_limit > 0 ? (usage.current_usage / usage.usage_limit) * 100 : 0;
  };

  const getRemainingQuota = (providerId: string) => {
    const usage = modelUsages.find(u => u.provider_id === providerId);
    if (!usage) {
      // If no usage data found, assume unlimited for default models
      return Infinity;
    }
    if (usage.usage_limit === null) return Infinity;
    return Math.max(0, usage.usage_limit - usage.current_usage);
  };

  useEffect(() => {
    fetchModelUsages();
  }, [user]);

  return {
    modelUsages,
    loading,
    checkModelQuota,
    getUsagePercentage,
    getRemainingQuota,
    refreshUsages: fetchModelUsages
  };
}