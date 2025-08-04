import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const ProviderSyncButton = ({ onSync }: { onSync?: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSyncToAdminDefault = async () => {
    if (!user) return;

    try {
      // Get admin default
      const { data: configData, error: configError } = await supabase
        .from('ai_chat_config')
        .select('default_user_primary_model_id')
        .single();

      if (configError || !configData?.default_user_primary_model_id) {
        throw new Error('No admin default configured');
      }

      // Update user preference to admin default
      const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          selected_model_id: configData.default_user_primary_model_id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      // Ensure user has access to the admin default model
      const { error: accessError } = await supabase
        .from('user_model_access')
        .upsert({
          user_id: user.id,
          provider_id: configData.default_user_primary_model_id,
          granted_by: null,
          is_enabled: true,
          usage_limit: null,
          usage_current: 0
        }, {
          onConflict: 'user_id,provider_id'
        });

      if (accessError) throw accessError;

      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('aiSystemRefresh', {
        detail: { modelId: configData.default_user_primary_model_id }
      }));

      onSync?.();

      toast({
        title: "Provider Synchronized",
        description: "Your AI provider has been synchronized with admin settings."
      });

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with admin default provider.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSyncToAdminDefault}
      className="text-xs"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      Sync to Admin Default
    </Button>
  );
};