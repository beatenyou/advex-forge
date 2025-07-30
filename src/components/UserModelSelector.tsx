import { useState } from 'react';
import { ChevronDown, Bot, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';

export function UserModelSelector() {
  const [open, setOpen] = useState(false);
  const { userModels, selectedModel, selectModel, loading } = useUserModelAccess();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (userModels.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Bot className="h-4 w-4" />
        <span className="text-sm">No models available</span>
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="h-8 justify-between min-w-[140px]"
          size="sm"
        >
          <div className="flex items-center gap-2">
            {selectedModel && getModelIcon(selectedModel.provider?.type || '')}
            <span className="text-sm font-medium">
              {selectedModel?.provider?.model_name || 'Select Model'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Available AI Models</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Choose your preferred AI model for this conversation
          </p>
        </div>
        <div className="p-2">
          {userModels.map((model) => (
            <div
              key={model.provider_id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                selectedModel?.provider_id === model.provider_id
                  ? 'bg-accent'
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                selectModel(model.provider_id);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-3">
                {getModelIcon(model.provider?.type || '')}
                <div>
                  <div className="font-medium text-sm">
                    {model.provider?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {model.provider?.model_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getModelBadge(model.provider?.type || '')}
                {selectedModel?.provider_id === model.provider_id && (
                  <Badge variant="default" className="text-xs">Selected</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        {userModels.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No AI models available
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}