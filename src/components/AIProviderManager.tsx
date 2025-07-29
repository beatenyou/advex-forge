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
import { AIStatusIndicator } from '@/components/AIStatusIndicator';

interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'mistral';
  api_key_secret_name: string;
  base_url: string | null;
  model_name: string;
  is_active: boolean;
  created_at: string;
  agent_id?: string | null;
  agent_name?: string | null;
  agent_description?: string | null;
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
    model_name: '',
    agent_id: '',
    agent_name: '',
    agent_description: ''
  });

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editProvider, setEditProvider] = useState({
    name: '',
    type: 'openai' as 'openai' | 'mistral',
    api_key_secret_name: '',
    base_url: '',
    model_name: '',
    agent_id: '',
    agent_name: '',
    agent_description: ''
  });

  // Model suggestions based on provider type
  const getModelSuggestions = (type: 'openai' | 'mistral') => {
    if (type === 'openai') {
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
    } else {
      return ['mistral-large-latest', 'mistral-small-latest', 'mistral-medium-latest'];
    }
  };

  // Validation functions
  const validateProvider = (provider: typeof newProvider) => {
    const errors: string[] = [];
    
    if (!provider.name.trim()) errors.push('Provider name is required');
    if (!provider.api_key_secret_name.trim()) errors.push('API key secret name is required');
    if (!provider.model_name.trim()) errors.push('Model name is required');
    
    // Validate API key secret name format
    const secretNamePattern = /^[A-Z_]+$/;
    if (provider.api_key_secret_name && !secretNamePattern.test(provider.api_key_secret_name)) {
      errors.push('API key secret name should be in UPPERCASE_SNAKE_CASE format (e.g., OPENAI_API_KEY)');
    }
    
    // Validate base URL if provided
    if (provider.base_url && provider.base_url.trim()) {
      try {
        new URL(provider.base_url);
      } catch {
        errors.push('Base URL must be a valid URL');
      }
    }
    
    return errors;
  };

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
    const errors = validateProvider(newProvider);
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from('ai_providers').insert([{
        ...newProvider,
        base_url: newProvider.base_url || null,
        agent_id: newProvider.agent_id || null,
        agent_name: newProvider.agent_name || null,
        agent_description: newProvider.agent_description || null
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
        model_name: '',
        agent_id: '',
        agent_name: '',
        agent_description: ''
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

  const handleEditProvider = async () => {
    if (!editingProvider) return;

    const errors = validateProvider(editProvider);
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({
          ...editProvider,
          base_url: editProvider.base_url || null,
          agent_id: editProvider.agent_id || null,
          agent_name: editProvider.agent_name || null,
          agent_description: editProvider.agent_description || null
        })
        .eq('id', editingProvider.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI provider updated successfully",
      });

      setShowEditDialog(false);
      setEditingProvider(null);
      fetchData();
    } catch (error) {
      console.error('Error updating provider:', error);
      toast({
        title: "Error",
        description: "Failed to update AI provider",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (provider: AIProvider) => {
    setEditingProvider(provider);
    setEditProvider({
      name: provider.name,
      type: provider.type,
      api_key_secret_name: provider.api_key_secret_name,
      base_url: provider.base_url || '',
      model_name: provider.model_name,
      agent_id: provider.agent_id || '',
      agent_name: provider.agent_name || '',
      agent_description: provider.agent_description || ''
    });
    setShowEditDialog(true);
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

      {/* AI System Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">AI System Status</h4>
              <p className="text-xs text-muted-foreground">Current operational status of the AI chat system</p>
            </div>
            <AIStatusIndicator showLabel size="lg" />
          </div>
        </CardContent>
      </Card>

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add AI Provider</DialogTitle>
              <DialogDescription>Configure a new AI provider for the chat system</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Provider Name *</Label>
                  <Input
                    id="name"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                    placeholder="e.g., OpenAI GPT-4o or Mistral Large"
                  />
                  <p className="text-xs text-muted-foreground">A descriptive name for this provider</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Provider Type *</Label>
                  <Select value={newProvider.type} onValueChange={(value: 'openai' | 'mistral') => 
                    setNewProvider({...newProvider, type: value, model_name: ''})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* API Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">API Configuration</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key Secret Name *</Label>
                  <Select value={newProvider.api_key_secret_name} onValueChange={(value) => 
                    setNewProvider({...newProvider, api_key_secret_name: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={newProvider.type === 'openai' ? 'OPENAI_API_KEY' : 'MISTRAL_API_KEY'} />
                    </SelectTrigger>
                    <SelectContent>
                      {newProvider.type === 'openai' && <SelectItem value="OPENAI_API_KEY">OPENAI_API_KEY</SelectItem>}
                      {newProvider.type === 'mistral' && <SelectItem value="MISTRAL_API_KEY">MISTRAL_API_KEY</SelectItem>}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Reference to the secret name configured in Supabase (UPPERCASE_SNAKE_CASE)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model Name *</Label>
                  <Select value={newProvider.model_name} onValueChange={(value) => 
                    setNewProvider({...newProvider, model_name: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select a ${newProvider.type} model`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelSuggestions(newProvider.type).map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newProvider.model_name}
                    onChange={(e) => setNewProvider({...newProvider, model_name: e.target.value})}
                    placeholder="Or enter a custom model name"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground">Select from common models or enter a custom model name</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-url">Base URL (Optional)</Label>
                  <Input
                    id="base-url"
                    value={newProvider.base_url}
                    onChange={(e) => setNewProvider({...newProvider, base_url: e.target.value})}
                    placeholder="https://api.openai.com/v1 (leave empty for default)"
                  />
                  <p className="text-xs text-muted-foreground">Custom API endpoint URL. Leave empty to use the default endpoint.</p>
                </div>
              </div>

              {/* Mistral Agent Configuration */}
              {newProvider.type === 'mistral' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Mistral Agent Configuration (Optional)</h4>
                  <p className="text-xs text-muted-foreground">
                    Configure a Mistral Agent ID to use specialized agents with built-in tools and instructions.
                    Leave empty to use standard chat completions.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="agent-id">Agent ID</Label>
                    <Input
                      id="agent-id"
                      value={newProvider.agent_id}
                      onChange={(e) => setNewProvider({...newProvider, agent_id: e.target.value})}
                      placeholder="ag_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <p className="text-xs text-muted-foreground">Your Mistral Agent ID (e.g., ag_0684fe0e0b98773e8000323fc71a3986)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input
                      id="agent-name"
                      value={newProvider.agent_name}
                      onChange={(e) => setNewProvider({...newProvider, agent_name: e.target.value})}
                      placeholder="e.g., Web Search Agent"
                    />
                    <p className="text-xs text-muted-foreground">Display name for the agent</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-description">Agent Description</Label>
                    <Textarea
                      id="agent-description"
                      value={newProvider.agent_description}
                      onChange={(e) => setNewProvider({...newProvider, agent_description: e.target.value})}
                      placeholder="e.g., Agent able to search information over the web"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">Description of what the agent does</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddProvider} className="flex-1">Add Provider</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              </div>
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
                  {provider.agent_id && (
                    <div className="mt-2 p-2 bg-muted/30 rounded border">
                      <p className="text-sm font-medium text-foreground">Mistral Agent</p>
                      <p className="text-xs text-muted-foreground">ID: {provider.agent_id}</p>
                      {provider.agent_name && <p className="text-xs text-muted-foreground">Name: {provider.agent_name}</p>}
                      {provider.agent_description && <p className="text-xs text-muted-foreground">Description: {provider.agent_description}</p>}
                    </div>
                  )}
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
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(provider)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
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

      {/* Edit Provider Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit AI Provider</DialogTitle>
            <DialogDescription>Update the configuration for this AI provider</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">Provider Name *</Label>
                <Input
                  id="edit-name"
                  value={editProvider.name}
                  onChange={(e) => setEditProvider({...editProvider, name: e.target.value})}
                  placeholder="e.g., OpenAI GPT-4o or Mistral Large"
                />
                <p className="text-xs text-muted-foreground">A descriptive name for this provider</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-type">Provider Type *</Label>
                <Select value={editProvider.type} onValueChange={(value: 'openai' | 'mistral') => 
                  setEditProvider({...editProvider, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="mistral">Mistral AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* API Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">API Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="edit-api-key">API Key Secret Name *</Label>
                <Select value={editProvider.api_key_secret_name} onValueChange={(value) => 
                  setEditProvider({...editProvider, api_key_secret_name: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={editProvider.type === 'openai' ? 'OPENAI_API_KEY' : 'MISTRAL_API_KEY'} />
                  </SelectTrigger>
                  <SelectContent>
                    {editProvider.type === 'openai' && <SelectItem value="OPENAI_API_KEY">OPENAI_API_KEY</SelectItem>}
                    {editProvider.type === 'mistral' && <SelectItem value="MISTRAL_API_KEY">MISTRAL_API_KEY</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Reference to the secret name configured in Supabase (UPPERCASE_SNAKE_CASE)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-model">Model Name *</Label>
                <Select value={editProvider.model_name} onValueChange={(value) => 
                  setEditProvider({...editProvider, model_name: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${editProvider.type} model`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelSuggestions(editProvider.type).map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={editProvider.model_name}
                  onChange={(e) => setEditProvider({...editProvider, model_name: e.target.value})}
                  placeholder="Or enter a custom model name"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">Select from common models or enter a custom model name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-base-url">Base URL (Optional)</Label>
                <Input
                  id="edit-base-url"
                  value={editProvider.base_url}
                  onChange={(e) => setEditProvider({...editProvider, base_url: e.target.value})}
                  placeholder="https://api.openai.com/v1 (leave empty for default)"
                />
                <p className="text-xs text-muted-foreground">Custom API endpoint URL. Leave empty to use the default endpoint.</p>
              </div>
              </div>

              {/* Mistral Agent Configuration */}
              {editProvider.type === 'mistral' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Mistral Agent Configuration (Optional)</h4>
                  <p className="text-xs text-muted-foreground">
                    Configure a Mistral Agent ID to use specialized agents with built-in tools and instructions.
                    Leave empty to use standard chat completions.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-agent-id">Agent ID</Label>
                    <Input
                      id="edit-agent-id"
                      value={editProvider.agent_id}
                      onChange={(e) => setEditProvider({...editProvider, agent_id: e.target.value})}
                      placeholder="ag_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <p className="text-xs text-muted-foreground">Your Mistral Agent ID (e.g., ag_0684fe0e0b98773e8000323fc71a3986)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-agent-name">Agent Name</Label>
                    <Input
                      id="edit-agent-name"
                      value={editProvider.agent_name}
                      onChange={(e) => setEditProvider({...editProvider, agent_name: e.target.value})}
                      placeholder="e.g., Web Search Agent"
                    />
                    <p className="text-xs text-muted-foreground">Display name for the agent</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-agent-description">Agent Description</Label>
                    <Textarea
                      id="edit-agent-description"
                      value={editProvider.agent_description}
                      onChange={(e) => setEditProvider({...editProvider, agent_description: e.target.value})}
                      placeholder="e.g., Agent able to search information over the web"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">Description of what the agent does</p>
                  </div>
                </div>
              )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleEditProvider} className="flex-1">Update Provider</Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIProviderManager;