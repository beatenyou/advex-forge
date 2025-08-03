import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useProPlanCheck = () => {
  const { user } = useAuth();
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProStatus = async () => {
      if (!user) {
        setIsProUser(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_billing')
          .select(`
            plan_id,
            billing_plans(name)
          `)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking pro status:', error);
          setIsProUser(false);
        } else {
          const planName = (data?.billing_plans as any)?.name?.toLowerCase() || '';
          setIsProUser(planName.includes('pro') || planName.includes('premium'));
        }
      } catch (error) {
        console.error('Error checking pro status:', error);
        setIsProUser(false);
      } finally {
        setLoading(false);
      }
    };

    checkProStatus();
  }, [user]);

  return { isProUser, loading };
};