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
import { Trash2, UserPlus, Shield, User, Gift, Zap, Edit2, Lock, Unlock, Calendar, CreditCard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
  updated_at: string;
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

interface BillingPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  ai_quota_monthly: number;
  features: any;
}

export function UserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userBilling, setUserBilling] = useState<Record<string, UserBilling>>({});
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserOrgId, setNewUserOrgId] = useState<string>('');
  const [newUserOrgRole, setNewUserOrgRole] = useState<string>('member');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [interactionsToGrant, setInteractionsToGrant] = useState<string>('100');
  const [newQuotaLimit, setNewQuotaLimit] = useState<string>('');
  const [newCurrentUsage, setNewCurrentUsage] = useState<string>('');
  const [lockDate, setLockDate] = useState<string>('');
  const [lockReason, setLockReason] = useState<string>('');
  const [isGranting, setIsGranting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchProfiles();
    fetchUserBilling();
    fetchBillingPlans();
    fetchOrganizations();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      
      // Get all plans to lookup names
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

  const fetchBillingPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setBillingPlans(data || []);
    } catch (error) {
      console.error('Error fetching billing plans:', error);
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
      // Call the admin-create-user edge function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          organization_id: newUserOrgId || null,
          organization_role: newUserOrgRole
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `User ${newUserEmail} created successfully`,
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      setNewUserOrgId('');
      setNewUserOrgRole('member');
      fetchProfiles();
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

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Prevent users from changing their own role
    if (userId === user?.id) {
      toast({
        title: "Error",
        description: "You cannot change your own role",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    // Prevent users from deleting their own account
    if (userId === user?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      toast({
        title: "Success",
        description: `User ${email} deleted successfully`,
      });

      fetchProfiles();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openGrantDialog = (userId: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setGrantDialogOpen(true);
  };

  const openEditDialog = (userId: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    const billing = userBilling[userId];
    setNewQuotaLimit(billing?.ai_quota_limit?.toString() || '20');
    setNewCurrentUsage(billing?.ai_usage_current?.toString() || '0');
    setEditDialogOpen(true);
  };

  const openLockDialog = (userId: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setLockDate('');
    setLockReason('');
    setLockDialogOpen(true);
  };

  const openPlanDialog = (userId: string, email: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setSelectedPlanId('');
    setPlanDialogOpen(true);
  };

  const handleLockAccount = async () => {
    if (!selectedUserId) return;

    setIsLocking(true);
    try {
      const lockDateValue = lockDate ? new Date(lockDate).toISOString() : null;
      
      const { error } = await supabase
        .from('user_billing')
        .upsert({
          user_id: selectedUserId,
          account_locked: true,
          account_lock_date: lockDateValue,
          account_lock_reason: lockReason || 'Account locked by administrator',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Account locked for ${selectedUserEmail}`,
      });

      setLockDialogOpen(false);
      fetchUserBilling();
    } catch (error: any) {
      console.error('Error locking account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to lock account",
        variant: "destructive",
      });
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAccount = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('user_billing')
        .upsert({
          user_id: userId,
          account_locked: false,
          account_lock_date: null,
          account_lock_reason: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Account unlocked for ${email}`,
      });

      fetchUserBilling();
    } catch (error: any) {
      console.error('Error unlocking account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlock account",
        variant: "destructive",
      });
    }
  };

  const handleGrantInteractions = async () => {
    if (!selectedUserId || !user) return;

    setIsGranting(true);
    try {
      const { data, error } = await supabase.rpc('admin_add_ai_interactions', {
        target_user_id: selectedUserId,
        additional_interactions: parseInt(interactionsToGrant),
        admin_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Granted ${interactionsToGrant} AI interactions to ${selectedUserEmail}`,
      });

      setGrantDialogOpen(false);
      fetchUserBilling(); // Refresh billing data
    } catch (error: any) {
      console.error('Error granting interactions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant AI interactions",
        variant: "destructive",
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleEditUsage = async () => {
    if (!selectedUserId || !user) return;

    setIsEditing(true);
    try {
      const { data, error } = await supabase.rpc('admin_edit_ai_usage', {
        target_user_id: selectedUserId,
        admin_user_id: user.id,
        new_quota_limit: parseInt(newQuotaLimit) || null,
        new_current_usage: parseInt(newCurrentUsage) || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated AI usage for ${selectedUserEmail}`,
      });

      setEditDialogOpen(false);
      fetchUserBilling(); // Refresh billing data
    } catch (error: any) {
      console.error('Error editing usage:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to edit AI usage",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedUserId || !selectedPlanId || !user) return;

    setIsAssigningPlan(true);
    try {
      const selectedPlan = billingPlans.find(plan => plan.id === selectedPlanId);
      if (!selectedPlan) throw new Error('Plan not found');

      // Get current plan info for audit trail
      const currentBilling = userBilling[selectedUserId];
      const currentPlanId = currentBilling ? 
        billingPlans.find(p => p.name === currentBilling.plan_name)?.id : null;
      const currentPlanName = currentBilling?.plan_name || 'Free';

      // Update user billing with new plan
      const { error } = await supabase
        .from('user_billing')
        .upsert({
          user_id: selectedUserId,
          plan_id: selectedPlanId,
          ai_quota_limit: selectedPlan.ai_quota_monthly,
          subscription_status: selectedPlan.name.toLowerCase() === 'free' ? 'free' : 'active',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Log the plan change to audit trail
      const auditAction = currentPlanId ? 'changed' : 'assigned';
      const { error: auditError } = await supabase
        .from('user_plan_audit')
        .insert({
          user_id: selectedUserId,
          admin_user_id: user.id,
          old_plan_id: currentPlanId,
          new_plan_id: selectedPlanId,
          action_type: auditAction,
          old_plan_name: currentPlanName,
          new_plan_name: selectedPlan.name,
          notes: `Plan ${auditAction} by admin via User Manager`
        });

      if (auditError) {
        console.error('Failed to log audit entry:', auditError);
        // Don't fail the main operation if audit logging fails
      }

      toast({
        title: "Success",
        description: `Assigned ${selectedPlan.name} plan to ${selectedUserEmail}`,
      });

      setPlanDialogOpen(false);
      fetchUserBilling();
    } catch (error: any) {
      console.error('Error assigning plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign plan",
        variant: "destructive",
      });
    } finally {
      setIsAssigningPlan(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>
            Create a new user account and assign their role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label htmlFor="role">System Role</Label>
              <Select value={newUserRole} onValueChange={(value: 'user' | 'admin') => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
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
            <div className="flex items-end">
              <Button 
                onClick={handleAddUser} 
                disabled={isAddingUser}
                className="w-full"
              >
                {isAddingUser ? 'Creating...' : 'Add User'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({profiles.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>AI Usage</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {profile.role === 'admin' ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      {profile.display_name || 'No name'}
                    </div>
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    <Select
                      value={profile.role}
                      onValueChange={(value) => handleRoleChange(profile.user_id, value)}
                      disabled={profile.user_id === user?.id}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {userBilling[profile.user_id] ? (
                      <div className="text-sm">
                        <div className="font-medium">
                          {userBilling[profile.user_id].ai_usage_current} / {userBilling[profile.user_id].ai_quota_limit}
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {userBilling[profile.user_id].plan_name || userBilling[profile.user_id].subscription_status}
                          </Badge>
                          {userBilling[profile.user_id].account_locked && (
                            <Badge variant="destructive" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No data</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                   <TableCell>
                     <TooltipProvider>
                       <div className="flex gap-2">
                         {/* Edit AI Usage Button */}
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => openEditDialog(profile.user_id, profile.email)}
                               className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 hover:scale-105 transition-all duration-200"
                             >
                               <Edit2 className="h-4 w-4" />
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Edit AI usage quotas and limits</p>
                           </TooltipContent>
                         </Tooltip>
                         
                          {/* Grant AI Interactions Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openGrantDialog(profile.user_id, profile.email)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200 hover:scale-105 transition-all duration-200"
                              >
                                <Gift className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Grant additional AI interactions</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Assign Plan Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPlanDialog(profile.user_id, profile.email)}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 hover:border-purple-200 hover:scale-105 transition-all duration-200"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Assign subscription plan</p>
                            </TooltipContent>
                          </Tooltip>

                         {/* Lock/Unlock Account Button */}
                         {userBilling[profile.user_id]?.account_locked ? (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleUnlockAccount(profile.user_id, profile.email)}
                                 className="text-green-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200 hover:scale-105 transition-all duration-200"
                                 disabled={profile.user_id === user?.id}
                               >
                                 <Unlock className="h-4 w-4" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Unlock user account</p>
                             </TooltipContent>
                           </Tooltip>
                         ) : (
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => openLockDialog(profile.user_id, profile.email)}
                                 className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-200 hover:scale-105 transition-all duration-200"
                                 disabled={profile.user_id === user?.id}
                               >
                                 <Lock className="h-4 w-4" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Lock user account</p>
                             </TooltipContent>
                           </Tooltip>
                         )}
                         
                         {/* Delete Button */}
                         <AlertDialog>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <AlertDialogTrigger asChild>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   disabled={profile.user_id === user?.id}
                                   className="text-destructive hover:text-destructive hover:bg-red-50 hover:border-red-200 hover:scale-105 transition-all duration-200"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </AlertDialogTrigger>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Delete user permanently</p>
                             </TooltipContent>
                           </Tooltip>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Delete User</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Are you sure you want to delete {profile.email}? This action cannot be undone.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                 onClick={() => handleDeleteUser(profile.user_id, profile.email)}
                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                               >
                                 Delete
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       </div>
                     </TooltipProvider>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grant AI Interactions Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Grant AI Interactions
            </DialogTitle>
            <DialogDescription>
              Add additional AI interactions to {selectedUserEmail}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="interactions">Number of interactions to grant</Label>
              <Select value={interactionsToGrant} onValueChange={setInteractionsToGrant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 interactions</SelectItem>
                  <SelectItem value="250">250 interactions</SelectItem>
                  <SelectItem value="500">500 interactions</SelectItem>
                  <SelectItem value="1000">1000 interactions</SelectItem>
                  <SelectItem value="2500">2500 interactions</SelectItem>
                  <SelectItem value="5000">5000 interactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGrantInteractions} disabled={isGranting}>
                {isGranting ? 'Granting...' : 'Grant Interactions'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit AI Usage Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit AI Usage
            </DialogTitle>
            <DialogDescription>
              Manually edit AI usage and quota for {selectedUserEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quota-limit">Monthly Quota Limit</Label>
              <Input
                id="quota-limit"
                type="number"
                min="0"
                value={newQuotaLimit}
                onChange={(e) => setNewQuotaLimit(e.target.value)}
                placeholder="e.g., 500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set the maximum AI interactions allowed per month
              </p>
            </div>
            <div>
              <Label htmlFor="current-usage">Current Usage</Label>
              <Input
                id="current-usage"
                type="number"
                min="0"
                value={newCurrentUsage}
                onChange={(e) => setNewCurrentUsage(e.target.value)}
                placeholder="e.g., 47"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set the current AI interactions used this month (useful for resetting or reducing usage)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUsage} disabled={isEditing}>
                {isEditing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lock Account Dialog */}
      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Lock Account
            </DialogTitle>
            <DialogDescription>
              Lock {selectedUserEmail}'s account and optionally set an automatic lock date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lock-reason">Lock Reason</Label>
              <Input
                id="lock-reason"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="e.g., Policy violation, security concern..."
              />
            </div>
            <div>
              <Label htmlFor="lock-date">Lock Date (Optional)</Label>
              <Input
                id="lock-date"
                type="datetime-local"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to lock immediately, or set a future date for automatic locking
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLockDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLockAccount} disabled={isLocking} variant="destructive">
                {isLocking ? 'Locking...' : 'Lock Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Assign Subscription Plan
            </DialogTitle>
            <DialogDescription>
              Select a subscription plan for {selectedUserEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              {billingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPlanId === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <Badge variant={plan.name === 'Free' ? 'secondary' : plan.name === 'Pro' ? 'default' : 'destructive'}>
                          {plan.ai_quota_monthly} AI interactions/month
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                      {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {plan.features.map((feature: string, index: number) => (
                            <li key={index}>• {feature}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${plan.price_monthly}/month
                      </div>
                      {plan.price_yearly > 0 && (
                        <div className="text-xs text-muted-foreground">
                          ${plan.price_yearly}/year
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignPlan} disabled={isAssigningPlan || !selectedPlanId}>
                {isAssigningPlan ? 'Assigning...' : 'Assign Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}