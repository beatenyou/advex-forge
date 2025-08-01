import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Activity,
  MessageSquare,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  Globe,
  Cpu,
  RefreshCw,
  Filter,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface DailyStats {
  stat_date: string;
  active_users: number;
  new_users: number;
  total_sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
  total_ai_interactions: number;
  ai_success_rate: number;
  avg_response_time_ms: number;
  error_count: number;
}

interface RealtimeMetrics {
  totalUsers: number;
  onlineUsers: number;
  totalSessions: number;
  totalAIInteractions: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

interface AIError {
  id: string;
  user_id: string;
  session_id?: string;
  error_type: string;
  provider_name?: string;
  error_details?: any;
  user_context?: any;
  browser_info?: string;
  created_at: string;
}

interface UserSession {
  id: string;
  user_id: string;
  email: string;
  session_start: string;
  session_end?: string;
  duration_seconds?: number;
  pages_visited: number;
  is_bounce: boolean;
  user_agent?: string;
  referrer?: string;
  created_at: string;
}

interface UserAIUsage {
  user_id: string;
  email?: string;
  display_name?: string;
  daily_interactions: number;
  total_interactions: number;
  success_rate: number;
  avg_response_time: number;
  quota_used: number;
  quota_limit: number;
  plan_name: string;
}

// AI Errors Section Component
const AIErrorsSection = () => {
  const [errors, setErrors] = useState<AIError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedErrorType, setSelectedErrorType] = useState('all');
  const [selectedError, setSelectedError] = useState<AIError | null>(null);

  useEffect(() => {
    fetchErrors();
  }, [selectedErrorType]);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ai_interactions')
        .select(`
          id, user_id, session_id, error_type, provider_name, 
          error_details, user_context, browser_info, created_at
        `)
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedErrorType !== 'all') {
        query = query.eq('error_type', selectedErrorType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error('Error fetching AI errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'quota_exceeded': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'timeout': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'provider_error': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'auth_error': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'api_key_error': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'rate_limit_error': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'network_error': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'configuration_error': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'quota_exceeded': return 'AI Quota Exceeded';
      case 'timeout': return 'Request Timeout';
      case 'provider_error': return 'AI Provider Error';
      case 'auth_error': return 'Authentication Error';
      case 'api_key_error': return 'API Key Error';
      case 'rate_limit_error': return 'Rate Limit Exceeded';
      case 'network_error': return 'Network Connection Error';
      case 'configuration_error': return 'Configuration Error';
      case 'system_error': return 'System Error';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const errorTypeCounts = errors.reduce((acc, error) => {
    acc[error.error_type] = (acc[error.error_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={selectedErrorType} onValueChange={setSelectedErrorType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by error type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Errors</SelectItem>
            <SelectItem value="quota_exceeded">AI Quota Exceeded</SelectItem>
            <SelectItem value="timeout">Request Timeout</SelectItem>
            <SelectItem value="provider_error">AI Provider Error</SelectItem>
            <SelectItem value="auth_error">Authentication Error</SelectItem>
            <SelectItem value="api_key_error">API Key Error</SelectItem>
            <SelectItem value="rate_limit_error">Rate Limit Exceeded</SelectItem>
            <SelectItem value="network_error">Network Connection Error</SelectItem>
            <SelectItem value="configuration_error">Configuration Error</SelectItem>
            <SelectItem value="system_error">System Error</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchErrors}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(errorTypeCounts).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {getErrorTypeLabel(type)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Recent AI Errors
                  </CardTitle>
                  <CardDescription>
                    Detailed error logs for troubleshooting AI interactions
                  </CardDescription>
                </div>
                <ChevronDown className="w-5 h-5" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : errors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No errors found</p>
              ) : (
                <div className="space-y-4">
                  {errors.map((error) => (
                    <div key={error.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getErrorTypeColor(error.error_type)}>
                            {getErrorTypeLabel(error.error_type)}
                          </Badge>
                          {error.provider_name && error.provider_name !== 'unknown' && (
                            <Badge variant="outline">{error.provider_name}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(error.created_at).toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <p><strong>User ID:</strong> {error.user_id}</p>
                          {error.session_id && <p><strong>Session ID:</strong> {error.session_id}</p>}
                        </div>
                      </div>

                      {selectedError?.id === error.id && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">Detailed Error Information</h4>
                          {error.error_details && (
                            <div className="mb-3">
                              <strong>Error Details:</strong>
                              <pre className="text-xs bg-background p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(error.error_details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

// User Engagement Section Component
const UserEngagementSection = ({ selectedDateRange }: { selectedDateRange: string }) => {
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserSessions = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedDateRange === '7days' ? 7 : selectedDateRange === '30days' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      const { data, error } = await supabase.rpc('get_user_sessions_with_profiles', {
        start_date_param: startDate.toISOString().split('T')[0],
        end_date_param: endDate.toISOString().split('T')[0],
        limit_count: 50
      });

      if (error) throw error;
      
      setUserSessions(data || []);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  };

  useEffect(() => {
    if (engagementOpen) {
      fetchUserSessions();
    }
  }, [engagementOpen, selectedDateRange]);

  return (
    <Card>
      <Collapsible open={engagementOpen} onOpenChange={setEngagementOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Engagement Trends
                </CardTitle>
                <CardDescription>
                  Detailed user sessions with email addresses and activity data
                </CardDescription>
              </div>
              {engagementOpen ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : userSessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No user sessions found</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Recent User Sessions</h4>
                  <Button variant="outline" size="sm" onClick={fetchUserSessions}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{formatDuration(session.duration_seconds)}</TableCell>
                        <TableCell>{session.pages_visited}</TableCell>
                        <TableCell>
                          {new Date(session.session_start).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.is_bounce ? "destructive" : "default"}>
                            {session.is_bounce ? 'Bounce' : 'Engaged'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// AI Interaction Section Component
const AIInteractionSection = ({ selectedDateRange }: { selectedDateRange: string }) => {
  const [aiUsageOpen, setAiUsageOpen] = useState(false);
  const [userAIUsage, setUserAIUsage] = useState<UserAIUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUserAIUsage = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedDateRange === '7days' ? 7 : selectedDateRange === '30days' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      const { data, error } = await supabase.rpc('get_user_ai_usage_stats', {
        start_date_param: startDate.toISOString().split('T')[0],
        end_date_param: endDate.toISOString().split('T')[0]
      });

      if (error) throw error;
      
      setUserAIUsage(data || []);
    } catch (error) {
      console.error('Error fetching user AI usage:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI usage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aiUsageOpen) {
      fetchUserAIUsage();
    }
  }, [aiUsageOpen, selectedDateRange]);

  return (
    <Card>
      <Collapsible open={aiUsageOpen} onOpenChange={setAiUsageOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  AI Chat Usage
                </CardTitle>
                <CardDescription>
                  User-specific AI interaction statistics and quota usage
                </CardDescription>
              </div>
              {aiUsageOpen ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : userAIUsage.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No AI usage data found</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">User AI Chat Statistics</h4>
                  <Button variant="outline" size="sm" onClick={fetchUserAIUsage}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Today</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Quota</TableHead>
                      <TableHead>Plan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userAIUsage.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.email || user.display_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{user.daily_interactions}</TableCell>
                        <TableCell>{user.total_interactions}</TableCell>
                        <TableCell>
                          <Badge variant={user.success_rate >= 90 ? "default" : "secondary"}>
                            {Math.round(user.success_rate)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={user.quota_used / user.quota_limit > 0.8 ? "text-destructive" : ""}>
                            {user.quota_used}/{user.quota_limit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.plan_name}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const AdminStatistics = () => {
  const [selectedDateRange, setSelectedDateRange] = useState('7days');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDailyStats = useCallback(async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedDateRange === '7days' ? 7 : selectedDateRange === '30days' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .gte('stat_date', startDate.toISOString().split('T')[0])
        .lte('stat_date', endDate.toISOString().split('T')[0])
        .order('stat_date', { ascending: false });

      if (error) throw error;
      setDailyStats(data || []);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange, toast]);

  const fetchRealtimeMetrics = useCallback(async () => {
    try {
      const [usersResult, sessionsResult, aiResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('user_sessions').select('id', { count: 'exact' }),
        supabase.from('ai_interactions').select('id, success', { count: 'exact' })
      ]);

      const totalUsers = usersResult.count || 0;
      const totalSessions = sessionsResult.count || 0;
      const totalAIInteractions = aiResult.count || 0;

      setRealtimeMetrics({
        totalUsers,
        onlineUsers: 0,
        totalSessions,
        totalAIInteractions,
        avgResponseTime: 0,
        errorRate: 0,
        uptime: 99.9
      });
    } catch (error) {
      console.error('Error fetching realtime metrics:', error);
    }
  }, []);

  useEffect(() => {
    fetchDailyStats();
    fetchRealtimeMetrics();
  }, [fetchDailyStats, fetchRealtimeMetrics]);

  const refreshData = () => {
    fetchDailyStats();
    fetchRealtimeMetrics();
  };

  const totalStats = dailyStats.reduce(
    (acc, stat) => ({
      totalUsers: acc.totalUsers + stat.active_users,
      totalSessions: acc.totalSessions + stat.total_sessions,
      totalAIInteractions: acc.totalAIInteractions + stat.total_ai_interactions,
      avgResponseTime: acc.avgResponseTime + stat.avg_response_time_ms,
      totalErrors: acc.totalErrors + stat.error_count,
    }),
    { totalUsers: 0, totalSessions: 0, totalAIInteractions: 0, avgResponseTime: 0, totalErrors: 0 }
  );

  if (dailyStats.length > 0) {
    totalStats.avgResponseTime = totalStats.avgResponseTime / dailyStats.length;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Analytics</h3>
          <p className="text-sm text-muted-foreground">Monitor user engagement and AI interactions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeMetrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">+{totalStats.totalUsers} active in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">User sessions in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalAIInteractions}</div>
            <p className="text-xs text-muted-foreground">Chat messages processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalStats.avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground">AI response latency</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Tabs */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <UserEngagementSection selectedDateRange={selectedDateRange} />
        </TabsContent>

        <TabsContent value="ai-usage" className="space-y-4">
          <AIInteractionSection selectedDateRange={selectedDateRange} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <AIErrorsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};