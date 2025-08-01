import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAIStatus } from '@/hooks/useAIStatus';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';

interface AIStatusRecoveryProps {
  onRecoveryComplete?: () => void;
}

export const AIStatusRecovery = ({ onRecoveryComplete }: AIStatusRecoveryProps) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const { refresh: refreshAIStatus } = useAIStatus();
  const { refreshModels, selectedModelId } = useUserModelAccess();

  const handleRecovery = async () => {
    setIsRecovering(true);
    console.log('🔧 Starting AI status recovery process...');

    try {
      // Step 1: Refresh models
      console.log('📱 Refreshing user models...');
      await refreshModels();
      
      // Step 2: Wait for model refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Refresh AI status with current model
      console.log('🔄 Refreshing AI status...');
      await refreshAIStatus();
      
      // Step 4: Force model synchronization event
      console.log('🚀 Forcing model synchronization...');
      window.dispatchEvent(new CustomEvent('forceStatusRefresh', {
        detail: { 
          modelId: selectedModelId,
          timestamp: Date.now(),
          source: 'recovery'
        }
      }));
      
      // Step 5: Wait for synchronization
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast({
        title: "Recovery Complete",
        description: "AI status and model synchronization has been restored.",
      });
      
      onRecoveryComplete?.();
      
    } catch (error) {
      console.error('❌ AI recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: "Unable to recover AI status. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <span className="text-sm text-muted-foreground">
        AI sync issue detected
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRecovery}
        disabled={isRecovering}
        className="h-7"
      >
        {isRecovering ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        {isRecovering ? 'Recovering...' : 'Fix Now'}
      </Button>
    </div>
  );
};