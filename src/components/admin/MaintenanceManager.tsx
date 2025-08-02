import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Eye, Save, Settings } from 'lucide-react';
import { MaintenancePage } from '@/pages/MaintenancePage';

interface MaintenanceData {
  id: string;
  is_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  estimated_completion?: string;
  contact_info?: string;
}

export const MaintenanceManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData>({
    id: '',
    is_enabled: false,
    maintenance_title: 'Site Under Maintenance',
    maintenance_message: 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.',
    estimated_completion: '',
    contact_info: ''
  });

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_maintenance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching maintenance data:', error);
        toast({
          title: "Error",
          description: "Failed to load maintenance settings",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setMaintenanceData({
          ...data,
          estimated_completion: data.estimated_completion 
            ? new Date(data.estimated_completion).toISOString().slice(0, 16)
            : ''
        });
      }
    } catch (error) {
      console.error('Error in maintenance fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updateData = {
        is_enabled: maintenanceData.is_enabled,
        maintenance_title: maintenanceData.maintenance_title,
        maintenance_message: maintenanceData.maintenance_message,
        estimated_completion: maintenanceData.estimated_completion 
          ? new Date(maintenanceData.estimated_completion).toISOString()
          : null,
        contact_info: maintenanceData.contact_info || null,
        created_by: user.id
      };

      const { error } = await supabase
        .from('site_maintenance')
        .upsert(updateData, {
          onConflict: 'id'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Maintenance settings saved successfully"
      });

      fetchMaintenanceData();
    } catch (error) {
      console.error('Error saving maintenance data:', error);
      toast({
        title: "Error",
        description: "Failed to save maintenance settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async () => {
    const newState = !maintenanceData.is_enabled;
    setMaintenanceData(prev => ({ ...prev, is_enabled: newState }));
    
    // Auto-save when toggling
    await handleSave();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading maintenance settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Maintenance Page Preview</h3>
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <Settings className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </div>
        <MaintenancePage
          title={maintenanceData.maintenance_title}
          message={maintenanceData.maintenance_message}
          estimatedCompletion={maintenanceData.estimated_completion}
          contactInfo={maintenanceData.contact_info}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={maintenanceData.is_enabled ? "border-destructive" : "border-border"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {maintenanceData.is_enabled && <AlertTriangle className="w-5 h-5 text-destructive" />}
            Maintenance Mode Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenance-toggle" className="text-base font-medium">
                {maintenanceData.is_enabled ? 'Maintenance Mode Active' : 'Maintenance Mode Disabled'}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {maintenanceData.is_enabled 
                  ? 'Non-admin users are redirected to maintenance page'
                  : 'All users have normal access to the site'
                }
              </p>
            </div>
            <Switch
              id="maintenance-toggle"
              checked={maintenanceData.is_enabled}
              onCheckedChange={handleQuickToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Page Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              value={maintenanceData.maintenance_title}
              onChange={(e) => setMaintenanceData(prev => ({ 
                ...prev, 
                maintenance_title: e.target.value 
              }))}
              placeholder="Site Under Maintenance"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="message">Maintenance Message</Label>
            <Textarea
              id="message"
              value={maintenanceData.maintenance_message}
              onChange={(e) => setMaintenanceData(prev => ({ 
                ...prev, 
                maintenance_message: e.target.value 
              }))}
              placeholder="Describe what maintenance is being performed..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="completion">Estimated Completion (Optional)</Label>
            <Input
              id="completion"
              type="datetime-local"
              value={maintenanceData.estimated_completion}
              onChange={(e) => setMaintenanceData(prev => ({ 
                ...prev, 
                estimated_completion: e.target.value 
              }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contact">Contact Information (Optional)</Label>
            <Input
              id="contact"
              value={maintenanceData.contact_info || ''}
              onChange={(e) => setMaintenanceData(prev => ({ 
                ...prev, 
                contact_info: e.target.value 
              }))}
              placeholder="support@company.com or phone number"
              className="mt-1"
            />
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};