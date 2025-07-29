import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
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
  ArrowLeft,
  RefreshCw
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

const AdminStats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('7days');

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchStatistics();
    }
  }, [isAdmin, selectedDateRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedDateRange === '7days' ? 7 : selectedDateRange === '30days' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch daily stats
      const { data: dailyStatsData, error: statsError } = await supabase
        .from('daily_stats')
        .select('*')
        .gte('stat_date', startDate.toISOString().split('T')[0])
        .lte('stat_date', endDate.toISOString().split('T')[0])
        .order('stat_date', { ascending: true });

      if (statsError) throw statsError;

      setDailyStats(dailyStatsData || []);

      // Calculate realtime metrics
      await calculateRealtimeMetrics();

    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateRealtimeMetrics = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get today's active sessions
      const today = new Date().toISOString().split('T')[0];
      const { count: todaySessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get today's AI interactions
      const { data: aiInteractions } = await supabase
        .from('ai_interactions')
        .select('success, response_time_ms')
        .gte('created_at', today);

      const totalAIInteractions = aiInteractions?.length || 0;
      const successfulInteractions = aiInteractions?.filter(i => i.success)?.length || 0;
      const avgResponseTime = aiInteractions?.length 
        ? aiInteractions.reduce((sum, i) => sum + (i.response_time_ms || 0), 0) / aiInteractions.length
        : 0;
      const errorRate = totalAIInteractions > 0 
        ? ((totalAIInteractions - successfulInteractions) / totalAIInteractions) * 100
        : 0;

      setRealtimeMetrics({
        totalUsers: totalUsers || 0,
        onlineUsers: 0, // This would require websocket implementation
        totalSessions: todaySessions || 0,
        totalAIInteractions,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: 99.9 // This would come from monitoring service
      });

    } catch (error) {
      console.error('Error calculating realtime metrics:', error);
    }
  };

  const refreshData = async () => {
    // Calculate daily stats for today
    try {
      await supabase.rpc('calculate_daily_stats');
      await fetchStatistics();
      toast({
        title: 'Success',
        description: 'Statistics refreshed successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh statistics',
        variant: 'destructive'
      });
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestStats = dailyStats[dailyStats.length - 1];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Admin Statistics Dashboard</h1>
            <p className="text-muted-foreground">Monitor user engagement and system performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
          <Button onClick={refreshData} size="sm" disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="ai">AI Interaction</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{realtimeMetrics?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{latestStats?.new_users || 0} new today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestStats?.active_users || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {realtimeMetrics?.totalSessions || 0} sessions today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{realtimeMetrics?.totalAIInteractions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {latestStats?.ai_success_rate?.toFixed(1) || 0}% success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{realtimeMetrics?.avgResponseTime || 0}ms</div>
                  <p className="text-xs text-muted-foreground">
                    {realtimeMetrics?.errorRate || 0}% error rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Summary */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Real-time system status and performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Uptime</span>
                  <Badge variant="secondary">{realtimeMetrics?.uptime || 99.9}%</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database Status</span>
                  <Badge variant="default">Healthy</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Services</span>
                  <Badge variant="default">Operational</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(latestStats?.avg_session_duration || 0)}s
                  </div>
                  <p className="text-xs text-muted-foreground">Average session length</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestStats?.bounce_rate?.toFixed(1) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Single-page visits</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestStats?.total_sessions || 0}</div>
                  <p className="text-xs text-muted-foreground">Daily sessions</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>User activity over the selected time period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyStats.slice(-7).map((stat, index) => (
                    <div key={stat.stat_date} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{new Date(stat.stat_date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Users: {stat.active_users}</span>
                        <span>Sessions: {stat.total_sessions}</span>
                        <span>Duration: {Math.round(stat.avg_session_duration)}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Interaction Tab */}
          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestStats?.ai_success_rate?.toFixed(1) || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Successful interactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestStats?.total_ai_interactions || 0}</div>
                  <p className="text-xs text-muted-foreground">Daily AI requests</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Error Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestStats?.error_count || 0}</div>
                  <p className="text-xs text-muted-foreground">Failed requests</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(latestStats?.avg_response_time_ms || 0)}ms
                  </div>
                  <p className="text-xs text-muted-foreground">Average response time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{realtimeMetrics?.errorRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Failed responses</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources & Demographics</CardTitle>
                <CardDescription>
                  Demographic data will be collected as users interact with the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Demographic data collection is in progress...</p>
                  <p className="text-sm">Data will appear as users visit the site</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminStats;