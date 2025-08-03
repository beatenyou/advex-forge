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
import { Building2, Users, Settings, Plus, UserPlus } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  subscription_plan: string;
  seat_limit: number;
  seat_used: number;
  is_active: boolean;
  created_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    email: string;
    display_name: string;
  };
}

export function OrganizationManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers(selectedOrg);
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
      console.log('Fetching members for organization:', orgId);
      
      // First, get organization members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }
      
      console.log('Fetched members data:', membersData);
      
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Then get profile data for each member
      const userIds = membersData.map(member => member.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue with placeholder data if profiles fail
      }
      
      // Combine members with profile data
      const membersWithProfiles = membersData.map(member => {
        const profile = profilesData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          profiles: profile || {
            email: `user-${member.user_id.slice(0, 8)}@company.com`,
            display_name: `User ${member.user_id.slice(0, 8)}`
          }
        };
      });
      
      setMembers(membersWithProfiles);
    } catch (error: any) {
      console.error('Failed to fetch organization members:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch organization members: ${error.message}`,
        variant: 'destructive',
      });
      setMembers([]); // Clear members on error
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
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    }
  };

  const inviteUsers = async () => {
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
      const { data, error } = await supabase.rpc('bulk_invite_users', {
        org_id: selectedOrg,
        user_emails: emails,
        default_role: 'member',
      });

      if (error) throw error;

      toast({
        title: 'Invitations Processed',
        description: `Processed ${emails.length} invitations`,
      });

      setIsInviteDialogOpen(false);
      setInviteEmails('');
      fetchMembers(selectedOrg);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite users',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

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
          <h2 className="text-2xl font-bold">Organization Management</h2>
          <p className="text-muted-foreground">Manage your organizations and team members</p>
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
                Set up a new organization to manage your team members.
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
              <Button onClick={createOrganization} className="w-full">
                Create Organization
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <h4 className="font-medium">{org.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {org.seat_used}/{org.seat_limit} seats
                    </p>
                  </div>
                  <Badge variant="outline">{org.subscription_plan}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Organization Details */}
        {selectedOrg && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Organization Members</span>
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Users
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Users</DialogTitle>
                      <DialogDescription>
                        Enter email addresses (one per line) to invite users to the organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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
                      <Button onClick={inviteUsers} className="w-full">
                        Send Invitations
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}