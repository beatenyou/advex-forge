import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Settings, Plus, UserPlus, CreditCard, BarChart3, Zap, DollarSign, TrendingUp } from 'lucide-react';

interface EnhancedOrganization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  subscription_plan: string;
  seat_limit: number;
  seat_used: number;
  is_active: boolean;
  created_at: string;
  ai_credits_pool: number;
  ai_credits_used: number;
  default_member_access_level: string;
  billing_plan_id?: string;
  billing_contact_email?: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    email: string;
    display_name: string;
    role_enum: string;
    is_pro: boolean;
  };
}

interface OrganizationAnalytics {
  total_members: number;
  active_members: number;
  total_ai_interactions: number;
  credits_used: number;
  credits_remaining: number;
  top_users: any[];
}

export function EnhancedOrganizationManager() {
  const [organizations, setOrganizations] = useState<EnhancedOrganization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [isBulkCreditDialogOpen, setIsBulkCreditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [defaultAccessLevel, setDefaultAccessLevel] = useState('user');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteAccessLevel, setInviteAccessLevel] = useState('user');
  const [creditAmount, setCreditAmount] = useState('');
  const [bulkCreditAmount, setBulkCreditAmount] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers(selectedOrg);
      fetchAnalytics(selectedOrg);
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
      if (data && data.length > 0) {
        setSelectedOrg(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (orgId: string) => {
    try {
      // First, get organization members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      if (membersError) throw membersError;
      
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Then get profile data for each member
      const userIds = membersData.map(member => member.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, role_enum, is_pro')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      
      // Combine members with profile data
      const membersWithProfiles = membersData.map(member => {
        const profile = profilesData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          profiles: profile || {
            email: `user-${member.user_id.slice(0, 8)}@company.com`,
            display_name: `User ${member.user_id.slice(0, 8)}`,
            role_enum: 'user',
            is_pro: false
          }
        };
      });
      
      setMembers(membersWithProfiles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch organization members: ${error.message}`,
        variant: 'destructive',
      });
      setMembers([]);
    }
  };

  const fetchAnalytics = async (orgId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_organization_usage_analytics', {
        org_id: orgId
      });

      if (error) throw error;
      const result = data?.[0];
      if (result) {
        setAnalytics({
          ...result,
          top_users: Array.isArray(result.top_users) ? result.top_users : []
        });
      } else {
        setAnalytics(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
    }
  };

  const createOrganization = async () => {
    if (!orgName || !orgSlug) {
      toast({
        title: 'Error',
        description: 'Name and slug are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug,
          domain: orgDomain || null,
          default_member_access_level: defaultAccessLevel,
        })
        .select()
        .single();

      if (error) throw error;

      // Add current user as owner
      await supabase.from('organization_members').insert({
        organization_id: data.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        role: 'owner',
      });

      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });

      setIsCreateDialogOpen(false);
      setOrgName('');
      setOrgSlug('');
      setOrgDomain('');
      setDefaultAccessLevel('user');
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    }
  };

  const enhancedInviteUsers = async () => {
    if (!selectedOrg || !inviteEmails) {
      toast({
        title: 'Error',
        description: 'Please select an organization and enter email addresses',
        variant: 'destructive',
      });
      return;
    }

    const emails = inviteEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email);

    try {
      const { data, error } = await supabase.rpc('enhanced_bulk_invite_users', {
        org_id: selectedOrg,
        user_emails: emails,
        default_role: 'member',
        access_level: inviteAccessLevel,
      });

      if (error) throw error;

      const successCount = data?.filter((r: any) => r.status === 'added' || r.status === 'invited').length || 0;
      const errorCount = data?.filter((r: any) => r.status === 'error').length || 0;

      toast({
        title: 'Invitations Processed',
        description: `${successCount} successful, ${errorCount} failed invitations`,
      });

      setIsInviteDialogOpen(false);
      setInviteEmails('');
      setInviteAccessLevel('user');
      fetchMembers(selectedOrg);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite users',
        variant: 'destructive',
      });
    }
  };

  const purchaseBulkCredits = async () => {
    if (!selectedOrg || !bulkCreditAmount) {
      toast({
        title: 'Error',
        description: 'Please enter credit amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('purchase_organization_credits', {
        org_id: selectedOrg,
        credit_amount: parseInt(bulkCreditAmount),
        admin_user_id: userData.user?.id,
        purchase_description: `Bulk credit purchase of ${bulkCreditAmount} credits`
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Added ${bulkCreditAmount} credits to organization pool`,
      });

      setIsBulkCreditDialogOpen(false);
      setBulkCreditAmount('');
      fetchOrganizations();
      if (selectedOrg) fetchAnalytics(selectedOrg);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase credits',
        variant: 'destructive',
      });
    }
  };

  const allocateCreditsToMember = async (userId: string) => {
    if (!selectedOrg || !creditAmount) {
      toast({
        title: 'Error',
        description: 'Please enter credit amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('allocate_organization_credits', {
        org_id: selectedOrg,
        target_user_id: userId,
        credit_amount: parseInt(creditAmount),
        admin_user_id: userData.user?.id
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Allocated ${creditAmount} credits to user`,
      });

      setIsCreditDialogOpen(false);
      setCreditAmount('');
      fetchOrganizations();
      if (selectedOrg) fetchAnalytics(selectedOrg);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to allocate credits',
        variant: 'destructive',
      });
    }
  };

  const selectedOrgData = organizations.find(org => org.id === selectedOrg);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enterprise Organization Management</h2>
          <p className="text-muted-foreground">Manage organizations, billing, and user access levels</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Set up a new organization with billing and access controls.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>
              <div>
                <Label htmlFor="orgSlug">Slug</Label>
                <Input
                  id="orgSlug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="unique-organization-slug"
                />
              </div>
              <div>
                <Label htmlFor="orgDomain">Domain (Optional)</Label>
                <Input
                  id="orgDomain"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  placeholder="company.com"
                />
              </div>
              <div>
                <Label>Default Member Access Level</Label>
                <Select value={defaultAccessLevel} onValueChange={setDefaultAccessLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User Access</SelectItem>
                    <SelectItem value="pro">Pro Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createOrganization} className="w-full">
                Create Organization
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Select an organization to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {organizations.map((org) => (
              <div
                key={org.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedOrg === org.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedOrg(org.id)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{org.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {org.seat_used}/{org.seat_limit} seats
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs">{org.ai_credits_pool - org.ai_credits_used}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{org.default_member_access_level}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Organization Details */}
        {selectedOrg && selectedOrgData && (
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing & Credits
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {analytics && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-2xl font-bold">{analytics.total_members}</p>
                            <p className="text-xs text-muted-foreground">Total Members</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-2xl font-bold">{analytics.active_members}</p>
                            <p className="text-xs text-muted-foreground">Active Members</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <div>
                            <p className="text-2xl font-bold">{analytics.total_ai_interactions}</p>
                            <p className="text-xs text-muted-foreground">AI Interactions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-2xl font-bold">{analytics.credits_remaining}</p>
                            <p className="text-xs text-muted-foreground">Credits Left</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Organization Members</h3>
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Users
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Users with Access Level</DialogTitle>
                        <DialogDescription>
                          Enter email addresses and set their access level based on organization plan.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Access Level for New Members</Label>
                          <Select value={inviteAccessLevel} onValueChange={setInviteAccessLevel}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User Access</SelectItem>
                              <SelectItem value="pro">Pro Access</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="inviteEmails">Email Addresses</Label>
                          <Textarea
                            id="inviteEmails"
                            value={inviteEmails}
                            onChange={(e) => setInviteEmails(e.target.value)}
                            placeholder="user1@example.com&#10;user2@example.com"
                            rows={5}
                          />
                        </div>
                        <Button onClick={enhancedInviteUsers} className="w-full">
                          Send Invitations with {inviteAccessLevel} Access
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        <div>
                          <h4 className="font-medium">{member.profiles?.display_name || 'Unknown'}</h4>
                          <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.profiles?.is_pro ? 'default' : 'secondary'}>
                          {member.profiles?.role_enum || 'user'}
                        </Badge>
                        <Badge variant="outline">{member.role}</Badge>
                        <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Zap className="mr-1 h-3 w-3" />
                              Allocate Credits
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Allocate Credits</DialogTitle>
                              <DialogDescription>
                                Allocate organization credits to {member.profiles?.display_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="creditAmount">Credit Amount</Label>
                                <Input
                                  id="creditAmount"
                                  type="number"
                                  value={creditAmount}
                                  onChange={(e) => setCreditAmount(e.target.value)}
                                  placeholder="Enter credit amount"
                                />
                              </div>
                              <Button onClick={() => allocateCreditsToMember(member.user_id)} className="w-full">
                                Allocate Credits
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        AI Credit Pool
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Credits:</span>
                          <span className="font-bold">{selectedOrgData.ai_credits_pool}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Used Credits:</span>
                          <span className="font-bold text-red-600">{selectedOrgData.ai_credits_used}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span>Available Credits:</span>
                          <span className="font-bold text-green-600">
                            {selectedOrgData.ai_credits_pool - selectedOrgData.ai_credits_used}
                          </span>
                        </div>
                        <Dialog open={isBulkCreditDialogOpen} onOpenChange={setIsBulkCreditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              <Plus className="mr-2 h-4 w-4" />
                              Purchase Bulk Credits
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Purchase Bulk Credits</DialogTitle>
                              <DialogDescription>
                                Add credits to your organization's AI credit pool.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="bulkCreditAmount">Credit Amount</Label>
                                <Input
                                  id="bulkCreditAmount"
                                  type="number"
                                  value={bulkCreditAmount}
                                  onChange={(e) => setBulkCreditAmount(e.target.value)}
                                  placeholder="Enter credit amount"
                                />
                              </div>
                              <Button onClick={purchaseBulkCredits} className="w-full">
                                Purchase Credits
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Billing Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Plan:</span>
                          <Badge>{selectedOrgData.subscription_plan}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Default Access:</span>
                          <Badge variant="outline">{selectedOrgData.default_member_access_level}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Seat Limit:</span>
                          <span>{selectedOrgData.seat_limit}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Organization Name</Label>
                        <Input value={selectedOrgData.name} readOnly />
                      </div>
                      <div>
                        <Label>Slug</Label>
                        <Input value={selectedOrgData.slug} readOnly />
                      </div>
                      <div>
                        <Label>Domain</Label>
                        <Input value={selectedOrgData.domain || 'Not set'} readOnly />
                      </div>
                      <div>
                        <Label>Default Member Access Level</Label>
                        <Select value={selectedOrgData.default_member_access_level} disabled>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User Access</SelectItem>
                            <SelectItem value="pro">Pro Access</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}