import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';

interface OrganizationInfo {
  name: string;
  role: string;
  creditsUsed: number;
  creditsTotal: number;
}

export function OrganizationPreferences() {
  const { profile } = useUser();
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_id) {
      fetchOrganizationInfo();
    }
  }, [profile?.user_id]);

  const fetchOrganizationInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations(
            name,
            ai_credits_used,
            ai_credits_pool
          )
        `)
        .eq('user_id', profile?.user_id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.organization) {
        setOrganizationInfo({
          name: data.organization.name,
          role: data.role,
          creditsUsed: data.organization.ai_credits_used || 0,
          creditsTotal: data.organization.ai_credits_pool || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching organization info:', error);
      toast.error('Failed to fetch organization information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!organizationInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>
            You are not currently part of any organization
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const creditsUsagePercentage = organizationInfo.creditsTotal > 0 
    ? (organizationInfo.creditsUsed / organizationInfo.creditsTotal) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Organization</label>
            <p className="text-lg font-semibold">{organizationInfo.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Your Role</label>
            <Badge variant="outline" className="capitalize">
              {organizationInfo.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Organization AI Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Credits Used</span>
              <span className="text-sm text-muted-foreground">
                {organizationInfo.creditsUsed.toLocaleString()} / {organizationInfo.creditsTotal.toLocaleString()}
              </span>
            </div>
            <Progress value={creditsUsagePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}