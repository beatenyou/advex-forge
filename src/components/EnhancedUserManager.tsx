import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { User, Building2, Users, Settings, Loader2, Crown, Shield, CreditCard, Zap } from 'lucide-react';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  role_enum: string;
  subscription_status: string;
  is_pro: boolean;
  organization_id?: string;
  organization_name?: string;
  organization_role?: string;
  ai_usage_current: number;
  ai_quota_limit: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  default_member_access_level: string;
}

export function EnhancedUserManager() {
  const { currentOrganization } = useOrganizationContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingMassProvision, setProcessingMassProvision] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [massProvisionDialogOpen, setMassProvisionDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('member');
  const [newAccessLevel, setNewAccessLevel] = useState('user');
  const [interactionsToProvision, setInteractionsToProvision] = useState(150);

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, [organizationFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          display_name,
          role,
          role_enum,
          subscription_status,
          is_pro,
          organization_id,
          ai_usage_current:user_billing(ai_usage_current),
          ai_quota_limit:user_billing(ai_quota_limit),
          organization:organizations(name),
          organization_membership:organization_members(role)
        `);

      if (organizationFilter !== 'all') {
        if (organizationFilter === 'none') {
          query = query.is('organization_id', null);
        } else {
          query = query.eq('organization_id', organizationFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const processedUsers = data?.map(user => ({
        ...user,
        organization_name: user.organization?.name || null,
        organization_role: Array.isArray(user.organization_membership) ? user.organization_membership[0]?.role : null,
        ai_usage_current: Array.isArray(user.ai_usage_current) ? user.ai_usage_current[0]?.ai_usage_current || 0 : 0,
        ai_quota_limit: Array.isArray(user.ai_quota_limit) ? user.ai_quota_limit[0]?.ai_quota_limit || 50 : 50,
      })) || [];

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, default_member_access_level')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to fetch organizations');
    }
  };

  const assignUserToOrganization = async (userId: string, orgId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: orgId,
          user_id: userId,
          role: role,
          invited_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      
      toast.success('User assigned to organization successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Failed to assign user to organization');
    }
  };

  const bulkAssignUsers = async () => {
    if (!selectedOrganization || selectedUsers.length === 0) {
      toast.error('Please select an organization and at least one user');
      return;
    }

    try {
      const assignments = selectedUsers.map(userId => ({
        organization_id: selectedOrganization,
        user_id: userId,
        role: newRole,
        invited_by: null // Will be set by trigger
      }));

      const { error } = await supabase
        .from('organization_members')
        .upsert(assignments);

      if (error) throw error;

      toast.success(`${selectedUsers.length} users assigned to organization`);
      setSelectedUsers([]);
      setBulkAssignDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error bulk assigning users:', error);
      toast.error('Failed to bulk assign users');
    }
  };

  const massProvisionOrganization = async () => {
    if (!selectedOrganization) {
      toast.error('Please select an organization');
      return;
    }

    setProcessingMassProvision(true);
    try {
      const { data, error } = await supabase.rpc('mass_provision_org_members', {
        org_id: selectedOrganization,
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        interactions_per_member: interactionsToProvision
      });

      if (error) throw error;

      const results = data || [];
      const successCount = results.filter((r: any) => r.status === 'success').length;
      const errorCount = results.filter((r: any) => r.status === 'error').length;

      if (errorCount > 0) {
        toast.error(`Provisioned ${successCount} users, ${errorCount} failed`);
      } else {
        toast.success(`Successfully provisioned ${successCount} users with ${interactionsToProvision} interactions each`);
      }

      setMassProvisionDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error mass provisioning:', error);
      toast.error('Failed to mass provision users');
    } finally {
      setProcessingMassProvision(false);
    }
  };

  const getOrganizationRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'pro': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enhanced User Management
          </CardTitle>
          <CardDescription>
            Manage users, assign organizations, and control access levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="none">No Organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={fetchUsers} variant="outline" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Dialog open={massProvisionDialogOpen} onOpenChange={setMassProvisionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Mass Provision
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mass Provision Organization</DialogTitle>
                    <DialogDescription>
                      Provision all members of an organization with pro access and AI interactions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Organization</Label>
                      <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
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
                      <Label>Interactions per Member</Label>
                      <Input
                        type="number"
                        value={interactionsToProvision}
                        onChange={(e) => setInteractionsToProvision(parseInt(e.target.value) || 150)}
                        placeholder="150"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        Each member will receive this many AI interactions
                      </div>
                    </div>

                    <Button 
                      onClick={massProvisionOrganization} 
                      className="w-full"
                      disabled={!selectedOrganization || processingMassProvision}
                    >
                      {processingMassProvision ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Provisioning...
                        </>
                      ) : (
                        'Provision All Members'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={selectedUsers.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Bulk Assign ({selectedUsers.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Assign to Organization</DialogTitle>
                    <DialogDescription>
                      Assign {selectedUsers.length} selected users to an organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Organization</Label>
                      <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
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
                      <Label>Role</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={bulkAssignUsers} className="w-full">
                      Assign Users
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers(users.map(u => u.user_id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Org Role</TableHead>
                  <TableHead>AI Usage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.user_id)}
                        onCheckedChange={() => toggleUserSelection(user.user_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={getRoleBadgeVariant(user.role_enum)}>
                          {user.role_enum}
                        </Badge>
                        {user.is_pro && (
                          <Badge variant="outline">Pro</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.organization_name ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {user.organization_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No organization</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.organization_role ? (
                        <div className="flex items-center gap-1">
                          {getOrganizationRoleIcon(user.organization_role)}
                          <Badge variant="outline" className="capitalize">
                            {user.organization_role}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.ai_usage_current} / {user.ai_quota_limit}
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${Math.min((user.ai_usage_current / user.ai_quota_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage User: {user.display_name}</DialogTitle>
                            <DialogDescription>
                              Assign organization and manage access levels
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Current Organization</Label>
                              <div className="text-sm text-muted-foreground">
                                {user.organization_name || 'No organization assigned'}
                              </div>
                            </div>
                            
                            <div>
                              <Label>Assign to Organization</Label>
                              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
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
                              <Label>Role in Organization</Label>
                              <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button 
                              onClick={() => {
                                if (selectedOrganization) {
                                  assignUserToOrganization(user.user_id, selectedOrganization, newRole);
                                }
                              }}
                              className="w-full"
                              disabled={!selectedOrganization}
                            >
                              Assign to Organization
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Try adjusting your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}