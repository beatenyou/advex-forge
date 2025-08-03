import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from './useUser';

interface OrganizationContext {
  id: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

interface OrganizationContextType {
  currentOrganization: OrganizationContext | null;
  availableOrganizations: OrganizationContext[];
  setCurrentOrganization: (orgId: string | null) => void;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUser();
  const [currentOrganization, setCurrentOrganizationState] = useState<OrganizationContext | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<OrganizationContext[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.user_id) {
      fetchUserOrganizations();
    }
  }, [profile?.user_id]);

  const fetchUserOrganizations = async () => {
    if (!profile?.user_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organization:organizations(id, name)
        `)
        .eq('user_id', profile.user_id)
        .eq('is_active', true);

      if (error) throw error;

      const orgs = (data || [])
        .filter(item => item.organization)
        .map(item => ({
          id: item.organization.id,
          name: item.organization.name,
          role: item.role,
          isAdmin: ['admin', 'owner'].includes(item.role)
        }));

      setAvailableOrganizations(orgs);
      
      // Set current organization to user's primary org or first available
      if (orgs.length > 0 && !currentOrganization) {
        const primaryOrg = orgs.find(org => org.id === profile.organization_id) || orgs[0];
        setCurrentOrganizationState(primaryOrg);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentOrganization = (orgId: string | null) => {
    if (orgId) {
      const org = availableOrganizations.find(o => o.id === orgId);
      setCurrentOrganizationState(org || null);
    } else {
      setCurrentOrganizationState(null);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        availableOrganizations,
        setCurrentOrganization,
        loading
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
}