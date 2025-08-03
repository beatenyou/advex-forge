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
import { Building2, Users, Settings, Plus, UserPlus, CreditCard, BarChart3, Zap, DollarSign, TrendingUp, Edit3, Trash2, AlertTriangle, Search, UserCheck, UserMinus, ArrowRight } from 'lucide-react';

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

interface AvailableUser {
  user_id: string;
  email: string;
  display_name: string;
  role_enum: string;
  is_pro: boolean;
  organization_id?: string;
  organization_name?: string;
  current_org_role?: string;
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
  const [isEditSeatsDialogOpen, setIsEditSeatsDialogOpen] = useState(false);
  const [isDeleteOrgDialogOpen, setIsDeleteOrgDialogOpen] = useState(false);
  const [isAddUsersDialogOpen, setIsAddUsersDialogOpen] = useState(false);
  const [isEditOrgDialogOpen, setIsEditOrgDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Available users state
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterType, setUserFilterType] = useState<'all' | 'personal' | 'other-orgs'>('all');
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
  const [newSeatLimit, setNewSeatLimit] = useState('');
  const [orgToDelete, setOrgToDelete] = useState<string | null>(null);
  
  // Edit organization form states
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDomain, setEditOrgDomain] = useState('');
  const [editOrgAccessLevel, setEditOrgAccessLevel] = useState('user');
  const [orgToEdit, setOrgToEdit] = useState<EnhancedOrganization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers(selectedOrg);
      fetchAnalytics(selectedOrg);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (isAddUsersDialogOpen && selectedOrg) {
      fetchAvailableUsers();
    }
  }, [isAddUsersDialogOpen, selectedOrg]);

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

  const updateSeatLimit = async () => {
    if (!selectedOrg || !newSeatLimit) {
      toast({
        title: 'Error',
        description: 'Please enter a valid seat limit',
        variant: 'destructive',
      });
      return;
    }

    const seatLimitNum = parseInt(newSeatLimit);
    const currentOrg = organizations.find(org => org.id === selectedOrg);
    
    if (seatLimitNum < (currentOrg?.seat_used || 0)) {
      toast({
        title: 'Error',
        description: `Cannot set seat limit below current usage (${currentOrg?.seat_used} seats used)`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ seat_limit: seatLimitNum })
        .eq('id', selectedOrg);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Seat limit updated to ${seatLimitNum}`,
      });

      setIsEditSeatsDialogOpen(false);
      setNewSeatLimit('');
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update seat limit',
        variant: 'destructive',
      });
    }
  };

  const deleteOrganization = async () => {
    if (!orgToDelete) return;

    try {
      // First, get all members of the organization
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgToDelete);

      if (membersError) throw membersError;

      const memberUserIds = membersData?.map(m => m.user_id) || [];

      // Reset all members to free tier and remove organization association
      if (memberUserIds.length > 0) {
        // Update profiles to remove organization and reset to free tier
        const { error: profilesError } = await supabase
          .from('profiles')
          .update({
            organization_id: null,
            role_enum: 'user',
            is_pro: false
          })
          .in('user_id', memberUserIds);

        if (profilesError) throw profilesError;

        // Reset user billing to free tier defaults
        const { error: billingError } = await supabase
          .from('user_billing')
          .update({
            ai_quota_limit: 50,
            subscription_status: 'free'
          })
          .in('user_id', memberUserIds);

        if (billingError) {
          console.warn('Some user billing records could not be updated:', billingError);
        }

        // Remove organization memberships
        const { error: membershipError } = await supabase
          .from('organization_members')
          .delete()
          .eq('organization_id', orgToDelete);

        if (membershipError) throw membershipError;
      }

      // Finally, delete the organization
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgToDelete);

      if (orgError) throw orgError;

      toast({
        title: 'Success',
        description: `Organization deleted and ${memberUserIds.length} users migrated to Personal accounts`,
      });

      setIsDeleteOrgDialogOpen(false);
      setOrgToDelete(null);
      
      // Reset selected org if it was the deleted one
      if (selectedOrg === orgToDelete) {
        setSelectedOrg(null);
      }
      
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete organization',
        variant: 'destructive',
      });
    }
  };

  const openEditSeatsDialog = (org: EnhancedOrganization) => {
    setSelectedOrg(org.id);
    setNewSeatLimit(org.seat_limit.toString());
    setIsEditSeatsDialogOpen(true);
  };

  const openDeleteOrgDialog = (org: EnhancedOrganization) => {
    setOrgToDelete(org.id);
    setIsDeleteOrgDialogOpen(true);
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          display_name,
          role_enum,
          is_pro,
          organization_id
        `);

      if (usersError) throw usersError;

      if (!allUsers) {
        setAvailableUsers([]);
        return;
      }

      // Get organization names for users who are in organizations
      const orgIds = [...new Set(allUsers.map(u => u.organization_id).filter(Boolean))];
      let orgData: any[] = [];
      
      if (orgIds.length > 0) {
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        
        if (!orgsError) {
          orgData = orgsData || [];
        }
      }

      // Get organization member roles
      const { data: memberRoles, error: rolesError } = await supabase
        .from('organization_members')
        .select('user_id, role, organization_id')
        .eq('is_active', true);

      if (rolesError) {
        console.warn('Could not fetch member roles:', rolesError);
      }

      const enrichedUsers: AvailableUser[] = allUsers.map(user => {
        const org = orgData.find(o => o.id === user.organization_id);
        const memberRole = memberRoles?.find(m => m.user_id === user.user_id && m.organization_id === user.organization_id);
        
        return {
          ...user,
          organization_name: org?.name,
          current_org_role: memberRole?.role
        };
      });

      setAvailableUsers(enrichedUsers);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch available users',
        variant: 'destructive',
      });
      setAvailableUsers([]);
    }
  };

  const openEditOrgDialog = (org: EnhancedOrganization) => {
    setOrgToEdit(org);
    setEditOrgName(org.name);
    setEditOrgDomain(org.domain || '');
    setEditOrgAccessLevel(org.default_member_access_level);
    setIsEditOrgDialogOpen(true);
  };

  const updateOrganization = async () => {
    if (!orgToEdit || !editOrgName) {
      toast({
        title: 'Error',
        description: 'Organization name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editOrgName,
          domain: editOrgDomain || null,
          default_member_access_level: editOrgAccessLevel
        })
        .eq('id', orgToEdit.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });

      setIsEditOrgDialogOpen(false);
      setOrgToEdit(null);
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization',
        variant: 'destructive',
      });
    }
  };

  const addUsersToOrganization = async () => {
    if (!selectedOrg || selectedUsers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select users to add',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Add users to organization
      const memberInserts = selectedUsers.map(userId => ({
        organization_id: selectedOrg,
        user_id: userId,
        role: 'member',
        invited_by: userData.user?.id
      }));

      const { error: memberError } = await supabase
        .from('organization_members')
        .insert(memberInserts);

      if (memberError) throw memberError;

      // Update user profiles to reflect organization membership
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: selectedOrg,
          role_enum: 'user',
          is_pro: false
        })
        .in('user_id', selectedUsers);

      if (profileError) {
        console.warn('Some user profiles could not be updated:', profileError);
      }

      toast({
        title: 'Success',
        description: `Added ${selectedUsers.length} users to organization`,
      });

      setIsAddUsersDialogOpen(false);
      setSelectedUsers([]);
      setUserSearchQuery('');
      fetchMembers(selectedOrg);
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add users',
        variant: 'destructive',
      });
    }
  };

  const getFilteredUsers = () => {
    let filtered = availableUsers;

    // Filter by type
    if (userFilterType === 'personal') {
      filtered = filtered.filter(user => !user.organization_id);
    } else if (userFilterType === 'other-orgs') {
      filtered = filtered.filter(user => user.organization_id && user.organization_id !== selectedOrg);
    }

    // Filter by search query
    if (userSearchQuery) {
      const query = userSearchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(query) ||
        (user.display_name && user.display_name.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getSeatUtilization = (org: EnhancedOrganization) => {
    const percentage = (org.seat_used / org.seat_limit) * 100;
    let colorClass = 'bg-success';
    
    if (percentage >= 90) colorClass = 'bg-destructive';
    else if (percentage >= 75) colorClass = 'bg-warning';
    
    return { percentage, colorClass };
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

      {/* Workflow Information Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm mb-2">Enterprise Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Enterprise Signups:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Create organization first</li>
                  <li>Add users to organization</li>
                  <li>Enterprise billed on seat purchases + AI credits</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Individual Signups:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Add users to Pro or Free accounts</li>
                  <li>Manually allocate AI credits if purchased</li>
                  <li>Pro access = more credits + advanced features</li>
                </ol>
              </div>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              💡 User role changes are handled in the <strong>User Management</strong> tab for detailed profile management.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Seats Dialog */}
      <Dialog open={isEditSeatsDialogOpen} onOpenChange={setIsEditSeatsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Seat Limit</DialogTitle>
            <DialogDescription>
              Update the maximum number of seats for this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newSeatLimit">New Seat Limit</Label>
              <Input
                id="newSeatLimit"
                type="number"
                value={newSeatLimit}
                onChange={(e) => setNewSeatLimit(e.target.value)}
                placeholder="Enter new seat limit"
                min={selectedOrgData?.seat_used || 0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: {selectedOrgData?.seat_used || 0} (current usage)
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={updateSeatLimit} className="flex-1">
                Update Seats
              </Button>
              <Button variant="outline" onClick={() => setIsEditSeatsDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditOrgDialogOpen} onOpenChange={setIsEditOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editOrgName">Organization Name</Label>
              <Input
                id="editOrgName"
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <Label htmlFor="editOrgDomain">Domain (Optional)</Label>
              <Input
                id="editOrgDomain"
                value={editOrgDomain}
                onChange={(e) => setEditOrgDomain(e.target.value)}
                placeholder="company.com"
              />
            </div>
            <div>
              <Label>Default Member Access Level</Label>
              <Select value={editOrgAccessLevel} onValueChange={setEditOrgAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User Access</SelectItem>
                  <SelectItem value="pro">Pro Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={updateOrganization} className="flex-1">
                Update Organization
              </Button>
              <Button variant="outline" onClick={() => setIsEditOrgDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Users Dialog */}
      <Dialog open={isAddUsersDialogOpen} onOpenChange={setIsAddUsersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Available Users</DialogTitle>
            <DialogDescription>
              Add existing users to this organization. User role changes will be handled in the User Management section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={userFilterType} onValueChange={(value: any) => setUserFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="personal">Personal Accounts</SelectItem>
                  <SelectItem value="other-orgs">Other Organizations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <div className="p-2 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Available Users ({getFilteredUsers().length})</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedUsers.length} selected
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-1">
                {getFilteredUsers().map((user) => {
                  const isSelected = selectedUsers.includes(user.user_id);
                  const isCurrentOrg = user.organization_id === selectedOrg;
                  
                  return (
                    <div
                      key={user.user_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border-primary' : 
                        isCurrentOrg ? 'bg-muted cursor-not-allowed opacity-50' :
                        'hover:bg-muted border-transparent'
                      }`}
                      onClick={() => {
                        if (isCurrentOrg) return;
                        
                        if (isSelected) {
                          setSelectedUsers(prev => prev.filter(id => id !== user.user_id));
                        } else {
                          setSelectedUsers(prev => [...prev, user.user_id]);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                          }`}>
                            {isSelected && <UserCheck className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{user.display_name || 'Unknown'}</h4>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.is_pro ? 'default' : 'secondary'}>
                            {user.role_enum || 'user'}
                          </Badge>
                          {user.organization_name && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{user.organization_name}</p>
                              {user.current_org_role && (
                                <Badge variant="outline" className="text-xs">
                                  {user.current_org_role}
                                </Badge>
                              )}
                            </div>
                          )}
                          {isCurrentOrg && (
                            <span className="text-xs text-muted-foreground">Already member</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedUsers.length > 0 && (
                  <>
                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                    {selectedUsers.some(id => getFilteredUsers().find(u => u.user_id === id && u.organization_id)) && (
                      <span className="ml-2 text-warning">⚠️ Some users will be transferred from other organizations</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddUsersDialogOpen(false);
                    setSelectedUsers([]);
                    setUserSearchQuery('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addUsersToOrganization}
                  disabled={selectedUsers.length === 0}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <Dialog open={isDeleteOrgDialogOpen} onOpenChange={setIsDeleteOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the organization and:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg">
              <ul className="text-sm space-y-1">
                <li>• Remove all members from the organization</li>
                <li>• Convert all members to Personal accounts (Free plan)</li>
                <li>• Reset all user AI quotas to free tier limits</li>
                <li>• Delete all organization data and settings</li>
              </ul>
            </div>
            {orgToDelete && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">
                  Organization: {organizations.find(o => o.id === orgToDelete)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {organizations.find(o => o.id === orgToDelete)?.seat_used} members will be affected
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={deleteOrganization}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteOrgDialogOpen(false);
                  setOrgToDelete(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Organizations List - Enhanced Interactive Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Organizations
              <Badge variant="secondary" className="text-xs">
                {organizations.length} Total
              </Badge>
            </CardTitle>
            <CardDescription>Click on an organization to manage or use the action buttons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.map((org) => {
              const seatUtilization = getSeatUtilization(org);
              const creditsRemaining = org.ai_credits_pool - org.ai_credits_used;
              
              return (
                <Card
                  key={org.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedOrg === org.id
                      ? 'ring-2 ring-primary ring-offset-2 bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedOrg(org.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header with Organization Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{org.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {org.domain || 'No domain set'}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {org.subscription_plan} Plan
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Quick Action Buttons */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditOrgDialog(org);
                            }}
                            title="Edit Organization Details"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteOrgDialog(org);
                            }}
                            title="Delete Organization"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Seat Utilization */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Seats</span>
                            <span className="text-sm text-muted-foreground">
                              {org.seat_used}/{org.seat_limit}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${seatUtilization.colorClass}`}
                              style={{ width: `${Math.min(seatUtilization.percentage, 100)}%` }}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSeatsDialog(org);
                            }}
                          >
                            Edit Seat Limit
                          </Button>
                        </div>

                        {/* Credits */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              <span className="text-sm font-medium">Credits</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {creditsRemaining.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Used: {org.ai_credits_used} / Pool: {org.ai_credits_pool}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrg(org.id);
                              setIsBulkCreditDialogOpen(true);
                            }}
                          >
                            Add Credits
                          </Button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrg(org.id);
                            setIsAddUsersDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add Users
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrg(org.id);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                      
                      {selectedOrg === org.id && (
                        <div className="text-xs text-primary font-medium">
                          ← Selected for management
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {organizations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No organizations found</p>
                <p className="text-sm">Create your first organization to get started</p>
              </div>
            )}
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
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsAddUsersDialogOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Available Users
                    </Button>
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
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        <div>
                          <h4 className="font-medium">{member.profiles?.display_name || 'Unknown'}</h4>
                          <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                          <p className="text-xs text-muted-foreground">
                            To edit user roles and details, go to User Management tab
                            <ArrowRight className="inline h-3 w-3 ml-1" />
                          </p>
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