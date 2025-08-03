import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Shield, User, Gift, Zap, Edit2, Lock, Unlock, Calendar, CreditCard, Building2, Plus, Users, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  organization_id?: string;
}

interface UserBilling {
  ai_usage_current: number;
  ai_quota_limit: number;
  subscription_status: string;
  account_locked: boolean;
  account_lock_date: string | null;
  account_lock_reason: string | null;
  plan_name?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  default_member_access_level: string;
}

interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: string;
  organization: {
    name: string;
  };
}

export function EnhancedUserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userBilling, setUserBilling] = useState<Record<string, UserBilling>>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<Record<string, OrganizationMember>>({});
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserOrgId, setNewUserOrgId] = useState<string>('');
  const [newUserOrgRole, setNewUserOrgRole] = useState<string>('member');
  const [newUserProAccess, setNewUserProAccess] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [assignOrgDialogOpen, setAssignOrgDialogOpen] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [massProvisionDialogOpen, setMassProvisionDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrgRole, setSelectedOrgRole] = useState<string>('member');
  const [interactionsPerMember, setInteractionsPerMember] = useState<string>('150');
  const [isAssigningOrg, setIsAssigningOrg] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [isMassProvisioning, setIsMassProvisioning] = useState(false);
  
  // Edit user dialog state
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserCredits, setEditUserCredits] = useState<string>('');
  const [editUserQuota, setEditUserQuota] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'admin'>('user');
  const [editUserProAccess, setEditUserProAccess] = useState(false);
  
  // Credit management dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditUser, setCreditUser] = useState<UserProfile | null>(null);
  const [newCredits, setNewCredits] = useState<string>('');
  const [newQuota, setNewQuota] = useState<string>('');
  
  // Loading states
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isManagingCredits, setIsManagingCredits] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization, availableOrganizations } = useOrganizationContext();

  // Helper function to check if user is global admin
  const isGlobalAdmin = () => {
    // Add your admin check logic here - check user role or permissions
    return true; // For now, assume admin access in admin dashboard
  };

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
    fetchUserBilling();
    fetchUserOrganizations();
  }, [currentOrganization]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // For admin users, fetch all users. For org users, filter by organization
      let query = supabase.from('profiles').select('*');
      
      // Only filter by organization if not an admin and organization is selected
      if (currentOrganization && !isGlobalAdmin()) {
        query = query.eq('organization_id', currentOrganization.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchUserBilling = async () => {
    try {
      const { data, error } = await supabase
        .from('user_billing')
        .select(`
          user_id, 
          ai_usage_current, 
          ai_quota_limit, 
          subscription_status, 
          account_locked, 
          account_lock_date, 
          account_lock_reason,
          plan_id
        `);

      if (error) throw error;
      
      const { data: plansData } = await supabase
        .from('billing_plans')
        .select('id, name');
      
      const plansMap = new Map(plansData?.map(plan => [plan.id, plan.name]) || []);
      
      const billingMap: Record<string, UserBilling> = {};
      data?.forEach(billing => {
        billingMap[billing.user_id] = {
          ai_usage_current: billing.ai_usage_current,
          ai_quota_limit: billing.ai_quota_limit,
          subscription_status: billing.subscription_status,
          account_locked: billing.account_locked,
          account_lock_date: billing.account_lock_date,
          account_lock_reason: billing.account_lock_reason,
          plan_name: billing.plan_id ? plansMap.get(billing.plan_id) || 'Unknown' : 'Free'
        };
      });
      setUserBilling(billingMap);
    } catch (error) {
      console.error('Error fetching user billing:', error);
    }
  };

  const fetchUserOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          user_id,
          role,
          organization:organizations(name)
        `)
        .eq('is_active', true);

      if (error) throw error;
      
      const orgMap: Record<string, OrganizationMember> = {};
      data?.forEach(member => {
        if (member.organization) {
          orgMap[member.user_id] = {
            organization_id: member.organization_id,
            user_id: member.user_id,
            role: member.role,
            organization: member.organization
          };
        }
      });
      setUserOrganizations(orgMap);
    } catch (error) {
      console.error('Error fetching user organizations:', error);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Error",
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          organization_id: newUserOrgId === 'none' ? null : newUserOrgId,
          organization_role: newUserOrgRole,
          pro_access: newUserProAccess
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: `User ${newUserEmail} created successfully`,
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      setNewUserOrgId('none');
      setNewUserOrgRole('member');
      setNewUserProAccess(false);
      fetchUsers();
      fetchUserOrganizations();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const openAssignOrgDialog = (userId: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setSelectedOrgId('');
    setSelectedOrgRole('member');
    setAssignOrgDialogOpen(true);
  };

  const handleAssignToOrganization = async () => {
    if (!selectedUserId || !selectedOrgId) return;

    setIsAssigningOrg(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: selectedOrgId,
          user_id: selectedUserId,
          role: selectedOrgRole,
          invited_by: user?.id,
          is_active: true
        }, { onConflict: 'organization_id,user_id' });

      if (error) throw error;

      // Update user's organization_id in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: selectedOrgId })
        .eq('user_id', selectedUserId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: `Assigned ${selectedUserEmail} to organization`,
      });

      setAssignOrgDialogOpen(false);
      fetchUsers();
      fetchUserOrganizations();
    } catch (error: any) {
      console.error('Error assigning organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign to organization",
        variant: "destructive",
      });
    } finally {
      setIsAssigningOrg(false);
    }
  };

  const handleBulkAssignUsers = async () => {
    if (selectedUsers.length === 0 || !selectedOrgId) {
      toast({
        title: "Error",
        description: "Please select users and an organization",
        variant: "destructive",
      });
      return;
    }

    setIsBulkAssigning(true);
    try {
      const userEmails = selectedUsers.map(userId => 
        users.find(u => u.user_id === userId)?.email || ''
      ).filter(email => email);

      const { data, error } = await supabase.rpc('enhanced_bulk_invite_users', {
        org_id: selectedOrgId,
        user_emails: userEmails,
        default_role: selectedOrgRole,
        invited_by_user_id: user?.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bulk assigned ${selectedUsers.length} users to organization`,
      });

      setBulkAssignDialogOpen(false);
      setSelectedUsers([]);
      fetchUsers();
      fetchUserOrganizations();
    } catch (error: any) {
      console.error('Error bulk assigning users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to bulk assign users",
        variant: "destructive",
      });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleMassProvisionOrganization = async () => {
    if (!currentOrganization) {
      toast({
        title: "Error",
        description: "Please select an organization first",
        variant: "destructive",
      });
      return;
    }

    setIsMassProvisioning(true);
    try {
      const { data, error } = await supabase.rpc('mass_provision_org_members', {
        org_id: currentOrganization.id,
        admin_user_id: user?.id,
        interactions_per_member: parseInt(interactionsPerMember)
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Mass provisioned members with ${interactionsPerMember} interactions each`,
      });

      setMassProvisionDialogOpen(false);
      fetchUserBilling();
    } catch (error: any) {
      console.error('Error mass provisioning:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mass provision organization",
        variant: "destructive",
      });
    } finally {
      setIsMassProvisioning(false);
    }
  };

  const getOrganizationRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield className="h-3 w-3" />;
      case 'admin': return <CreditCard className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'pro': return 'default';
      default: return 'secondary';
    }
  };

  // Open edit user dialog
  const openEditUserDialog = (profile: UserProfile) => {
    setEditingUser(profile);
    const billing = userBilling[profile.user_id];
    setEditUserCredits(billing?.ai_usage_current?.toString() || '0');
    setEditUserQuota(billing?.ai_quota_limit?.toString() || '50');
    setEditUserRole(profile.role as 'user' | 'admin');
    setEditUserProAccess(profile.role === 'pro' || billing?.plan_name?.toLowerCase().includes('pro') || false);
    setEditUserDialogOpen(true);
  };

  // Open credit management dialog
  const openCreditDialog = (profile: UserProfile) => {
    setCreditUser(profile);
    const billing = userBilling[profile.user_id];
    setNewCredits('0');
    setNewQuota(billing?.ai_quota_limit?.toString() || '50');
    setCreditDialogOpen(true);
  };

  // Edit user profile
  const handleEditUser = async () => {
    if (!editingUser) return;
    
    setIsEditingUser(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: editUserRole,
          is_pro: editUserProAccess,
        })
        .eq('user_id', editingUser.user_id);

      if (profileError) throw profileError;

      // Update billing if credits/quota changed
      const currentBilling = userBilling[editingUser.user_id];
      if (currentBilling && (editUserCredits !== currentBilling.ai_usage_current.toString() || 
                             editUserQuota !== currentBilling.ai_quota_limit.toString())) {
        const { error: billingError } = await supabase
          .from('user_billing')
          .upsert({
            user_id: editingUser.user_id,
            ai_usage_current: parseInt(editUserCredits) || 0,
            ai_quota_limit: parseInt(editUserQuota) || 50,
            subscription_status: editUserProAccess ? 'active' : 'free'
          }, { onConflict: 'user_id' });

        if (billingError) throw billingError;
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditUserDialogOpen(false);
      fetchUsers();
      fetchUserBilling();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsEditingUser(false);
    }
  };

  // Manage credits
  const handleManageCredits = async () => {
    if (!creditUser) return;
    
    setIsManagingCredits(true);
    try {
      const { error } = await supabase
        .from('user_billing')
        .upsert({
          user_id: creditUser.user_id,
          ai_usage_current: parseInt(newCredits) || 0,
          ai_quota_limit: parseInt(newQuota) || 50,
          subscription_status: 'active'
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credits updated successfully",
      });

      setCreditDialogOpen(false);
      fetchUserBilling();
    } catch (error: any) {
      console.error('Error managing credits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update credits",
        variant: "destructive",
      });
    } finally {
      setIsManagingCredits(false);
    }
  };

  // Toggle account lock
  const handleToggleAccountLock = async (userId: string, isLocked: boolean) => {
    setIsTogglingLock(true);
    try {
      const { error } = await supabase
        .from('user_billing')
        .upsert({
          user_id: userId,
          account_locked: !isLocked,
          account_lock_date: !isLocked ? new Date().toISOString() : null,
          account_lock_reason: !isLocked ? 'Admin action' : null
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Account ${!isLocked ? 'locked' : 'unlocked'} successfully`,
      });

      fetchUserBilling();
    } catch (error: any) {
      console.error('Error toggling account lock:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle account lock",
        variant: "destructive",
      });
    } finally {
      setIsTogglingLock(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    try {
      // Remove from organization first
      await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', userId);

      // Delete user billing
      await supabase
        .from('user_billing')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchUsers();
      fetchUserBilling();
      fetchUserOrganizations();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-2">
          <Button 
            onClick={() => setBulkAssignDialogOpen(true)}
            disabled={selectedUsers.length === 0}
            variant="outline"
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Assign ({selectedUsers.length})
          </Button>
          
          {currentOrganization && (
            <Button 
              onClick={() => setMassProvisionDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Zap className="h-4 w-4 mr-2" />
              Mass Provision
            </Button>
          )}
        </div>

        {currentOrganization && (
          <div className="text-sm text-muted-foreground">
            Managing: <span className="font-medium">{currentOrganization.name}</span>
          </div>
        )}
      </div>

      {/* Add User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>
            Create a new user account with organization assignment and pro access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Secure password"
              />
            </div>
            <div>
              <Label htmlFor="role">System Role</Label>
              <Select value={newUserRole} onValueChange={(value: 'user' | 'admin') => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organization">Organization (Optional)</Label>
              <Select value={newUserOrgId} onValueChange={setNewUserOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="none">No organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUserOrgId && newUserOrgId !== 'none' && (
              <div>
                <Label htmlFor="orgRole">Organization Role</Label>
                <Select value={newUserOrgRole} onValueChange={setNewUserOrgRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="proAccess"
                checked={newUserProAccess}
                onChange={(e) => setNewUserProAccess(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="proAccess">Grant Pro Access</Label>
            </div>
          </div>
          <Button onClick={handleAddUser} disabled={isAddingUser}>
            {isAddingUser ? 'Creating...' : 'Create User'}
          </Button>
        </CardContent>
      </Card>

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and organization assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(users.map(u => u.user_id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-border"
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>AI Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((profile) => {
                const billing = userBilling[profile.user_id];
                const orgMembership = userOrganizations[profile.user_id];
                
                return (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(profile.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, profile.user_id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== profile.user_id));
                          }
                        }}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile.display_name || profile.email}</div>
                        <div className="text-sm text-muted-foreground">{profile.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(profile.role)}>
                        {profile.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {orgMembership ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <div className="flex items-center gap-1">
                              {getOrganizationRoleIcon(orgMembership.role)}
                              {orgMembership.role}
                            </div>
                          </Badge>
                          <span className="text-sm">{orgMembership.organization.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Personal
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignOrgDialog(profile.user_id, profile.email)}
                            className="h-6 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {billing ? (
                        <div className="text-sm">
                          <div>{billing.ai_usage_current} / {billing.ai_quota_limit || '∞'}</div>
                          <div className="text-xs text-muted-foreground">{billing.plan_name}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {billing?.account_locked ? (
                        <Badge variant="destructive">Locked</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditUserDialog(profile)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit User</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCreditDialog(profile)}
                                className="h-8 w-8 p-0"
                              >
                                <Gift className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage Credits</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAccountLock(profile.user_id, billing?.account_locked || false)}
                                disabled={isTogglingLock}
                                className="h-8 w-8 p-0"
                              >
                                {billing?.account_locked ? (
                                  <Unlock className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {billing?.account_locked ? 'Unlock Account' : 'Lock Account'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <AlertDialog>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    disabled={profile.user_id === user?.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Delete User</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {profile.email}? This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(profile.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isDeletingUser}
                              >
                                {isDeletingUser ? 'Deleting...' : 'Delete User'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Organization Dialog */}
      <Dialog open={assignOrgDialogOpen} onOpenChange={setAssignOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Organization</DialogTitle>
            <DialogDescription>
              Assign {selectedUserEmail} to an organization with a specific role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignOrg">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignRole">Role</Label>
              <Select value={selectedOrgRole} onValueChange={setSelectedOrgRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAssignOrgDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignToOrganization} disabled={isAssigningOrg}>
              {isAssigningOrg ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign to Organization</DialogTitle>
            <DialogDescription>
              Assign {selectedUsers.length} selected users to an organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulkOrg">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bulkRole">Role</Label>
              <Select value={selectedOrgRole} onValueChange={setSelectedOrgRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setBulkAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssignUsers} disabled={isBulkAssigning}>
              {isBulkAssigning ? 'Assigning...' : `Assign ${selectedUsers.length} Users`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mass Provision Dialog */}
      <Dialog open={massProvisionDialogOpen} onOpenChange={setMassProvisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mass Provision Organization</DialogTitle>
            <DialogDescription>
              Provision all members of {currentOrganization?.name} with AI interactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="interactions">Interactions per Member</Label>
              <Select value={interactionsPerMember} onValueChange={setInteractionsPerMember}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 interactions</SelectItem>
                  <SelectItem value="150">150 interactions</SelectItem>
                  <SelectItem value="250">250 interactions</SelectItem>
                  <SelectItem value="500">500 interactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setMassProvisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMassProvisionOrganization} disabled={isMassProvisioning}>
              {isMassProvisioning ? 'Provisioning...' : 'Mass Provision'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user profile, role, and access settings for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRole">System Role</Label>
              <Select value={editUserRole} onValueChange={(value: 'user' | 'admin') => setEditUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editProAccess"
                checked={editUserProAccess}
                onChange={(e) => setEditUserProAccess(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="editProAccess">Pro Access</Label>
            </div>
            <div>
              <Label htmlFor="editCredits">Current AI Usage</Label>
              <Input
                id="editCredits"
                type="number"
                value={editUserCredits}
                onChange={(e) => setEditUserCredits(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="editQuota">AI Quota Limit</Label>
              <Input
                id="editQuota"
                type="number"
                value={editUserQuota}
                onChange={(e) => setEditUserQuota(e.target.value)}
                placeholder="50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={isEditingUser}>
              {isEditingUser ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Management Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Credits</DialogTitle>
            <DialogDescription>
              Provision or modify AI credits for {creditUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resetCredits">Reset Current Usage To</Label>
              <Input
                id="resetCredits"
                type="number"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 to provision fresh credits
              </p>
            </div>
            <div>
              <Label htmlFor="newQuota">New Quota Limit</Label>
              <Select value={newQuota} onValueChange={setNewQuota}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 interactions</SelectItem>
                  <SelectItem value="100">100 interactions</SelectItem>
                  <SelectItem value="250">250 interactions</SelectItem>
                  <SelectItem value="500">500 interactions</SelectItem>
                  <SelectItem value="1000">1000 interactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManageCredits} disabled={isManagingCredits}>
              {isManagingCredits ? 'Updating...' : 'Update Credits'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}