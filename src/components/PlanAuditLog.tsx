import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, User, CreditCard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlanAuditEntry {
  id: string;
  user_id: string;
  admin_user_id: string;
  old_plan_id: string | null;
  new_plan_id: string | null;
  action_type: string;
  old_plan_name: string | null;
  new_plan_name: string | null;
  notes: string | null;
  created_at: string;
  admin_email?: string;
  user_email?: string;
}

export function PlanAuditLog() {
  const [auditEntries, setAuditEntries] = useState<PlanAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7'); // days
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditEntries();
  }, [actionFilter, dateFilter]);

  const fetchAuditEntries = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('user_plan_audit')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateFilter));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      const { data: auditData, error } = await query.limit(100);
      if (error) throw error;

      // Get user and admin emails separately
      const userIds = [...new Set(auditData?.map(entry => entry.user_id) || [])];
      const adminIds = [...new Set(auditData?.map(entry => entry.admin_user_id) || [])];
      const allUserIds = [...new Set([...userIds, ...adminIds])];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', allUserIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(profile => [profile.user_id, profile.email]) || []);

      const formattedEntries: PlanAuditEntry[] = auditData?.map(entry => ({
        ...entry,
        user_email: profilesMap.get(entry.user_id) || 'Unknown',
        admin_email: profilesMap.get(entry.admin_user_id) || 'System'
      })) || [];

      setAuditEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching audit entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = auditEntries.filter(entry => 
    searchEmail === '' || 
    entry.user_email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    entry.admin_email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'assigned': return 'default';
      case 'changed': return 'secondary';
      case 'removed': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionDescription = (entry: PlanAuditEntry) => {
    switch (entry.action_type) {
      case 'assigned':
        return `Assigned ${entry.new_plan_name} plan`;
      case 'changed':
        return `Changed from ${entry.old_plan_name} to ${entry.new_plan_name}`;
      case 'removed':
        return `Removed ${entry.old_plan_name} plan`;
      default:
        return 'Unknown action';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading audit log...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Plan Assignment Audit Log
        </CardTitle>
        <CardDescription>
          Track all subscription plan changes and assignments
        </CardDescription>
        
        {/* Filters */}
        <div className="flex gap-4 items-center pt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="changed">Changed</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchAuditEntries} size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Plan Changes</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No audit entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDate(entry.created_at)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{entry.user_email}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(entry.action_type)}>
                      {entry.action_type}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      {getActionDescription(entry)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{entry.admin_email}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {entry.notes || 'No notes'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {filteredEntries.length > 0 && (
          <div className="text-sm text-muted-foreground mt-4">
            Showing {filteredEntries.length} entries
          </div>
        )}
      </CardContent>
    </Card>
  );
}