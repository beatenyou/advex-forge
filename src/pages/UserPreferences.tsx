import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { User, Shield, Bell, CreditCard, Brain, Lock, HelpCircle } from 'lucide-react';
import ProfilePreferences from '@/components/preferences/ProfilePreferences';
import SecurityPreferences from '@/components/preferences/SecurityPreferences';
import NotificationPreferences from '@/components/preferences/NotificationPreferences';
import BillingPreferences from '@/components/preferences/BillingPreferences';
import AIUsagePreferences from '@/components/preferences/AIUsagePreferences';
import PrivacyPreferences from '@/components/preferences/PrivacyPreferences';
import SupportPreferences from '@/components/preferences/SupportPreferences';

export default function UserPreferences() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'ai-usage', label: 'AI Usage', icon: Brain },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">User Preferences</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <div className="mt-6">
                <TabsContent value="profile" className="mt-0">
                  <ProfilePreferences />
                </TabsContent>

                <TabsContent value="security" className="mt-0">
                  <SecurityPreferences />
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                  <NotificationPreferences />
                </TabsContent>

                <TabsContent value="billing" className="mt-0">
                  <BillingPreferences />
                </TabsContent>

                <TabsContent value="ai-usage" className="mt-0">
                  <AIUsagePreferences />
                </TabsContent>

                <TabsContent value="privacy" className="mt-0">
                  <PrivacyPreferences />
                </TabsContent>

                <TabsContent value="support" className="mt-0">
                  <SupportPreferences />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}