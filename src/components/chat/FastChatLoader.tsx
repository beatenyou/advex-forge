// ============= Fast Chat Loader Component =============

import { useState, useEffect } from 'react';
import { Loader2, Bot, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FastChatLoaderProps {
  isLoading: boolean;
  isConnectionWarm?: boolean;
  className?: string;
}

export const FastChatLoader = ({ 
  isLoading, 
  isConnectionWarm = false,
  className 
}: FastChatLoaderProps) => {
  const [loadingStep, setLoadingStep] = useState(0);
  const [dots, setDots] = useState('');
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);

  // Animate loading steps
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      setShowTimeoutFallback(false);
      return;
    }

    const steps = [
      'Initializing chat',
      'Connecting to AI',
      'Loading model',
      'Ready to chat'
    ];

    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const next = prev + 1;
        return next >= steps.length ? 0 : next;
      });
    }, isConnectionWarm ? 300 : 800); // Faster animation for warm connections

    // Timeout fallback after 8 seconds instead of 10
    const timeout = setTimeout(() => {
      setShowTimeoutFallback(true);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLoading, isConnectionWarm]);

  // Animate dots
  useEffect(() => {
    if (!isLoading) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400); // Slightly faster dot animation

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const steps = [
    { label: 'Initializing chat', icon: Bot },
    { label: 'Connecting to AI', icon: Zap },
    { label: 'Loading model', icon: Loader2 },
    { label: 'Ready to chat', icon: Bot }
  ];

  const currentStep = steps[loadingStep];
  const Icon = currentStep.icon;

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isConnectionWarm ? "default" : "secondary"}
              className={cn(
                "text-xs",
                isConnectionWarm ? "bg-green-500/10 text-green-700 border-green-500/20" : ""
              )}
            >
              {isConnectionWarm ? (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Fast Connection
                </>
              ) : (
                "Cold Start"
              )}
            </Badge>
          </div>

          {/* Loading icon */}
          <div className="relative">
            <Icon 
              className={cn(
                "w-8 h-8",
                Icon === Loader2 ? "animate-spin" : "animate-pulse",
                isConnectionWarm ? "text-green-500" : "text-blue-500"
              )} 
            />
          </div>

          {/* Loading text */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {showTimeoutFallback ? "Still loading..." : currentStep.label}{dots}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {showTimeoutFallback 
                ? "This is taking longer than expected. Please wait..."
                : isConnectionWarm 
                  ? "Using warm connection for faster loading" 
                  : "Starting up AI services..."
              }
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                isConnectionWarm ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ 
                width: `${((loadingStep + 1) / steps.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};