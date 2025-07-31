import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bot, Zap, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { useModelQuotas } from '@/hooks/useModelQuotas';
import { useToast } from '@/hooks/use-toast';

export function AIModelPreferences() {
  const { userModels, selectedModelId, selectedModel, selectModel, refreshModels, loading } = useUserModelAccess();
  const { modelUsages, getUsagePercentage, getRemainingQuota, refreshUsages } = useModelQuotas();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const getModelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'openai':
        return <Zap className="h-5 w-5" />;
      case 'mistral':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
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

  const handleModelChange = (providerId: string) => {
    selectModel(providerId);
    toast({
      title: "Model Updated",
      description: "Your preferred AI model has been updated successfully.",
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshModels(), refreshUsages()]);
      toast({
        title: "Refreshed",
        description: "Model data has been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh model data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Model Settings
          </CardTitle>
          <CardDescription>
            Manage your AI model preferences and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userModels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Model Settings
          </CardTitle>
          <CardDescription>
            Manage your AI model preferences and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No AI models are currently available to you. Contact your administrator to get model access.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Model Settings
          </CardTitle>
          <CardDescription>
            Choose your preferred AI model and monitor usage
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-3">Available AI Models</h4>
          <RadioGroup 
            value={selectedModelId || ''} 
            onValueChange={handleModelChange}
            className="space-y-4"
          >
            {userModels.map((model) => {
              const usagePercentage = getUsagePercentage(model.provider_id);
              const remainingQuota = getRemainingQuota(model.provider_id);
              const isSelected = selectedModelId === model.provider_id;
              
              return (
                <div
                  key={model.provider_id}
                  className={`relative rounded-lg border p-4 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={model.provider_id} 
                      id={model.provider_id}
                      className="mt-1"
                    />
                    <Label 
                      htmlFor={model.provider_id} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getModelIcon(model.provider?.type || '')}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.provider?.name}</span>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {model.provider?.model_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getModelBadge(model.provider?.type || '')}
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        </div>
                      </div>
                      
                      {/* Usage Information */}
                      <div className="mt-3 space-y-2">
                        {remainingQuota !== Infinity && remainingQuota > 0 && (
                          <div className="flex justify-end text-sm mb-1">
                            <span className="text-green-600">{remainingQuota} remaining</span>
                          </div>
                        )}
                        {remainingQuota !== Infinity && remainingQuota <= 0 && (
                          <div className="flex justify-end text-sm mb-1">
                            <span className="text-red-600">Quota exceeded</span>
                          </div>
                        )}
                        
                        {remainingQuota !== Infinity && (
                          <div className="space-y-1">
                            <Progress 
                              value={Math.min(usagePercentage, 100)} 
                              className="h-2"
                            />
                            <div className="text-xs text-muted-foreground">
                              {usagePercentage.toFixed(1)}% used
                            </div>
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {selectedModel && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Current Selection</h4>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {getModelIcon(selectedModel.provider?.type || '')}
              <div>
                <div className="font-medium">{selectedModel.provider?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedModel.provider?.model_name}
                </div>
              </div>
              <div className="ml-auto">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
        )}
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can switch models at any time during a conversation. Different models may have varying capabilities and response times.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}