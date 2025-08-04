import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, TestTube, Star, Key, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  primary_provider_id: string | null;
  secondary_provider_id: string | null;
  default_user_primary_model_id?: string | null;
  default_user_secondary_model_id?: string | null;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  is_enabled: boolean;
  failover_enabled: boolean;
  request_timeout_seconds: number;
}

const AIProviderManager = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  
  // Secret management state
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [secretName, setSecretName] = useState('');
  const [secretValue, setSecretValue] = useState('');
  const [showSecretValue, setShowSecretValue] = useState(false);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);

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
      
      // Ensure config has all required fields with defaults
      const configData = configResult.data;
      setConfig({
        ...configData,
        primary_provider_id: configData.primary_provider_id ?? configData.default_provider_id ?? null,
        secondary_provider_id: configData.secondary_provider_id ?? null,
        failover_enabled: configData.failover_enabled ?? true,
        request_timeout_seconds: configData.request_timeout_seconds ?? 30
      });
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
      // Use the new admin function to update defaults and clear user preferences
      const { error: adminError } = await supabase.rpc('admin_update_default_provider', {
        new_primary_model_id: config.default_user_primary_model_id,
        new_secondary_model_id: config.default_user_secondary_model_id
      });

      if (adminError) throw adminError;

      // Update other config settings normally
      const { error } = await supabase
        .from('ai_chat_config')
        .update({
          system_prompt: config.system_prompt,
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          is_enabled: config.is_enabled,
          primary_provider_id: config.primary_provider_id,
          secondary_provider_id: config.secondary_provider_id,
          default_user_primary_model_id: config.default_user_primary_model_id,
          default_user_secondary_model_id: config.default_user_secondary_model_id,
          failover_enabled: config.failover_enabled,
          request_timeout_seconds: config.request_timeout_seconds
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
        description: `Provider responded: ${data.message?.substring(0, 100)}...`,
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

  // Secret management functions
  const handleSaveSecret = async () => {
    if (!secretName.trim() || !secretValue.trim()) {
      toast({
        title: "Validation Error",
        description: "Secret name and value are required",
        variant: "destructive",
      });
      return;
    }

    // Validate secret name format
    const secretNamePattern = /^[A-Z_]+$/;
    if (!secretNamePattern.test(secretName)) {
      toast({
        title: "Validation Error",
        description: "Secret name should be in UPPERCASE_SNAKE_CASE format (e.g., MISTRAL_API_KEY)",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use Supabase Edge Function to manage secrets securely
      const { error } = await supabase.functions.invoke('manage-secrets', {
        body: {
          action: editingSecret ? 'update' : 'create',
          secretName,
          secretValue
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Secret ${editingSecret ? 'updated' : 'created'} successfully`,
      });

      setShowSecretDialog(false);
      setSecretName('');
      setSecretValue('');
      setEditingSecret(null);
    } catch (error) {
      console.error('Error managing secret:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingSecret ? 'update' : 'create'} secret. Use Supabase dashboard to manage secrets.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSecret = async (name: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-secrets', {
        body: {
          action: 'delete',
          secretName: name
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Secret deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting secret:', error);
      toast({
        title: "Error",
        description: "Failed to delete secret. Use Supabase dashboard to manage secrets.",
        variant: "destructive",
      });
    }
  };

  const openSecretDialog = (name?: string) => {
    if (name) {
      setEditingSecret(name);
      setSecretName(name);
      setSecretValue('');
    } else {
      setEditingSecret(null);
      setSecretName('');
      setSecretValue('');
    }
    setShowSecretDialog(true);
  };

  if (loading) {
    return <div>Loading AI providers...</div>;
  }

  return (
    <div className="space-y-6">{/* removed p-6 to match other tabs */}
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

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Admin Providers</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-provider">Primary Provider</Label>
                    <Select 
                      value={config.primary_provider_id || config.default_provider_id || 'none'} 
                      onValueChange={(value) => setConfig({ ...config, primary_provider_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No primary provider</SelectItem>
                        {providers.filter(p => p.is_active).map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} ({provider.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-provider">Secondary Provider (Fallback)</Label>
                    <Select 
                      value={config.secondary_provider_id || 'none'} 
                      onValueChange={(value) => setConfig({ ...config, secondary_provider_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select secondary provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No secondary provider</SelectItem>
                        {providers.filter(p => p.is_active && p.id !== (config.primary_provider_id || config.default_provider_id)).map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} ({provider.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Default User Models</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Select the 2 models that new users will automatically get access to
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-primary-model">User Primary Model</Label>
                    <Select 
                      value={config.default_user_primary_model_id || 'none'} 
                      onValueChange={(value) => setConfig({ ...config, default_user_primary_model_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user primary model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No primary model</SelectItem>
                        {providers.filter(p => p.is_active).map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} - {provider.model_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-secondary-model">User Secondary Model</Label>
                    <Select 
                      value={config.default_user_secondary_model_id || 'none'} 
                      onValueChange={(value) => setConfig({ ...config, default_user_secondary_model_id: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user secondary model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No secondary model</SelectItem>
                        {providers.filter(p => p.is_active && p.id !== config.default_user_primary_model_id).map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} - {provider.model_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="request-timeout">Request Timeout (seconds)</Label>
                <Input
                  id="request-timeout"
                  type="number"
                  value={config.request_timeout_seconds ?? 30}
                  onChange={(e) => setConfig({ ...config, request_timeout_seconds: parseInt(e.target.value) })}
                  min="10"
                  max="300"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="failover-enabled"
                  checked={config.failover_enabled ?? true}
                  onCheckedChange={(checked) => setConfig({ ...config, failover_enabled: checked })}
                />
                <Label htmlFor="failover-enabled">Enable Failover</Label>
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

      {/* API Secret Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Secret Management
          </CardTitle>
          <CardDescription>Manage your API keys securely in Supabase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {/* Existing secrets display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">OPENAI_API_KEY</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openSecretDialog('OPENAI_API_KEY')}>
                    <Edit className="w-3 h-3" />
                    Update
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteSecret('OPENAI_API_KEY')}>
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">MISTRAL_API_KEY</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openSecretDialog('MISTRAL_API_KEY')}>
                    <Edit className="w-3 h-3" />
                    Update
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteSecret('MISTRAL_API_KEY')}>
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <Button onClick={() => openSecretDialog()} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add New API Secret
          </Button>
          
          <p className="text-xs text-muted-foreground">
            For security, secret values are managed through Supabase. You can update or add new secrets here, 
            or use the <a href="https://supabase.com/dashboard/project/csknxtzjfdqoaoforrfm/settings/functions" 
            target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase dashboard</a>.
          </p>
        </CardContent>
      </Card>

      {/* Secret Management Dialog */}
      <Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSecret ? 'Update API Secret' : 'Add New API Secret'}</DialogTitle>
            <DialogDescription>
              {editingSecret ? 'Update the value for this API secret' : 'Add a new API secret to use with your providers'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret-name">Secret Name *</Label>
              <Input
                id="secret-name"
                value={secretName}
                onChange={(e) => setSecretName(e.target.value.toUpperCase())}
                placeholder="e.g., MISTRAL_API_KEY"
                disabled={!!editingSecret}
              />
              <p className="text-xs text-muted-foreground">Must be in UPPERCASE_SNAKE_CASE format</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secret-value">Secret Value *</Label>
              <div className="relative">
                <Input
                  id="secret-value"
                  type={showSecretValue ? "text" : "password"}
                  value={secretValue}
                  onChange={(e) => setSecretValue(e.target.value)}
                  placeholder="Enter your API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSecretValue(!showSecretValue)}
                >
                  {showSecretValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {editingSecret ? 'Enter the new value for this secret' : 'Your API key will be stored securely'}
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveSecret} className="flex-1">
                {editingSecret ? 'Update Secret' : 'Add Secret'}
              </Button>
              <Button variant="outline" onClick={() => setShowSecretDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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