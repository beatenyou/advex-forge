import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, ArrowRight, X } from 'lucide-react';

interface ModelSwitchNotificationProps {
  previousModel?: string;
  currentModel: string;
  onDismiss: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function ModelSwitchNotification({ 
  previousModel, 
  currentModel, 
  onDismiss,
  autoHide = true,
  autoHideDelay = 3000
}: ModelSwitchNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out animation
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  if (!isVisible) return null;

  return (
    <Card className={`border-l-4 border-l-primary animate-in slide-in-from-right duration-300 ${
      !isVisible ? 'animate-out slide-out-to-right duration-300' : ''
    }`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bot className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2 text-sm">
              {previousModel && (
                <>
                  <Badge variant="outline" className="text-xs">
                    {previousModel}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </>
              )}
              <Badge variant="default" className="text-xs">
                {currentModel}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {previousModel ? 'Model switched' : 'Model selected'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}