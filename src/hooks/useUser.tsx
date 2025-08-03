import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'user' | 'pro' | 'admin';

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  role_enum: UserRole;
  subscription_status: string;
  is_pro: boolean;
  permissions: string[];
  ai_usage_current: number;
  ai_quota_limit: number;
  plan_name: string;
  organization_id?: string;
  organization_name?: string;
  organization_role?: string;
  teams?: any[];
}

export function useUser() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    setLoading(true);
    
    const fetchProfile = async () => {
      try {
        // Check if profile exists first
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        // Only create profile if it doesn't exist (for new users)
        if (!existingProfile) {
          await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email || '',
              display_name: user.email?.split('@')[0] || 'User',
              role: 'user',
              role_enum: 'user',
              permissions: ['user'],
              is_pro: false,
              subscription_status: 'free'
            });
        }

        // Fetch complete profile using the enterprise database function
        const { data, error } = await supabase
          .rpc('get_enterprise_user_profile', { target_user_id: user.id });

        if (error) {
          console.error('Error fetching profile:', error);
          // Create fallback profile
          setProfile({
            user_id: user.id,
            email: user.email || '',
            display_name: user.email?.split('@')[0] || 'User',
            role: 'user',
            role_enum: 'user',
            permissions: ['user'],
            subscription_status: 'free',
            is_pro: false,
            ai_usage_current: 0,
            ai_quota_limit: 50,
            plan_name: 'Free'
          });
        } else if (data && data.length > 0) {
          setProfile({
            ...data[0],
            role_enum: data[0].role as UserRole,
            teams: Array.isArray(data[0].teams) ? data[0].teams : []
          });
        }
      } catch (error) {
        console.error('Exception fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    refetch: () => {
      if (user) {
        setLoading(true);
        // Trigger re-fetch by setting user again
      }
    }
  };
}