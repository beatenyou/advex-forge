import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedOrganizationManager } from '@/components/enterprise/EnhancedOrganizationManager';
import { EnhancedBulkUserManager } from '@/components/enterprise/EnhancedBulkUserManager';
import { Building2, Users, Settings, BarChart3 } from 'lucide-react';

export default function EnterpriseManagement() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Enterprise Management</h1>
        <p className="text-muted-foreground">
          Manage organizations, users, and enterprise features at scale
        </p>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="bulk-users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          <EnhancedOrganizationManager />
        </TabsContent>

        <TabsContent value="bulk-users" className="space-y-6">
          <EnhancedBulkUserManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Enterprise Analytics</h3>
            <p className="text-muted-foreground">
              Advanced analytics and reporting features will be available here.
              This includes user activity, organization performance, and usage statistics.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Enterprise Settings</h3>
            <p className="text-muted-foreground">
              Configure enterprise-wide settings, security policies, and integrations.
              This includes SSO configuration, security settings, and compliance features.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}