import { useState, useEffect } from 'react';
import { Bot, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';

interface ModelStatusDisplayProps {
  compact?: boolean;
  showQuota?: boolean;
}

export function ModelStatusDisplay({ compact = false, showQuota = false }: ModelStatusDisplayProps) {
  const { getSelectedModel } = useUserModelAccess();
  const [currentModel, setCurrentModel] = useState(getSelectedModel());

  useEffect(() => {
    // Update display immediately when model changes
    const handleModelChange = (event: CustomEvent) => {
      console.log('🔄 ModelStatusDisplay received model change:', event.detail);
      setCurrentModel(getSelectedModel());
    };

    window.addEventListener('modelChanged', handleModelChange as EventListener);
    
    // Also update when component mounts or hook changes
    setCurrentModel(getSelectedModel());

    return () => {
      window.removeEventListener('modelChanged', handleModelChange as EventListener);
    };
  }, [getSelectedModel]);

  const getModelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'openai':
        return <Zap className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />;
      case 'mistral':
        return <Sparkles className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />;
      default:
        return <Bot className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />;
    }
  };

  if (!currentModel || !currentModel.provider) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Bot className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
        <span className={`${compact ? 'text-xs' : 'text-sm'}`}>No model selected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {getModelIcon(currentModel.provider.type)}
      <div className="flex items-center gap-2">
        <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
          Using {currentModel.provider.name}
        </span>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      </div>
      {showQuota && (
        <Badge variant="secondary" className="text-xs">
          Active
        </Badge>
      )}
    </div>
  );
}