import { useState, useEffect } from 'react';
import { Bot, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { supabase } from '@/integrations/supabase/client';

interface ModelStatusDisplayProps {
  compact?: boolean;
  showQuota?: boolean;
}

export function ModelStatusDisplay({ compact = false, showQuota = false }: ModelStatusDisplayProps) {
  const { getSelectedModel } = useUserModelAccess();
  const [currentModel, setCurrentModel] = useState(getSelectedModel());

  useEffect(() => {
    // Update display when component mounts or hook changes
    setCurrentModel(getSelectedModel());

    // Listen for real-time user preferences changes (user-specific)
    const preferencesChannel = supabase
      .channel('model-status-display-preferences')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences'
        },
        async (payload) => {
          // Check if this change affects the current user
          const { data: { user } } = await supabase.auth.getUser();
          const { new: newRecord } = payload;
          
          if (user && newRecord?.user_id === user.id && newRecord?.selected_model_id) {
            console.log('🔄 ModelStatusDisplay: Current user model selection changed, updating display');
            
            // Refresh the selected model from the hook immediately
            setCurrentModel(getSelectedModel());
          }
        }
      )
      .subscribe();

    // Listen for broadcast events from database trigger
    const broadcastChannel = supabase
      .channel('model-display-broadcast')
      .on('broadcast', { event: 'model_changed' }, async (payload) => {
        console.log('🔄 ModelStatusDisplay: Received model change broadcast', payload);
        
        // Check if this affects the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user && payload.payload?.user_id === user.id) {
          console.log('📡 ModelStatusDisplay: Broadcast for current user, refreshing');
          setCurrentModel(getSelectedModel());
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(preferencesChannel);
      supabase.removeChannel(broadcastChannel);
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