// ============= Simple Chat Loader Component =============

import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SimpleChatLoaderProps {
  isLoading: boolean;
  className?: string;
}

export const SimpleChatLoader = ({ 
  isLoading, 
  className 
}: SimpleChatLoaderProps) => {
  if (!isLoading) return null;

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Loading icon */}
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          
          {/* Loading text */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Initializing chat...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Setting up your AI assistant
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};