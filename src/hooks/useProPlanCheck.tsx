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
        console.log('No user found, setting isProUser to false');
        setIsProUser(false);
        setLoading(false);
        return;
      }

      console.log('Checking pro status for user:', user.id);

      try {
        // First get user billing info
        const { data: billingData, error: billingError } = await supabase
          .from('user_billing')
          .select('plan_id, subscription_status')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('Billing query result:', { billingData, billingError });

        if (billingError) {
          console.error('Error checking billing status:', billingError);
          setIsProUser(false);
          return;
        }

        if (!billingData) {
          console.log('No billing record found, checking if user should have default pro access');
          // Check if user is admin (admins get pro access by default)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          const isAdmin = profileData?.role === 'admin';
          console.log('User admin status:', isAdmin);
          setIsProUser(isAdmin);
          return;
        }

        // Now get the plan details
        const { data: planData, error: planError } = await supabase
          .from('billing_plans')
          .select('name')
          .eq('id', billingData.plan_id)
          .single();

        console.log('Plan query result:', { planData, planError });

        if (planError) {
          console.error('Error checking plan details:', planError);
          setIsProUser(false);
          return;
        }

        const planName = planData?.name?.toLowerCase() || '';
        const isProPlan = planName.includes('pro') || planName.includes('premium');
        const isActiveSubscription = billingData.subscription_status === 'active' || billingData.subscription_status === 'trialing';
        
        console.log('Plan analysis:', {
          planName,
          isProPlan,
          subscriptionStatus: billingData.subscription_status,
          isActiveSubscription
        });
        
        // User is pro if they have a pro plan AND active subscription
        setIsProUser(isProPlan && isActiveSubscription);
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