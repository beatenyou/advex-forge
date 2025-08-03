import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, CreditCard, Zap, Settings, Eye, ExternalLink } from 'lucide-react';

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  default_member_access_level: string;
  ai_credits_pool: number;
  ai_credits_used: number;
  seat_limit: number;
  seat_used: number;
  member_role: string;
  joined_at: string;
}

interface UserUsageStats {
  ai_usage_current: number;
  ai_quota_limit: number;
  plan_name: string;
}

export default function OrganizationPreferences() {
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [userStats, setUserStats] = useState<UserUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.user_id) {
      fetchOrganizationInfo();
      fetchUserStats();
    }
  }, [profile]);

  const fetchOrganizationInfo = async () => {
    try {
      // Get user's organization membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          role,
          joined_at,
          organization_id,
          organizations (
            id,
            name,
            slug,
            subscription_plan,
            default_member_access_level,
            ai_credits_pool,
            ai_credits_used,
            seat_limit,
            seat_used
          )
        `)
        .eq('user_id', profile?.user_id)
        .eq('is_active', true)
        .single();

      if (membershipError) {
        // User is not part of any organization
        setOrganizationInfo(null);
        return;
      }

      if (membershipData?.organizations) {
        const org = membershipData.organizations as any;
        setOrganizationInfo({
          id: org.id,
          name: org.name,
          slug: org.slug,
          subscription_plan: org.subscription_plan,
          default_member_access_level: org.default_member_access_level,
          ai_credits_pool: org.ai_credits_pool,
          ai_credits_used: org.ai_credits_used,
          seat_limit: org.seat_limit,
          seat_used: org.seat_used,
          member_role: membershipData.role,
          joined_at: membershipData.joined_at
        });
      }
    } catch (error: any) {
      console.error('Error fetching organization info:', error);
      setOrganizationInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_billing')
        .select(`
          ai_usage_current,
          ai_quota_limit,
          billing_plans (
            name
          )
        `)
        .eq('user_id', profile?.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserStats({
          ai_usage_current: data.ai_usage_current || 0,
          ai_quota_limit: data.ai_quota_limit || 50,
          plan_name: (data.billing_plans as any)?.name || 'Free'
        });
      } else {
        setUserStats({
          ai_usage_current: 0,
          ai_quota_limit: 50,
          plan_name: 'Free'
        });
      }
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      setUserStats(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organizationInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Membership
          </CardTitle>
          <CardDescription>
            You are not currently a member of any organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Organization</h3>
            <p className="text-muted-foreground mb-4">
              Join an organization to access shared resources, credits, and collaboration features.
            </p>
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Contact Admin to Join Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const creditUsagePercentage = organizationInfo.ai_credits_pool > 0 
    ? Math.round((organizationInfo.ai_credits_used / organizationInfo.ai_credits_pool) * 100)
    : 0;

  const seatUsagePercentage = organizationInfo.seat_limit > 0
    ? Math.round((organizationInfo.seat_used / organizationInfo.seat_limit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Membership
          </CardTitle>
          <CardDescription>
            Your current organization and membership details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-lg">{organizationInfo.name}</h4>
              <p className="text-sm text-muted-foreground">@{organizationInfo.slug}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={organizationInfo.member_role === 'owner' ? 'default' : 'secondary'}>
                  {organizationInfo.member_role}
                </Badge>
                <Badge variant="outline">
                  {organizationInfo.subscription_plan}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Member Since:</span>
                <span>{new Date(organizationInfo.joined_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Access Level:</span>
                <Badge variant="outline" className="text-xs">
                  {organizationInfo.default_member_access_level}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Organization AI Credits
            </CardTitle>
            <CardDescription>
              Shared AI credit pool for the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Credits:</span>
                <span className="font-bold">{organizationInfo.ai_credits_pool.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Used Credits:</span>
                <span className="font-bold text-red-600">{organizationInfo.ai_credits_used.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span>Available Credits:</span>
                <span className="font-bold text-green-600">
                  {(organizationInfo.ai_credits_pool - organizationInfo.ai_credits_used).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(creditUsagePercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {creditUsagePercentage}% of organization credits used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Your Personal Usage
            </CardTitle>
            <CardDescription>
              Your individual AI usage and quota
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Personal Quota:</span>
                  <span className="font-bold">{userStats.ai_quota_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Used This Month:</span>
                  <span className="font-bold text-blue-600">{userStats.ai_usage_current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span>Remaining:</span>
                  <span className="font-bold text-green-600">
                    {(userStats.ai_quota_limit - userStats.ai_usage_current).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((userStats.ai_usage_current / userStats.ai_quota_limit) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Plan: {userStats.plan_name}</span>
                  <span className="text-muted-foreground">
                    {Math.round((userStats.ai_usage_current / userStats.ai_quota_limit) * 100)}% used
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Unable to load usage stats</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Organization Capacity
            </CardTitle>
            <CardDescription>
              Seat usage and organization limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Seats:</span>
                <span className="font-bold">{organizationInfo.seat_limit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Used Seats:</span>
                <span className="font-bold text-purple-600">{organizationInfo.seat_used}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span>Available Seats:</span>
                <span className="font-bold text-green-600">
                  {organizationInfo.seat_limit - organizationInfo.seat_used}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(seatUsagePercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {seatUsagePercentage}% of organization seats used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Organization-related actions and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(organizationInfo.member_role === 'admin' || organizationInfo.member_role === 'owner') && (
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Organization
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start">
              <Eye className="mr-2 h-4 w-4" />
              View Usage History
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing Information
            </Button>
            {organizationInfo.member_role !== 'owner' && (
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                <ExternalLink className="mr-2 h-4 w-4" />
                Leave Organization
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}