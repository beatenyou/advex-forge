import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface CompactUsageDisplayProps {
  currentUsage: number;
  quotaLimit: number;
  planName: string;
  canUseAI: boolean;
  className?: string;
}

export function CompactUsageDisplay({ 
  currentUsage, 
  quotaLimit, 
  planName, 
  canUseAI,
  className = "" 
}: CompactUsageDisplayProps) {
  const usagePercentage = quotaLimit > 0 ? (currentUsage / quotaLimit) * 100 : 0;
  const remaining = Math.max(0, quotaLimit - currentUsage);
  
  const getUsageStatus = () => {
    if (usagePercentage >= 95) return { color: 'text-red-600', icon: AlertTriangle, status: 'Critical' };
    if (usagePercentage >= 80) return { color: 'text-yellow-600', icon: AlertTriangle, status: 'Warning' };
    return { color: 'text-green-600', icon: CheckCircle, status: 'Good' };
  };

  const status = getUsageStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <Badge variant={planName === 'Free' ? 'secondary' : 'default'} className="text-xs px-1.5 py-0.5">
          {planName}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1">
          <StatusIcon className={`h-3 w-3 ${status.color}`} />
          <span className="text-xs text-muted-foreground">
            {currentUsage}/{quotaLimit}
          </span>
        </div>
        
        <div className="flex-1 min-w-[60px] max-w-[80px]">
          <Progress 
            value={usagePercentage} 
            className="h-1.5"
            aria-label={`${usagePercentage}% of AI quota used`}
          />
        </div>
        
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {remaining} left
        </span>
      </div>
      
      {!canUseAI && (
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">Quota exceeded</span>
        </div>
      )}
    </div>
  );
}