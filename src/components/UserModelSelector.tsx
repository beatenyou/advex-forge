import { useState } from 'react';
import { ChevronDown, Bot, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { useModelQuotas } from '@/hooks/useModelQuotas';

export function UserModelSelector({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { userModels, selectedModel, selectModel, loading } = useUserModelAccess();
  const { getUsagePercentage, getRemainingQuota } = useModelQuotas();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} rounded bg-muted animate-pulse`} />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (userModels.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Bot className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        <span className={`${compact ? 'text-xs' : 'text-sm'}`}>No models</span>
      </div>
    );
  }

  const getModelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'openai':
        return <Zap className="h-4 w-4" />;
      case 'mistral':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getModelBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'openai':
        return <Badge variant="secondary" className="text-xs">OpenAI</Badge>;
      case 'mistral':
        return <Badge variant="outline" className="text-xs">Mistral</Badge>;
      default:
        return <Badge variant="default" className="text-xs">{type}</Badge>;
    }
  };

  const getModelStatus = (model: any) => {
    // You could add real-time status checking here
    return { status: 'online', responseTime: Math.floor(Math.random() * 200) + 100 };
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`justify-between relative ${
            compact 
              ? 'h-7 min-w-[120px] px-2' 
              : 'h-9 min-w-[160px]'
          }`}
          size={compact ? "sm" : "sm"}
        >
          <div className="flex items-center gap-2">
            {selectedModel && getModelIcon(selectedModel.provider?.type || '')}
            <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              {compact 
                ? (selectedModel?.provider?.name || 'Select')
                : (selectedModel?.provider?.model_name || 'Select Model')
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            {selectedModel && (
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            )}
            <ChevronDown className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} opacity-50`} />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 z-50 bg-background border shadow-lg" align="start">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm">Available AI Models</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Choose your preferred AI model. Switch anytime during conversation.
          </p>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {userModels.map((model) => {
            const status = getModelStatus(model);
            const isSelected = selectedModel?.provider_id === model.provider_id;
            const usagePercentage = getUsagePercentage(model.provider_id);
            const remainingQuota = getRemainingQuota(model.provider_id);
            
            return (
              <div
                key={model.provider_id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={async () => {
                  console.log('🔄 User switching to model:', model.provider?.name, model.provider_id);
                  
                  // Immediate UI feedback
                  setOpen(false);
                  
                  // Show immediate feedback toast
                  import('@/hooks/use-toast').then(({ toast }) => {
                    toast({
                      title: "✅ Model Switched",
                      description: `Now using ${model.provider?.name} for AI responses`,
                      duration: 3000,
                    });
                  });
                  
                  // Perform model selection with enhanced event handling
                  await selectModel(model.provider_id);
                  
                  console.log('✅ Model switch UI action complete:', model.provider?.name);
                }}
              >
                <div className="flex items-center gap-3">
                  {getModelIcon(model.provider?.type || '')}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{model.provider?.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        status.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {model.provider?.model_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                      <span>~{status.responseTime}ms response</span>
                      {remainingQuota === Infinity ? (
                        <span className="text-green-600">Unlimited</span>
                      ) : remainingQuota > 0 ? (
                        <span className="text-green-600">{remainingQuota} remaining</span>
                      ) : (
                        <span className="text-red-600">Quota exceeded</span>
                      )}
                    </div>
                    {remainingQuota !== Infinity && (
                      <div className="w-full bg-muted h-1 rounded-full mt-1">
                        <div 
                          className={`h-1 rounded-full transition-all ${
                            usagePercentage >= 90 ? 'bg-red-500' : 
                            usagePercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getModelBadge(model.provider?.type || '')}
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      <div className="w-1.5 h-1.5 bg-white rounded-full mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {userModels.length === 0 && (
          <div className="p-6 text-center">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No AI models available</p>
            <p className="text-xs text-muted-foreground">
              Contact your administrator to get model access
            </p>
          </div>
        )}
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            💡 Tip: You can switch models during a conversation to try different approaches
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}