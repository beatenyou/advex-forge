import { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Shield, 
  Database,
  Clock,
  Settings,
  BarChart3,
  PieChart,
  Calendar,
  Bell
} from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface ResponsiveDashboardProps {
  isWideScreen?: boolean;
}

export const ResponsiveDashboard = ({ isWideScreen }: ResponsiveDashboardProps) => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      
      // Dynamic column calculation based on screen width
      if (width >= 1920) setColumns(4);      // Ultra-wide: 4 columns
      else if (width >= 1400) setColumns(3); // Wide: 3 columns  
      else if (width >= 1024) setColumns(2); // Medium: 2 columns
      else setColumns(1);                    // Small: 1 column
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
  };

  // Mock data for demonstration
  const stats = {
    totalUsers: 1247,
    activeChats: 89,
    systemLoad: 67,
    uptime: 99.9
  };

  const recentActivity = [
    { user: 'john@example.com', action: 'Started new chat', time: '2 min ago' },
    { user: 'sarah@company.com', action: 'Completed task', time: '5 min ago' },
    { user: 'mike@startup.io', action: 'Updated profile', time: '8 min ago' },
    { user: 'lisa@corp.com', action: 'Generated report', time: '12 min ago' }
  ];

  const aiProviders = [
    { name: 'OpenAI', status: 'active', usage: 85 },
    { name: 'Mistral', status: 'active', usage: 67 },
    { name: 'Anthropic', status: 'inactive', usage: 0 }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Showing {columns} column{columns !== 1 ? 's' : ''} • Screen: {screenWidth}px
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configure
        </Button>
      </div>

      {/* Dynamic Grid Layout */}
      <div className={`grid gap-6 ${gridCols[columns as keyof typeof gridCols]}`}>
        
        {/* Core Widgets - Always Visible */}
        <DashboardWidget title="System Overview" icon={Activity}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="font-semibold">{stats.totalUsers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Chats</span>
              <Badge variant="secondary">{stats.activeChats}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>System Load</span>
                <span>{stats.systemLoad}%</span>
              </div>
              <Progress value={stats.systemLoad} className="h-2" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="font-semibold text-green-600">{stats.uptime}%</span>
            </div>
          </div>
        </DashboardWidget>

        <DashboardWidget title="AI Providers" icon={Database}>
          <div className="space-y-3">
            {aiProviders.map((provider) => (
              <div key={provider.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    provider.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium">{provider.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{provider.usage}%</div>
                  <div className="text-xs text-muted-foreground">usage</div>
                </div>
              </div>
            ))}
          </div>
        </DashboardWidget>

        {/* Additional Widgets for 2+ Columns */}
        {columns >= 2 && (
          <>
            <DashboardWidget title="Recent Activity" icon={Clock}>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 hover:bg-muted rounded-lg transition-colors">
                    <Users className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </DashboardWidget>

            <DashboardWidget title="Performance Metrics" icon={TrendingUp}>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">98.7%</div>
                  <div className="text-sm text-muted-foreground">Response Rate</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold">2.3s</div>
                    <div className="text-xs text-muted-foreground">Avg Response</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">156</div>
                    <div className="text-xs text-muted-foreground">Queries/min</div>
                  </div>
                </div>
              </div>
            </DashboardWidget>
          </>
        )}

        {/* Extra Widgets for 3+ Columns */}
        {columns >= 3 && (
          <>
            <DashboardWidget title="Security Status" icon={Shield}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Threat Level</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">Low</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Firewall Status</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Security Scan</span>
                    <span>2 hours ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Failed Logins (24h)</span>
                    <span>3</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Run Security Scan
                </Button>
              </div>
            </DashboardWidget>

            <DashboardWidget title="Analytics" icon={BarChart3}>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">+24%</div>
                  <div className="text-sm text-muted-foreground">Growth this month</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Page Views</span>
                    <span className="font-medium">45,231</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Unique Users</span>
                    <span className="font-medium">3,492</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Conversion Rate</span>
                    <span className="font-medium">12.4%</span>
                  </div>
                </div>
              </div>
            </DashboardWidget>
          </>
        )}

        {/* Ultra-wide Widgets for 4+ Columns */}
        {columns >= 4 && (
          <>
            <DashboardWidget title="Notifications" icon={Bell}>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">System Update Available</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">New features ready for deployment</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">High API Usage</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Consider upgrading your plan</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Backup Completed</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Daily backup successful</p>
                </div>
              </div>
            </DashboardWidget>

            <DashboardWidget title="Quick Actions" icon={Settings}>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <PieChart className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Database Status
                </Button>
              </div>
            </DashboardWidget>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground">
        Dashboard automatically scales from 1 to 4 columns based on screen width
      </div>
    </div>
  );
};