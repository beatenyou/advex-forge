import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AIUsageData {
  canUseAI: boolean;
  currentUsage: number;
  quotaLimit: number;
  planName: string;
  loading: boolean;
}

export function useAIUsage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usageData, setUsageData] = useState<AIUsageData>({
    canUseAI: false,
    currentUsage: 0,
    quotaLimit: 20,
    planName: 'Free',
    loading: true,
  });

  // Check AI usage quota
  const checkQuota = async () => {
    if (!user) {
      setUsageData(prev => ({ ...prev, loading: false, canUseAI: false }));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_ai_quota', {
        user_id_param: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const quotaInfo = data[0];
        setUsageData({
          canUseAI: quotaInfo.can_use_ai,
          currentUsage: quotaInfo.current_usage,
          quotaLimit: quotaInfo.quota_limit,
          planName: quotaInfo.plan_name,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error checking AI quota:', error);
      setUsageData(prev => ({ ...prev, loading: false }));
    }
  };

  // Increment AI usage (returns false if quota exceeded)
  const incrementUsage = async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use AI features.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('increment_ai_usage', {
        user_id_param: user.id
      });

      if (error) throw error;

      if (!data) {
        toast({
          title: "AI Usage Limit Reached",
          description: `You've reached your ${usageData.planName} plan limit of ${usageData.quotaLimit} AI interactions this month. Upgrade your plan for more usage.`,
          variant: "destructive"
        });
        
        // Refresh quota to update UI
        await checkQuota();
        return false;
      }

      // Refresh quota to update UI
      await checkQuota();
      return true;
    } catch (error) {
      console.error('Error incrementing AI usage:', error);
      toast({
        title: "Usage Error",
        description: "Failed to track AI usage. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Refresh quota data
  const refreshQuota = () => {
    setUsageData(prev => ({ ...prev, loading: true }));
    checkQuota();
  };

  useEffect(() => {
    if (user) {
      checkQuota();
    }
  }, [user]);

  return {
    ...usageData,
    incrementUsage,
    refreshQuota,
    usagePercentage: usageData.quotaLimit > 0 ? (usageData.currentUsage / usageData.quotaLimit) * 100 : 0,
  };
}