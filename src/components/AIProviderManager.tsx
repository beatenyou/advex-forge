import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, TestTube, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'mistral';
  api_key_secret_name: string;
  base_url: string | null;
  model_name: string;
  is_active: boolean;
  created_at: string;
}

interface AIConfig {
  id: string;
  default_provider_id: string | null;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  is_enabled: boolean;
}

const AIProviderManager = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [newProvider, setNewProvider] = useState({
    name: '',
    type: 'openai' as 'openai' | 'mistral',
    api_key_secret_name: '',
    base_url: '',
    model_name: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [providersResult, configResult] = await Promise.all([
        supabase.from('ai_providers').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_chat_config').select('*').single()
      ]);

      if (providersResult.error) throw providersResult.error;
      if (configResult.error) throw configResult.error;

      setProviders(providersResult.data as AIProvider[] || []);
      setConfig(configResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load AI providers and configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async () => {
    try {
      const { error } = await supabase.from('ai_providers').insert([{
        ...newProvider,
        base_url: newProvider.base_url || null
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI provider added successfully",
      });

      setShowAddDialog(false);
      setNewProvider({
        name: '',
        type: 'openai',
        api_key_secret_name: '',
        base_url: '',
        model_name: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding provider:', error);
      toast({
        title: "Error",
        description: "Failed to add AI provider",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      const { error } = await supabase.from('ai_providers').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "AI provider deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast({
        title: "Error",
        description: "Failed to delete AI provider",
        variant: "destructive",
      });
    }
  };

  const handleToggleProvider = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Provider ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
      fetchData();
    } catch (error) {
      console.error('Error updating provider:', error);
      toast({
        title: "Error",
        description: "Failed to update provider status",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (providerId: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_config')
        .update({ default_provider_id: providerId })
        .eq('id', config?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default provider updated successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error setting default provider:', error);
      toast({
        title: "Error",
        description: "Failed to set default provider",
        variant: "destructive",
      });
    }
  };

  const handleUpdateConfig = async () => {
    if (!config) return;

    try {
      const { error } = await supabase
        .from('ai_chat_config')
        .update({
          system_prompt: config.system_prompt,
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          is_enabled: config.is_enabled
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI configuration updated successfully",
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-router', {
        body: {
          message: 'Hello, this is a test message. Please respond briefly.',
          providerId
        }
      });

      if (error) throw error;

      toast({
        title: "Test Successful",
        description: `Provider responded: ${data.response?.substring(0, 100)}...`,
      });
    } catch (error) {
      console.error('Error testing provider:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test provider",
        variant: "destructive",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  if (loading) {
    return <div>Loading AI providers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Global Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>AI Chat Configuration</CardTitle>
            <CardDescription>Global settings for AI chat functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="enabled">AI Chat Enabled</Label>
              <input
                type="checkbox"
                id="enabled"
                checked={config.is_enabled}
                onChange={(e) => setConfig({...config, is_enabled: e.target.checked})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.system_prompt}
                onChange={(e) => setConfig({...config, system_prompt: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={config.max_tokens}
                  onChange={(e) => setConfig({...config, max_tokens: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={config.temperature}
                  onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <Button onClick={handleUpdateConfig}>Update Configuration</Button>
          </CardContent>
        </Card>
      )}

      {/* Providers List */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">AI Providers</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Provider</DialogTitle>
              <DialogDescription>Configure a new AI provider for the chat system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Provider Name</Label>
                <Input
                  id="name"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                  placeholder="e.g., OpenAI GPT-4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Provider Type</Label>
                <Select value={newProvider.type} onValueChange={(value: 'openai' | 'mistral') => 
                  setNewProvider({...newProvider, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="mistral">Mistral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key Secret Name</Label>
                <Input
                  id="api-key"
                  value={newProvider.api_key_secret_name}
                  onChange={(e) => setNewProvider({...newProvider, api_key_secret_name: e.target.value})}
                  placeholder="OPENAI_API_KEY or MISTRAL_API_KEY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model Name</Label>
                <Input
                  id="model"
                  value={newProvider.model_name}
                  onChange={(e) => setNewProvider({...newProvider, model_name: e.target.value})}
                  placeholder={newProvider.type === 'openai' ? 'gpt-4o-mini' : 'mistral-large-latest'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL (Optional)</Label>
                <Input
                  id="base-url"
                  value={newProvider.base_url}
                  onChange={(e) => setNewProvider({...newProvider, base_url: e.target.value})}
                  placeholder="Custom API endpoint (optional)"
                />
              </div>

              <Button onClick={handleAddProvider} className="w-full">Add Provider</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{provider.name}</h4>
                    <Badge variant={provider.type === 'openai' ? 'default' : 'secondary'}>
                      {provider.type.toUpperCase()}
                    </Badge>
                    {provider.is_active && <Badge variant="outline">Active</Badge>}
                    {config?.default_provider_id === provider.id && (
                      <Badge variant="default">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Model: {provider.model_name}</p>
                  <p className="text-sm text-muted-foreground">API Key: {provider.api_key_secret_name}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestProvider(provider.id)}
                    disabled={!provider.is_active || testingProvider === provider.id}
                  >
                    <TestTube className="w-4 h-4" />
                    {testingProvider === provider.id ? 'Testing...' : 'Test'}
                  </Button>
                  
                  {provider.is_active && config?.default_provider_id !== provider.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(provider.id)}
                    >
                      <Star className="w-4 h-4" />
                      Set Default
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleProvider(provider.id, provider.is_active)}
                  >
                    {provider.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProvider(provider.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {providers.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No AI providers configured yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add an OpenAI or Mistral provider to enable AI chat functionality.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIProviderManager;