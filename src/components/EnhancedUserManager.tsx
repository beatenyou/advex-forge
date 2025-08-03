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
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization, availableOrganizations } = useOrganizationContext();

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
    fetchUserBilling();
    fetchUserOrganizations();
  }, [currentOrganization]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by current organization if one is selected
      if (currentOrganization) {
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
          organization_id: newUserOrgId || null,
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
      setNewUserOrgId('');
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

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
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
                  <SelectItem value="">No organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUserOrgId && (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignOrgDialog(profile.user_id, profile.email)}
                          className="h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignOrgDialog(profile.user_id, profile.email)}
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}