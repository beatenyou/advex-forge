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
      // Get all user's model access
      const { data: accessData, error: accessError } = await supabase
        .from('user_model_access')
        .select(`
          provider_id,
          usage_current,
          usage_limit,
          is_enabled,
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

      if (accessError) throw accessError;

      const usages: ModelUsage[] = accessData?.map(access => ({
        provider_id: access.provider_id,
        provider_name: (access.ai_providers as any).name,
        current_usage: access.usage_current || 0,
        usage_limit: access.usage_limit,
        can_use_model: access.usage_limit === null || (access.usage_current || 0) < access.usage_limit
      })) || [];

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
    if (!usage) return 0;
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