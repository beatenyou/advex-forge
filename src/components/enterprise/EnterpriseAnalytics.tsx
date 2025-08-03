import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Building2, Activity, TrendingUp, Clock } from 'lucide-react';

interface OrganizationMetrics {
  id: string;
  name: string;
  subscription_plan: string;
  seat_used: number;
  seat_limit: number;
  member_count: number;
  team_count: number;
  usage_current: number;
  usage_limit: number;
}

interface AnalyticsData {
  totalOrganizations: number;
  totalUsers: number;
  totalTeams: number;
  activeUsers: number;
  organizations: OrganizationMetrics[];
}

export const EnterpriseAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch organization metrics
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          subscription_plan,
          seat_used,
          seat_limit,
          organization_members!inner(
            user_id,
            is_active
          )
        `)
        .eq('is_active', true);

      if (orgsError) throw orgsError;

      // Fetch teams count per organization
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('organization_id')
        .eq('is_active', true);

      if (teamsError) throw teamsError;

      // Fetch user billing info
      const { data: billing, error: billingError } = await supabase
        .from('user_billing')
        .select('user_id, ai_usage_current, ai_quota_limit');

      if (billingError) throw billingError;

      // Process the data
      const organizationMetrics = orgs?.map(org => {
        const activeMembers = org.organization_members.filter(m => m.is_active).length;
        const orgTeams = teams?.filter(t => t.organization_id === org.id).length || 0;
        
        // Calculate aggregate usage for organization
        const orgMembers = org.organization_members.map(m => m.user_id);
        const orgBilling = billing?.filter(b => orgMembers.includes(b.user_id)) || [];
        const totalUsage = orgBilling.reduce((sum, b) => sum + (b.ai_usage_current || 0), 0);
        const totalLimit = orgBilling.reduce((sum, b) => sum + (b.ai_quota_limit || 0), 0);

        return {
          id: org.id,
          name: org.name,
          subscription_plan: org.subscription_plan,
          seat_used: org.seat_used,
          seat_limit: org.seat_limit,
          member_count: activeMembers,
          team_count: orgTeams,
          usage_current: totalUsage,
          usage_limit: totalLimit
        };
      }) || [];

      // Calculate totals
      const totalOrganizations = orgs?.length || 0;
      const totalUsers = orgs?.reduce((sum, org) => 
        sum + org.organization_members.filter(m => m.is_active).length, 0
      ) || 0;
      const totalTeams = teams?.length || 0;
      const activeUsers = totalUsers; // All users in active organizations are considered active

      setAnalytics({
        totalOrganizations,
        totalUsers,
        totalTeams,
        activeUsers,
        organizations: organizationMetrics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'default';
      case 'professional': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Failed to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">{analytics.totalOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analytics.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Teams</p>
                <p className="text-2xl font-bold">{analytics.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
          <CardDescription>
            Detailed breakdown of each organization's usage and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.organizations.map((org) => (
              <Card key={org.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{org.name}</h3>
                      <Badge variant={getSubscriptionBadgeVariant(org.subscription_plan)}>
                        {org.subscription_plan}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Members</p>
                        <p className="font-medium">{org.member_count} / {org.seat_limit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Teams</p>
                        <p className="font-medium">{org.team_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AI Usage</p>
                        <p className="font-medium">{org.usage_current} / {org.usage_limit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Utilization</p>
                        <p className="font-medium">
                          {org.seat_limit > 0 ? Math.round((org.member_count / org.seat_limit) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                </div>
              </Card>
            ))}
            
            {analytics.organizations.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No organizations found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};