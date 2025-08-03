import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

interface MaintenanceData {
  id: string;
  is_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  estimated_completion?: string;
  contact_info?: string;
}

export const useMaintenanceCheck = () => {
  const { isAdmin } = useProfile();
  const { user } = useAuth();
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const fetchMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('site_maintenance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching maintenance status:', error);
        return;
      }

      if (data) {
        setMaintenanceData(data);
        setIsMaintenanceMode(data.is_enabled);
        
        // Non-admin users should be redirected when maintenance is enabled
        setShouldRedirect(data.is_enabled && user && !isAdmin);
      }
    } catch (error) {
      console.error('Error in maintenance check:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user !== null) { // Only run when auth state is determined
      fetchMaintenanceStatus();
    }
  }, [user, isAdmin]);

  // Set up real-time subscription for maintenance status changes
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_maintenance'
        },
        () => {
          fetchMaintenanceStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  return {
    maintenanceData,
    isMaintenanceMode,
    shouldRedirect,
    loading
  };
};