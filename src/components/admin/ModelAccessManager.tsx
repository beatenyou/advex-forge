import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bot, Users, Shield, Zap, Plus, Edit2, Trash2, Calendar, Clock, Activity, TrendingUp, UserPlus, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: string;
}

interface AIProvider {
  id: string;
  name: string;
  type: string;
  model_name: string;
  is_active: boolean;
}

interface UserModelAccess {
  id: string;
  user_id: string;
  provider_id: string;
  is_enabled: boolean;
  granted_at: string;
  granted_by: string | null;
  provider?: AIProvider;
  user?: Profile;
}

interface ModelUsageStats {
  provider_id: string;
  provider_name: string;
  total_interactions: number;
  success_rate: number;
  avg_response_time: number;
  last_used: string;
}

export default function ModelAccessManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [userAccess, setUserAccess] = useState<UserModelAccess[]>([]);
  const [usageStats, setUsageStats] = useState<ModelUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [accessTemplateDialog, setAccessTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateModels, setTemplateModels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfiles(),
        fetchProviders(),
        fetchUserAccess(),
        fetchUsageStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('display_name');
    
    if (error) throw error;
    setProfiles(data || []);
  };

  const fetchProviders = async () => {
    const { data, error } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    setProviders(data || []);
  };

  const fetchUserAccess = async () => {
    // Fetch user access records with manual joins for better reliability
    const { data: accessData, error: accessError } = await supabase
      .from('user_model_access')
      .select('*')
      .order('granted_at', { ascending: false });
    
    if (accessError) throw accessError;
    
    // Fetch providers separately
    const { data: providersData, error: providersError } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true);
    
    if (providersError) throw providersError;
    
    // Fetch profiles separately
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;
    
    // Create lookup maps
    const providerMap = new Map(providersData?.map(p => [p.id, p]) || []);
    const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
    
    // Manually join the data
    const access = accessData
      ?.filter(item => providerMap.has(item.provider_id)) // Only include active providers
      ?.map(item => ({
        ...item,
        provider: providerMap.get(item.provider_id),
        user: profileMap.get(item.user_id)
      }))
      ?.filter(item => item.provider && item.user) || []; // Only include records with valid joins
    
    console.log('Fetched user access:', access.length, 'records');
    setUserAccess(access);
  };

  const fetchUsageStats = async () => {
    const { data, error } = await supabase
      .from('ai_interactions')
      .select(`
        provider_name,
        success,
        response_time_ms,
        created_at
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    // Process stats by provider
    const statsMap = new Map<string, any>();
    
    data?.forEach(interaction => {
      const provider = interaction.provider_name || 'Unknown';
      if (!statsMap.has(provider)) {
        statsMap.set(provider, {
          provider_name: provider,
          total_interactions: 0,
          successful_interactions: 0,
          total_response_time: 0,
          last_used: interaction.created_at
        });
      }
      
      const stats = statsMap.get(provider);
      stats.total_interactions++;
      if (interaction.success) stats.successful_interactions++;
      if (interaction.response_time_ms) stats.total_response_time += interaction.response_time_ms;
      if (new Date(interaction.created_at) > new Date(stats.last_used)) {
        stats.last_used = interaction.created_at;
      }
    });
    
    const processedStats = Array.from(statsMap.values()).map(stats => ({
      provider_id: '',
      provider_name: stats.provider_name,
      total_interactions: stats.total_interactions,
      success_rate: stats.total_interactions > 0 ? (stats.successful_interactions / stats.total_interactions) * 100 : 0,
      avg_response_time: stats.total_interactions > 0 ? stats.total_response_time / stats.total_interactions : 0,
      last_used: stats.last_used
    }));
    
    setUsageStats(processedStats);
  };

  const grantModelAccess = async (userId: string, providerId: string, usageLimit?: number, expiresAt?: string) => {
    try {
      const { error } = await supabase
        .from('user_model_access')
        .upsert({
          user_id: userId,
          provider_id: providerId,
          granted_by: user?.id,
          is_enabled: true,
          usage_limit: usageLimit || null,
          expires_at: expiresAt || null,
          granted_at: new Date().toISOString()
        }, { onConflict: 'user_id,provider_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Model access granted successfully",
      });

      fetchUserAccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to grant model access",
        variant: "destructive",
      });
    }
  };

  const revokeModelAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('user_model_access')
        .update({ is_enabled: false })
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Model access revoked successfully",
      });

      fetchUserAccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke model access",
        variant: "destructive",
      });
    }
  };

  const handleBulkGrant = async () => {
    if (selectedUsers.length === 0 || selectedModels.length === 0) {
      toast({
        title: "Error",
        description: "Please select users and models",
        variant: "destructive",
      });
      return;
    }

    try {
      const accessRecords = [];
      for (const userId of selectedUsers) {
        for (const providerId of selectedModels) {
          accessRecords.push({
            user_id: userId,
            provider_id: providerId,
            granted_by: user?.id,
            is_enabled: true
          });
        }
      }

      const { error } = await supabase
        .from('user_model_access')
        .upsert(accessRecords, { onConflict: 'user_id,provider_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Granted access to ${selectedModels.length} models for ${selectedUsers.length} users`,
      });

      setBulkActionDialog(false);
      setSelectedUsers([]);
      setSelectedModels([]);
      fetchUserAccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to grant bulk access",
        variant: "destructive",
      });
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = !searchTerm || 
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.display_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getUserModelAccess = (userId: string) => {
    return userAccess.filter(access => access.user_id === userId && access.is_enabled);
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Model Access Management</h2>
          <p className="text-muted-foreground">Manage user access to AI models and view usage analytics</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Bulk Grant Access
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Grant Model Access</DialogTitle>
                <DialogDescription>
                  Select users and models to grant access in bulk
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Select Users</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {profiles.map(profile => (
                      <div key={profile.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`user-${profile.id}`}
                          checked={selectedUsers.includes(profile.user_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, profile.user_id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== profile.user_id));
                            }
                          }}
                        />
                        <label htmlFor={`user-${profile.id}`} className="text-sm">
                          {profile.display_name || profile.email} ({profile.role})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-base font-medium">Select Models</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {providers.map(provider => (
                      <div key={provider.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`model-${provider.id}`}
                          checked={selectedModels.includes(provider.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedModels([...selectedModels, provider.id]);
                            } else {
                              setSelectedModels(selectedModels.filter(id => id !== provider.id));
                            }
                          }}
                        />
                        <label htmlFor={`model-${provider.id}`} className="text-sm">
                          {provider.name} ({provider.model_name})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkGrant}>
                    Grant Access ({selectedUsers.length} users, {selectedModels.length} models)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="user-access" className="space-y-4">
        <TabsList>
          <TabsTrigger value="user-access">User Access</TabsTrigger>
          <TabsTrigger value="model-analytics">Model Analytics</TabsTrigger>
          <TabsTrigger value="access-history">Access History</TabsTrigger>
        </TabsList>

        <TabsContent value="user-access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Model Access
              </CardTitle>
              <CardDescription>
                Manage which AI models each user can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Available Models</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map(profile => {
                    const userModels = getUserModelAccess(profile.user_id);
                    
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{profile.display_name || 'No name'}</div>
                            <div className="text-sm text-muted-foreground">{profile.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                            {profile.role === 'admin' ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : null}
                            {profile.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {profile.role === 'admin' ? (
                              <Badge variant="default" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                All Models
                              </Badge>
                            ) : userModels.length > 0 ? (
                              userModels.map(access => {
                                const getModelColor = (type: string) => {
                                  switch (type?.toLowerCase()) {
                                    case 'openai': return 'bg-blue-500/10 text-blue-700 border-blue-200';
                                    case 'mistral': return 'bg-orange-500/10 text-orange-700 border-orange-200';
                                    default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
                                  }
                                };
                                
                                return (
                                  <Badge 
                                    key={access.id} 
                                    variant="outline" 
                                    className={`text-xs ${getModelColor(access.provider?.type || '')}`}
                                  >
                                    {access.provider?.name}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-sm text-muted-foreground">No models assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Settings className="h-3 w-3 mr-1" />
                                Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Manage Model Access</DialogTitle>
                                <DialogDescription>
                                  Grant or revoke AI model access for {profile.display_name || profile.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {providers.map(provider => {
                                    const accessRecord = userModels.find(access => 
                                      access.provider_id === provider.id && access.is_enabled
                                    );
                                    const hasAccess = !!accessRecord;
                                    
                                    const getProviderIcon = (type: string) => {
                                      switch (type?.toLowerCase()) {
                                        case 'openai': return Bot;
                                        case 'mistral': return Zap;
                                        default: return Activity;
                                      }
                                    };
                                    
                                    const getProviderVariant = (type: string, hasAccess: boolean) => {
                                      if (!hasAccess) return 'outline';
                                      switch (type?.toLowerCase()) {
                                        case 'openai': return 'default';
                                        case 'mistral': return 'secondary';
                                        default: return 'outline';
                                      }
                                    };
                                    
                                    const ProviderIcon = getProviderIcon(provider.type);
                                    
                                    return (
                                      <Card 
                                        key={provider.id} 
                                        className={`relative transition-all duration-200 hover:shadow-md ${
                                          hasAccess 
                                            ? 'border-primary/20 bg-gradient-to-br from-background to-muted/30' 
                                            : 'border-border hover:border-primary/30'
                                        }`}
                                      >
                                        <CardHeader className="pb-4">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-lg ${
                                                hasAccess 
                                                  ? 'bg-primary/10 text-primary' 
                                                  : 'bg-muted text-muted-foreground'
                                              }`}>
                                                <ProviderIcon className="h-4 w-4" />
                                              </div>
                                              <div>
                                                <CardTitle className="text-base font-semibold">
                                                  {provider.name}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                  {provider.model_name}
                                                </p>
                                              </div>
                                            </div>
                                            <Badge 
                                              variant={getProviderVariant(provider.type, hasAccess)}
                                              className="text-xs font-medium"
                                            >
                                              {hasAccess ? "Active" : "Inactive"}
                                            </Badge>
                                          </div>
                                        </CardHeader>
                                        
                                        <CardContent className="pt-0 space-y-4">
                                          {hasAccess && accessRecord ? (
                                            <>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Current Usage
                                                  </p>
                                                  <p className="text-lg font-bold text-foreground">
                                                    {(accessRecord as any).usage_current || 0}
                                                  </p>
                                                </div>
                                                <div className="space-y-1">
                                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Usage Limit
                                                  </p>
                                                  <p className="text-lg font-bold text-foreground">
                                                    {(accessRecord as any).usage_limit || '∞'}
                                                  </p>
                                                </div>
                                              </div>
                                              
                                              {(accessRecord as any).expires_at && (
                                                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                                                  <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-warning" />
                                                    <div>
                                                      <p className="text-xs font-medium text-warning">Expires</p>
                                                      <p className="text-sm font-semibold text-warning">
                                                        {formatDate((accessRecord as any).expires_at)}
                                                      </p>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>Granted {formatDate(accessRecord.granted_at)}</span>
                                              </div>
                                              
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full hover:bg-destructive hover:text-destructive-foreground border-destructive/20 text-destructive"
                                                onClick={() => revokeModelAccess(accessRecord.id)}
                                              >
                                                <Trash2 className="h-3 w-3 mr-2" />
                                                Revoke Access
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <div className="text-center py-4">
                                                <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                                                  <ProviderIcon className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                  No access granted
                                                </p>
                                              </div>
                                              
                                              <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={() => grantModelAccess(profile.user_id, provider.id)}
                                              >
                                                <Plus className="h-3 w-3 mr-2" />
                                                Grant Access
                                              </Button>
                                            </>
                                          )}
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                                
                                {profile.role === 'admin' && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-4 w-4 text-yellow-600" />
                                      <span className="font-medium text-yellow-800">Admin User</span>
                                    </div>
                                    <p className="text-sm text-yellow-700 mt-1">
                                      Admin users have automatic access to all available AI models regardless of individual grants.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model-analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Models</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{providers.length}</div>
                <p className="text-xs text-muted-foreground">Active AI models</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profiles.length}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Access Grants</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userAccess.filter(a => a.is_enabled).length}</div>
                <p className="text-xs text-muted-foreground">Active model access grants</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Model Usage Statistics
              </CardTitle>
              <CardDescription>
                Performance and usage data for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Interactions</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Response Time</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageStats.map((stats, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{stats.provider_name}</TableCell>
                      <TableCell>{stats.total_interactions}</TableCell>
                      <TableCell>
                        <Badge variant={stats.success_rate >= 95 ? 'default' : stats.success_rate >= 85 ? 'secondary' : 'destructive'}>
                          {stats.success_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{stats.avg_response_time.toFixed(0)}ms</TableCell>
                      <TableCell>{formatDate(stats.last_used)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Access Grant History
              </CardTitle>
              <CardDescription>
                Recent model access grants and revocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAccess.slice(0, 20).map(access => (
                    <TableRow key={access.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{access.user?.display_name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{access.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{access.provider?.name}</div>
                          <div className="text-sm text-muted-foreground">{access.provider?.model_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={access.is_enabled ? 'default' : 'secondary'}>
                          {access.is_enabled ? 'Active' : 'Revoked'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {access.granted_by ? 'Admin' : 'System'}
                      </TableCell>
                      <TableCell>{formatDate(access.granted_at)}</TableCell>
                      <TableCell>
                        {access.is_enabled ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Model Access</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke {access.provider?.name} access for {access.user?.email}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeModelAccess(access.id)}>
                                  Revoke Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => grantModelAccess(access.user_id, access.provider_id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}