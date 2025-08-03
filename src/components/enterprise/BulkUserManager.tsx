import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Users, CheckCircle, XCircle } from 'lucide-react';

interface BulkResult {
  email: string;
  status: string;
  message: string;
}

export function BulkUserManager() {
  const [emailList, setEmailList] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const { toast } = useToast();

  const processEmails = () => {
    const emails = emailList
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    return emails;
  };

  const validateEmails = () => {
    const emails = processEmails();
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
    if (!validateEmails()) return;
    
    const emails = processEmails();
    
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
      // For demo purposes, we'll simulate bulk operations
      // In a real enterprise system, you'd need to get the organization ID
      const simulatedResults: BulkResult[] = emails.map(email => ({
        email,
        status: Math.random() > 0.2 ? 'success' : 'error',
        message: Math.random() > 0.2 ? 'User invited successfully' : 'User already exists or invalid email'
      }));

      setResults(simulatedResults);

      const successCount = simulatedResults.filter(r => r.status === 'success').length;
      const errorCount = simulatedResults.filter(r => r.status === 'error').length;

      toast({
        title: 'Bulk Operation Complete',
        description: `${successCount} successful, ${errorCount} failed invitations`,
      });

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
    return status === 'success' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk User Management</h2>
        <p className="text-muted-foreground">
          Invite multiple users at once or perform bulk operations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk User Invitation
            </CardTitle>
            <CardDescription>
              Invite multiple users by entering their email addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {processEmails().length} valid email addresses detected
              </p>
            </div>

            <div>
              <Label>Default Role</Label>
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

            <Button
              onClick={bulkInviteUsers}
              disabled={isProcessing || !emailList.trim()}
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
                  Invite Users ({processEmails().length})
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
                  {results.filter(r => r.status === 'success').length}
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