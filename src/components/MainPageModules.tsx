import { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Database, 
  Network, 
  Users, 
  Key, 
  FileText,
  Search,
  Activity,
  Target,
  AlertTriangle
} from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface MainPageModulesProps {
  isWideScreen?: boolean;
}

export const MainPageModules = ({ isWideScreen }: MainPageModulesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        
        // Calculate columns based on actual container width
        if (width >= 1600) setColumns(4);      // Ultra-wide: 4 columns
        else if (width >= 1200) setColumns(3); // Wide: 3 columns  
        else if (width >= 800) setColumns(2);  // Medium: 2 columns
        else setColumns(1);                    // Small: 1 column
      }
    };

    updateLayout();

    const resizeObserver = new ResizeObserver(updateLayout);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Mock data for AD enumeration modules
  const enumerationModules = [
    { name: 'Domain Enumeration', status: 'ready', description: 'Discover domain structure and trusts' },
    { name: 'User Enumeration', status: 'ready', description: 'Enumerate domain users and groups' },
    { name: 'Service Discovery', status: 'ready', description: 'Find running services and protocols' },
    { name: 'Privilege Escalation', status: 'ready', description: 'Identify privilege escalation paths' }
  ];

  const recentScans = [
    { target: 'CORP.LOCAL', type: 'Domain Enum', status: 'completed', findings: 47 },
    { target: '192.168.1.0/24', type: 'Network Scan', status: 'running', findings: 12 },
    { target: 'DC01.corp.local', type: 'SMB Enum', status: 'completed', findings: 23 },
    { target: 'SQL01.corp.local', type: 'Service Enum', status: 'pending', findings: 0 }
  ];

  const quickActions = [
    { name: 'Domain Controller Discovery', icon: Database, description: 'Find domain controllers' },
    { name: 'Password Policy Check', icon: Key, description: 'Analyze password policies' },
    { name: 'Share Enumeration', icon: FileText, description: 'Discover network shares' },
    { name: 'Vulnerability Scan', icon: AlertTriangle, description: 'Scan for known vulnerabilities' }
  ];

  return (
    <div ref={containerRef} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-cyber bg-clip-text text-transparent">
            AD Attack Platform
          </h1>
          <p className="text-muted-foreground">
            Active Directory Enumeration & Attack Framework
          </p>
        </div>
        <Button variant="cyber" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Dynamic Grid Layout */}
      <div 
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        
        {/* Core Modules - Always Visible */}
        <DashboardWidget title="Enumeration Modules" icon={Search}>
          <div className="space-y-3">
            {enumerationModules.map((module) => (
              <div key={module.name} className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{module.name}</span>
                  <Badge variant={module.status === 'ready' ? 'default' : 'secondary'}>
                    {module.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
            ))}
          </div>
        </DashboardWidget>

        <DashboardWidget title="Network Overview" icon={Network}>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">12</div>
              <div className="text-sm text-muted-foreground">Active Targets</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Domain Controllers</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Member Servers</span>
                <span className="font-medium">47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Workstations</span>
                <span className="font-medium">156</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Network Discovery
            </Button>
          </div>
        </DashboardWidget>

        {/* Additional Modules for 2+ Columns */}
        {columns >= 2 && (
          <>
            <DashboardWidget title="Recent Scans" icon={Activity}>
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{scan.target}</span>
                        <Badge variant="outline" className="text-xs">{scan.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          scan.status === 'completed' ? 'bg-green-500' : 
                          scan.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`} />
                        <span className="text-xs text-muted-foreground">{scan.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{scan.findings}</div>
                      <div className="text-xs text-muted-foreground">findings</div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardWidget>

            <DashboardWidget title="Security Status" icon={Shield}>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">Medium</div>
                  <div className="text-sm text-muted-foreground">Security Level</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Privileged Accounts</span>
                    <span className="text-yellow-600">23 exposed</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Kerberoastable SPNs</span>
                    <span className="text-red-600">7 found</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unconstrained Delegation</span>
                    <span className="text-green-600">0 found</span>
                  </div>
                </div>
                <Progress value={65} className="h-2" />
                <p className="text-xs text-muted-foreground">Overall security score: 65/100</p>
              </div>
            </DashboardWidget>
          </>
        )}

        {/* Extra Modules for 3+ Columns */}
        {columns >= 3 && (
          <>
            <DashboardWidget title="Domain Intelligence" icon={Database}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold">1,247</div>
                    <div className="text-xs text-muted-foreground">Total Users</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">89</div>
                    <div className="text-xs text-muted-foreground">Admin Users</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Domain Trusts</span>
                    <span>3 external</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GPO Objects</span>
                    <span>45 total</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Organizational Units</span>
                    <span>12 active</span>
                  </div>
                </div>
              </div>
            </DashboardWidget>

            <DashboardWidget title="Attack Vectors" icon={Target}>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">High Priority</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Kerberoasting opportunities detected</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Medium Priority</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Weak password policies found</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Credential Access</span>
                  </div>
                  <p className="text-xs text-muted-foreground">NTLM relay opportunities</p>
                </div>
              </div>
            </DashboardWidget>
          </>
        )}

        {/* Ultra-wide Modules for 4+ Columns */}
        {columns >= 4 && (
          <>
            <DashboardWidget title="Quick Actions" icon={Activity}>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.name}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex items-start gap-3">
                      <action.icon className="h-4 w-4 mt-0.5 text-primary" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{action.name}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </DashboardWidget>

            <DashboardWidget title="Tools & Techniques" icon={FileText}>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm mb-1">BloodHound Analysis</div>
                  <p className="text-xs text-muted-foreground">Graph-based AD analysis</p>
                  <Button variant="outline" size="sm" className="w-full mt-2">Launch</Button>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm mb-1">PowerView Scripts</div>
                  <p className="text-xs text-muted-foreground">PowerShell enumeration</p>
                  <Button variant="outline" size="sm" className="w-full mt-2">Execute</Button>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm mb-1">LDAP Queries</div>
                  <p className="text-xs text-muted-foreground">Custom LDAP searches</p>
                  <Button variant="outline" size="sm" className="w-full mt-2">Query</Button>
                </div>
              </div>
            </DashboardWidget>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground">
        Active Directory Attack Platform • Showing {columns} column{columns !== 1 ? 's' : ''}
      </div>
    </div>
  );
};