import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Save, Shield, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SecurityPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    fetchActivityLog();
    fetchUserSessions();
  }, [user]);

  const fetchActivityLog = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivityLog(data || []);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    }
  };

  const fetchUserSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      // Log the password change activity
      await supabase.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: 'password_change',
        description: 'Password changed successfully',
      });

      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
      });

      form.reset();
      fetchActivityLog();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error',
        description: 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const signOutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({
        title: 'Signed Out',
        description: 'You have been signed out from all devices.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out from all devices.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPasswords ? 'text' : 'password'}
                          placeholder="Enter current password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="Enter new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active sessions across different devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Session from {format(new Date(session.created_at), 'MMM dd, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.user_agent || 'Unknown device'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      IP: {session.ip_address || 'Unknown'}
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No active sessions found.</p>
            )}
            
            <div className="pt-4">
              <Button variant="outline" onClick={signOutAllDevices}>
                <Shield className="w-4 h-4 mr-2" />
                Sign Out All Devices
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Activity</CardTitle>
          <CardDescription>
            Recent security-related activities on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityLog.length > 0 ? (
              activityLog.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.activity_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM dd, yyyy at HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No security activities recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}