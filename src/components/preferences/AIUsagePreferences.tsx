import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Brain, Save, Plus, Trash2, Star, Download, BarChart, StarOff, Shield, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { useModelQuotas } from '@/hooks/useModelQuotas';

const promptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  prompt_text: z.string().min(1, 'Prompt text is required'),
  category: z.string().default('General'),
});

type PromptFormData = z.infer<typeof promptSchema>;

interface SavedPrompt {
  id: string;
  title: string;
  prompt_text: string;
  category: string;
  is_favorite: boolean;
  created_at: string;
}

interface AIInteraction {
  id: string;
  created_at: string;
  tokens_used: number;
  provider_name: string;
  success: boolean;
}

export default function AIUsagePreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { userModels, selectedModelId, loading: modelsLoading } = useUserModelAccess();
  const { modelUsages, getUsagePercentage, getRemainingQuota } = useModelQuotas();
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [aiInteractions, setAiInteractions] = useState<AIInteraction[]>([]);
  const [usageStats, setUsageStats] = useState({
    totalTokens: 0,
    totalInteractions: 0,
    successRate: 0,
    currentQuota: 0,
    quotaLimit: 1000,
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      title: '',
      prompt_text: '',
      category: 'General',
    },
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch saved prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('saved_prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (promptsError) throw promptsError;
      setSavedPrompts(promptsData || []);

      // Fetch AI interactions
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('ai_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (interactionsError && interactionsError.code !== 'PGRST116') {
        console.error('Error fetching interactions:', interactionsError);
      } else {
        setAiInteractions(interactionsData || []);

        // Calculate usage stats
        const totalTokens = interactionsData?.reduce((sum, interaction) => sum + (interaction.tokens_used || 0), 0) || 0;
        const totalInteractions = interactionsData?.length || 0;
        const successfulInteractions = interactionsData?.filter(i => i.success).length || 0;
        const successRate = totalInteractions > 0 ? (successfulInteractions / totalInteractions) * 100 : 0;

        setUsageStats(prev => ({
          ...prev,
          totalTokens,
          totalInteractions,
          successRate,
        }));
      }

      // Fetch current quota from user billing
      const { data: billingData, error: billingError } = await supabase
        .from('user_billing')
        .select('ai_usage_current, ai_quota_limit')
        .eq('user_id', user.id)
        .maybeSingle();

      if (billingError && billingError.code !== 'PGRST116') {
        console.error('Error fetching billing:', billingError);
      } else if (billingData) {
        setUsageStats(prev => ({
          ...prev,
          currentQuota: billingData.ai_usage_current,
          quotaLimit: billingData.ai_quota_limit,
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const onSubmit = async (data: PromptFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_prompts')
        .insert({
          user_id: user.id,
          title: data.title,
          prompt_text: data.prompt_text,
          category: data.category,
        });

      if (error) throw error;

      toast({
        title: 'Prompt Saved',
        description: 'Your prompt has been saved successfully.',
      });

      form.reset();
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to save prompt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('saved_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: 'Prompt Deleted',
        description: 'The prompt has been deleted.',
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete prompt.',
        variant: 'destructive',
      });
    }
  };

  const toggleFavorite = async (promptId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_prompts')
        .update({ is_favorite: !isFavorite })
        .eq('id', promptId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const clearAllFavorites = async () => {
    try {
      const { error } = await supabase
        .from('saved_prompts')
        .update({ is_favorite: false })
        .eq('user_id', user?.id)
        .eq('is_favorite', true);

      if (error) throw error;

      toast({
        title: 'Favorites Cleared',
        description: 'All favorite prompts have been removed from favorites.',
      });

      fetchData();
    } catch (error) {
      console.error('Error clearing favorites:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear favorites.',
        variant: 'destructive',
      });
    }
  };

  const exportData = () => {
    const data = {
      savedPrompts,
      aiInteractions,
      usageStats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-usage-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Data Exported',
      description: 'Your AI usage data has been downloaded.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            AI Usage Statistics
          </CardTitle>
          <CardDescription>
            Your AI interaction statistics and quota usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{usageStats.totalInteractions}</div>
              <div className="text-sm text-muted-foreground">Total Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{usageStats.totalTokens.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Tokens Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{usageStats.successRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{savedPrompts.length}</div>
              <div className="text-sm text-muted-foreground">Saved Prompts</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Monthly Quota</span>
              <span>
                {usageStats.currentQuota.toLocaleString()} / {usageStats.quotaLimit.toLocaleString()}
              </span>
            </div>
            <Progress value={(usageStats.currentQuota / usageStats.quotaLimit) * 100} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Model Access Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Model Access Overview
          </CardTitle>
          <CardDescription>
            Your AI model access permissions and usage details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modelsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userModels.length > 0 ? (
            <div className="space-y-4">
              {userModels.map((model) => {
                const usage = modelUsages.find(u => u.provider_id === model.provider_id);
                const usagePercentage = usage ? getUsagePercentage(model.provider_id) : 0;
                const remainingQuota = usage ? getRemainingQuota(model.provider_id) : 0;
                
                return (
                  <div key={model.provider_id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{model.provider?.name || 'Unknown Model'}</h4>
                          {selectedModelId === model.provider_id && (
                            <Badge variant="default">Current</Badge>
                          )}
                          <Badge variant="secondary">{model.provider?.type || 'Unknown'}</Badge>
                        </div>
                        
                        {usage && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Usage</span>
                              <span>
                                {usage.current_usage.toLocaleString()} 
                                {usage.usage_limit ? ` / ${usage.usage_limit.toLocaleString()}` : ' (Unlimited)'}
                              </span>
                            </div>
                            {usage.usage_limit && (
                              <div className="space-y-1">
                                <Progress value={usagePercentage} className="w-full" />
                                <div className="text-xs text-muted-foreground">
                                  {remainingQuota} requests remaining
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Access granted {format(new Date(model.granted_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No model access found.</p>
              <p className="text-sm">Contact an administrator to request model access.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Saved Prompts
            </div>
            <div className="flex items-center gap-2">
              {savedPrompts.some(prompt => prompt.is_favorite) && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={clearAllFavorites}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <StarOff className="w-4 h-4 mr-2" />
                  Clear Favorites
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Prompt
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save New Prompt</DialogTitle>
                    <DialogDescription>
                      Save a frequently used prompt for quick access
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter prompt title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Writing, Coding, Analysis" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="prompt_text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prompt Text</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter your prompt text..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Saving...' : 'Save Prompt'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
          <CardDescription>
            Manage your saved prompts for quick reuse. {savedPrompts.filter(p => p.is_favorite).length > 0 && `${savedPrompts.filter(p => p.is_favorite).length} favorite(s) saved.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savedPrompts.length > 0 ? (
            <div className="space-y-4">
              {savedPrompts.map((prompt) => (
                <div key={prompt.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{prompt.title}</h4>
                        <Badge variant="secondary">{prompt.category}</Badge>
                        {prompt.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {prompt.prompt_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(prompt.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleFavorite(prompt.id, prompt.is_favorite)}
                      >
                        <Star className={`w-4 h-4 ${prompt.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePrompt(prompt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No saved prompts yet.</p>
              <p className="text-sm">Save your frequently used prompts for quick access.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download your AI usage history and saved prompts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export AI Usage Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}