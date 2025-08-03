import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'user' | 'pro' | 'admin';

interface UserProfile {
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
        // First ensure profile exists
        await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            email: user.email || '',
            display_name: user.email?.split('@')[0] || 'User',
            role: 'user',
            role_enum: 'user',
            permissions: ['user'],
            is_pro: false,
            subscription_status: 'free'
          }, {
            onConflict: 'user_id'
          });

        // Then fetch complete profile
        const { data, error } = await supabase
          .rpc('get_complete_user_profile', { target_user_id: user.id });

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
            role_enum: data[0].role as UserRole
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