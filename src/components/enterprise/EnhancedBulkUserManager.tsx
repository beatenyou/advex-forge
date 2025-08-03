import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Users, CheckCircle, XCircle, Zap, CreditCard, UserPlus } from 'lucide-react';

interface BulkResult {
  email: string;
  status: string;
  message: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  default_member_access_level: string;
  ai_credits_pool: number;
  ai_credits_used: number;
}

export function EnhancedBulkUserManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [emailList, setEmailList] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('user');
  const [creditAllocation, setCreditAllocation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [bulkCreditAmount, setBulkCreditAmount] = useState('');
  const [bulkCreditEmails, setBulkCreditEmails] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, default_member_access_level, ai_credits_pool, ai_credits_used')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations',
        variant: 'destructive',
      });
    }
  };

  const processEmails = (emailText: string) => {
    const emails = emailText
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    return emails;
  };

  const validateEmails = (emailText: string) => {
    const emails = processEmails(emailText);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const invalid = emails.filter(email => !emailRegex.test(email));
    
    if (invalid.length > 0) {
      toast({
        title: 'Invalid Emails',
        description: `Please fix these email addresses: ${invalid.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const bulkInviteUsers = async () => {
    if (!selectedOrganization) {
      toast({
        title: 'Error',
        description: 'Please select an organization',
        variant: 'destructive',
      });
      return;
    }

    if (!validateEmails(emailList)) return;
    
    const emails = processEmails(emailList);
    
    if (emails.length === 0) {
      toast({
        title: 'No Emails',
        description: 'Please enter at least one email address',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      const { data, error } = await supabase.rpc('enhanced_bulk_invite_users', {
        org_id: selectedOrganization,
        user_emails: emails,
        default_role: selectedRole,
        access_level: selectedAccessLevel,
      });

      if (error) throw error;

      setResults(data || []);

      const successCount = data?.filter((r: any) => r.status === 'added' || r.status === 'invited').length || 0;
      const errorCount = data?.filter((r: any) => r.status === 'error').length || 0;

      toast({
        title: 'Bulk Operation Complete',
        description: `${successCount} successful, ${errorCount} failed invitations`,
      });

      // If credit allocation is specified, allocate credits to successfully added users
      if (creditAllocation && successCount > 0) {
        await allocateCreditsToNewUsers(emails, parseInt(creditAllocation));
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process bulk invitations',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const allocateCreditsToNewUsers = async (emails: string[], creditAmount: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get user IDs for the emails
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('email', emails);

      if (usersError) throw usersError;

      // Allocate credits to each user
      for (const user of users || []) {
        try {
          await supabase.rpc('allocate_organization_credits', {
            org_id: selectedOrganization,
            target_user_id: user.user_id,
            credit_amount: creditAmount,
            admin_user_id: userData.user?.id
          });
        } catch (error) {
          console.error(`Failed to allocate credits to ${user.email}:`, error);
        }
      }

      toast({
        title: 'Credits Allocated',
        description: `Allocated ${creditAmount} credits to ${users?.length || 0} users`,
      });
    } catch (error: any) {
      console.error('Error allocating credits:', error);
    }
  };

  const bulkAllocateCredits = async () => {
    if (!selectedOrganization || !bulkCreditAmount || !bulkCreditEmails) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (!validateEmails(bulkCreditEmails)) return;

    const emails = processEmails(bulkCreditEmails);
    const creditAmount = parseInt(bulkCreditAmount);

    setIsProcessing(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get user IDs for the emails
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('email', emails);

      if (usersError) throw usersError;

      let successCount = 0;
      let errorCount = 0;
      const creditResults: BulkResult[] = [];

      // Allocate credits to each user
      for (const user of users || []) {
        try {
          const { error } = await supabase.rpc('allocate_organization_credits', {
            org_id: selectedOrganization,
            target_user_id: user.user_id,
            credit_amount: creditAmount,
            admin_user_id: userData.user?.id
          });

          if (error) throw error;

          creditResults.push({
            email: user.email,
            status: 'success',
            message: `Allocated ${creditAmount} credits`
          });
          successCount++;
        } catch (error: any) {
          creditResults.push({
            email: user.email,
            status: 'error',
            message: error.message || 'Failed to allocate credits'
          });
          errorCount++;
        }
      }

      setResults(creditResults);

      toast({
        title: 'Bulk Credit Allocation Complete',
        description: `${successCount} successful, ${errorCount} failed allocations`,
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process bulk credit allocation',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportTemplate = () => {
    const template = `# Bulk User Import Template
# One email address per line
# Lines starting with # are ignored
user1@company.com
user2@company.com
user3@company.com`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-user-template.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'Use this template to format your email list',
    });
  };

  const getStatusIcon = (status: string) => {
    return status === 'success' || status === 'added' || status === 'invited' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success' || status === 'added') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
    } else if (status === 'invited') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Invited</Badge>;
    } else {
      return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const selectedOrgData = organizations.find(org => org.id === selectedOrganization);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Enhanced Bulk User Management</h2>
        <p className="text-muted-foreground">
          Manage users at scale with organization-based access levels and credit allocation
        </p>
      </div>

      <Tabs defaultValue="invite" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Bulk Invite
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Credit Allocation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bulk Invite Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bulk User Invitation
                </CardTitle>
                <CardDescription>
                  Invite multiple users with organization-specific access levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Organization</Label>
                  <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} (@{org.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOrgData && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Default access: {selectedOrgData.default_member_access_level} | 
                      Credits available: {selectedOrgData.ai_credits_pool - selectedOrgData.ai_credits_used}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Access Level</Label>
                    <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
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

                <div>
                  <Label>Initial Credits (Optional)</Label>
                  <Input
                    type="number"
                    value={creditAllocation}
                    onChange={(e) => setCreditAllocation(e.target.value)}
                    placeholder="Credits to allocate to each user"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="emailList">Email Addresses</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportTemplate}
                      className="text-xs"
                    >
                      <FileText className="mr-2 h-3 w-3" />
                      Download Template
                    </Button>
                  </div>
                  <Textarea
                    id="emailList"
                    value={emailList}
                    onChange={(e) => setEmailList(e.target.value)}
                    placeholder="Enter email addresses (one per line)&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {processEmails(emailList).length} valid email addresses detected
                  </p>
                </div>

                <Button
                  onClick={bulkInviteUsers}
                  disabled={isProcessing || !emailList.trim() || !selectedOrganization}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Invite Users ({processEmails(emailList).length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operation Results</CardTitle>
                <CardDescription>
                  View the status of your bulk operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="text-sm font-mono">{result.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No bulk operations performed yet</p>
                    <p className="text-sm">Results will appear here after processing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bulk Credit Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Bulk Credit Allocation
                </CardTitle>
                <CardDescription>
                  Allocate organization credits to multiple users at once
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Organization</Label>
                  <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} (@{org.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOrgData && (
                    <div className="mt-2 p-2 bg-secondary rounded-lg">
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>Total Credits:</span>
                          <span className="font-bold">{selectedOrgData.ai_credits_pool}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available:</span>
                          <span className="font-bold text-green-600">
                            {selectedOrgData.ai_credits_pool - selectedOrgData.ai_credits_used}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Credits per User</Label>
                  <Input
                    type="number"
                    value={bulkCreditAmount}
                    onChange={(e) => setBulkCreditAmount(e.target.value)}
                    placeholder="Enter credit amount per user"
                  />
                </div>

                <div>
                  <Label htmlFor="bulkCreditEmails">User Email Addresses</Label>
                  <Textarea
                    id="bulkCreditEmails"
                    value={bulkCreditEmails}
                    onChange={(e) => setBulkCreditEmails(e.target.value)}
                    placeholder="Enter email addresses (one per line)&#10;user1@example.com&#10;user2@example.com"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {processEmails(bulkCreditEmails).length} users × {bulkCreditAmount || 0} credits = {(processEmails(bulkCreditEmails).length * parseInt(bulkCreditAmount || '0'))} total credits needed
                  </p>
                </div>

                <Button
                  onClick={bulkAllocateCredits}
                  disabled={isProcessing || !bulkCreditEmails.trim() || !bulkCreditAmount || !selectedOrganization}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Allocating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Allocate Credits to {processEmails(bulkCreditEmails).length} Users
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Credit Allocation Results */}
            <Card>
              <CardHeader>
                <CardTitle>Credit Allocation Results</CardTitle>
                <CardDescription>
                  Status of bulk credit allocations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <div>
                            <span className="text-sm font-mono">{result.email}</span>
                            <p className="text-xs text-muted-foreground">{result.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No credit allocations performed yet</p>
                    <p className="text-sm">Results will appear here after processing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.length}
                </div>
                <p className="text-sm text-muted-foreground">Total Processed</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.status === 'success' || r.status === 'added' || r.status === 'invited').length}
                </div>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => r.status === 'error').length}
                </div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}