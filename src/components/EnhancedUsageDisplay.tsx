import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface EnhancedUsageDisplayProps {
  currentUsage: number;
  quotaLimit: number;
  planName: string;
  canUseAI: boolean;
  className?: string;
}

export function EnhancedUsageDisplay({ 
  currentUsage, 
  quotaLimit, 
  planName, 
  canUseAI,
  className = "" 
}: EnhancedUsageDisplayProps) {
  const usagePercentage = quotaLimit > 0 ? (currentUsage / quotaLimit) * 100 : 0;
  
  const getUsageStatus = () => {
    if (usagePercentage >= 95) return { color: 'text-red-600', icon: AlertTriangle, status: 'Critical' };
    if (usagePercentage >= 80) return { color: 'text-yellow-600', icon: AlertTriangle, status: 'Warning' };
    return { color: 'text-green-600', icon: CheckCircle, status: 'Good' };
  };

  const status = getUsageStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          AI Usage
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Badge variant={planName === 'Free' ? 'secondary' : 'default'} className="text-xs">
            {planName} Plan
          </Badge>
          <div className="flex items-center gap-1">
            <StatusIcon className={`h-3 w-3 ${status.color}`} />
            <span className={`text-xs ${status.color}`}>{status.status}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              {currentUsage} / {quotaLimit} requests
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(usagePercentage)}%
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
            aria-label={`${usagePercentage}% of AI quota used`}
          />
        </div>
        
        {!canUseAI && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              Quota exceeded - Contact admin for more requests
            </span>
          </div>
        )}
        
        {canUseAI && usagePercentage >= 80 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              {usagePercentage >= 95 ? 'Almost at quota limit' : 'Approaching quota limit'}
            </span>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Remaining: {Math.max(0, quotaLimit - currentUsage)} requests
        </div>
      </CardContent>
    </Card>
  );
}