import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Shield, Activity, RefreshCw } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';

export function EnhancedAuthDashboard() {
  const {
    user,
    isMonitoring,
    healthMetrics,
    sessionValidation,
    authEvents,
    performEnhancedRecovery,
    performAutoCleanup,
    calculateHealthMetrics
  } = useEnhancedAuth();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getHealthStatus = () => {
    if (!healthMetrics) return { status: 'unknown', color: 'secondary' };
    
    const { loginSuccessRate, errorRate } = healthMetrics;
    
    if (loginSuccessRate > 95 && errorRate < 5) {
      return { status: 'excellent', color: 'success' };
    } else if (loginSuccessRate > 85 && errorRate < 15) {
      return { status: 'good', color: 'warning' };
    } else {
      return { status: 'needs attention', color: 'destructive' };
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enhanced Authentication System
          </CardTitle>
          <CardDescription>
            Pro-level authentication monitoring and security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please sign in to access enhanced authentication features.</p>
        </CardContent>
      </Card>
    );
  }

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enhanced Authentication System
            <Badge variant={isMonitoring ? 'default' : 'secondary'}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Pro-level authentication monitoring powered by Supabase Pro capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={performEnhancedRecovery} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Enhanced Recovery
            </Button>
            <Button 
              onClick={performAutoCleanup} 
              variant="outline" 
              size="sm"
            >
              <Activity className="h-4 w-4 mr-2" />
              Cleanup Sessions
            </Button>
            <Button 
              onClick={calculateHealthMetrics} 
              variant="outline" 
              size="sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              Refresh Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Health Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={healthStatus.color as any}>
                  {healthStatus.status}
                </Badge>
              </div>
              {healthMetrics && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="text-sm font-medium">
                      {healthMetrics.loginSuccessRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Session</span>
                    <span className="text-sm font-medium">
                      {Math.round(healthMetrics.avgSessionDuration / 60)}min
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Error Rate</span>
                    <span className="text-sm font-medium">
                      {healthMetrics.errorRate.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Validation</span>
                <Badge variant={sessionValidation?.isValid ? 'default' : 'destructive'}>
                  {sessionValidation?.isValid ? 'Valid' : 'Issues Found'}
                </Badge>
              </div>
              {sessionValidation && sessionValidation.issues.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Issues:</span>
                  {sessionValidation.issues.map((issue, index) => (
                    <div key={index} className="text-xs p-2 bg-destructive/10 rounded">
                      {issue.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              )}
              {sessionValidation && sessionValidation.recommendations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Recommendations:</span>
                  {sessionValidation.recommendations.map((rec, index) => (
                    <div key={index} className="text-xs p-2 bg-blue-50 rounded">
                      {rec.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {authEvents.length > 0 ? (
                authEvents.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {getSeverityIcon(event.severity)}
                    <span className="flex-1 truncate">
                      {event.eventType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No recent events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pro Features Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Real-time Monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Advanced Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Session Validation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Auto Recovery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Enhanced Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Performance Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Predictive Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Pro Database</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}