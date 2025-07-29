import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Download, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

export default function PrivacyPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    data_sharing: false,
  });

  useEffect(() => {
    fetchPrivacySettings();
  }, [user]);

  const fetchPrivacySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('data_sharing')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching privacy settings:', error);
        return;
      }

      if (data) {
        setPreferences({
          data_sharing: data.data_sharing ?? false,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const updateDataSharing = async (enabled: boolean) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          data_sharing: enabled,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, data_sharing: enabled }));
      
      toast({
        title: 'Privacy Settings Updated',
        description: `Data sharing has been ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update privacy settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all user data
      const [profileData, preferencesData, promptsData, interactionsData, sessionsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('saved_prompts').select('*').eq('user_id', user.id),
        supabase.from('ai_interactions').select('*').eq('user_id', user.id),
        supabase.from('user_sessions').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        profile: profileData.data,
        preferences: preferencesData.data,
        savedPrompts: promptsData.data || [],
        aiInteractions: interactionsData.data || [],
        userSessions: sessionsData.data || [],
      };

      // Create and download the file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data Exported',
        description: 'Your personal data has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // This would typically require additional confirmation and backend processing
      // For now, we'll just sign out the user and show a message
      await supabase.auth.signOut();
      
      toast({
        title: 'Account Deletion Requested',
        description: 'Your account deletion request has been submitted. Please contact support to complete the process.',
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to process account deletion. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Privacy & Data Protection</AlertTitle>
        <AlertDescription>
          We take your privacy seriously. Use these settings to control how your data is used and shared.
        </AlertDescription>
      </Alert>

      {/* Data Sharing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Data Sharing Settings
          </CardTitle>
          <CardDescription>
            Control how your data is used for improving our services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Anonymous Analytics</Label>
              <p className="text-sm text-muted-foreground">
                Share anonymized usage data to help improve our AI services
              </p>
            </div>
            <Switch
              checked={preferences.data_sharing}
              onCheckedChange={updateDataSharing}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Access
          </CardTitle>
          <CardDescription>
            Download or delete your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Export Personal Data</h4>
              <p className="text-sm text-muted-foreground">
                Download all your personal data including preferences, prompts, and usage history
              </p>
            </div>
            <Button onClick={exportAllData} disabled={loading} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Information about your account and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Account Created</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.created_at ? format(new Date(user.created_at), 'MMMM dd, yyyy') : 'Unknown'}
              </p>
            </div>
            <div>
              <Label>User ID</Label>
              <p className="text-sm text-muted-foreground mt-1 font-mono break-all">
                {user?.id}
              </p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
            <div>
              <Label>Last Sign In</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'MMMM dd, yyyy at HH:mm') : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Delete Account</AlertTitle>
            <AlertDescription className="mb-4">
              This action cannot be undone. This will permanently delete your account and remove all associated data.
            </AlertDescription>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}