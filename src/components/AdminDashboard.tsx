import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Settings, FileText, Globe, Users, Database, Shield, Target, Rocket, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheatSheetManager } from "@/components/CheatSheetManager";
import { LinkTabsManager } from "@/components/LinkTabsManager";
import { ScenarioManager } from "@/components/ScenarioManager";
import { UserManager } from "@/components/UserManager";
import AIProviderManager from "@/components/AIProviderManager";
import ModelAccessManager from "@/components/admin/ModelAccessManager";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import FAQManager from "@/components/admin/FAQManager";
import SupportTicketManager from "@/components/admin/SupportTicketManager";
import TechniqueManager from "@/components/admin/TechniqueManager";
import { BulkImportManager } from "@/components/admin/BulkImportManager";

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard = ({ onClose }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState("guidance");

  // Show loading state while checking admin status
  if (adminLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user is not admin
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 gap-1 p-2 h-auto">
              <TabsTrigger 
                value="guidance" 
                className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
              >
                Guidance
              </TabsTrigger>
              <TabsTrigger 
                value="cheatsheets" 
                className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
              >
                Cheat Sheets
              </TabsTrigger>
              <TabsTrigger 
                value="linktabs" 
                className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
              >
                Link Tabs
              </TabsTrigger>
              <TabsTrigger 
                value="scenarios" 
                className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
              >
                Scenarios
              </TabsTrigger>
              <TabsTrigger 
                value="techniques" 
                className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
              >
                Technique Management
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
              >
                Users
              </TabsTrigger>
              <TabsTrigger 
                value="ai-providers" 
                className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
              >
                AI Chat
              </TabsTrigger>
              <TabsTrigger 
                value="model-access" 
                className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
              >
                Model Access
              </TabsTrigger>
              <TabsTrigger 
                value="announcements" 
                className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
              >
                Announcements
              </TabsTrigger>
              <TabsTrigger 
                value="faq" 
                className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
              >
                FAQ
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="bg-secondary/10 hover:bg-secondary/20 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-xs px-2 py-2"
              >
                Support
              </TabsTrigger>
              <TabsTrigger 
                value="bulk-import" 
                className="bg-primary/10 hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-2 py-2"
              >
                Bulk Import
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guidance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Admin Dashboard Guide
                  </CardTitle>
                  <CardDescription>
                    Complete guide for managing your cybersecurity knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/50 dark:to-cyan-900/50 border-cyan-200 dark:border-cyan-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("techniques")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">Technique Management</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Manage all techniques with import, edit, search, and tracking capabilities</p>
                        <Button 
                          size="sm" 
                          className="bg-cyan-600 hover:bg-cyan-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("techniques"); }}
                        >
                          Central Hub →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("cheatsheets")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">Cheat Sheets</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Access quick reference commands and tools for efficient operations</p>
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("cheatsheets"); }}
                        >
                          Quick Reference →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("linktabs")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">Link Tabs</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Discover external resources and documentation links for further learning</p>
                        <Button 
                          size="sm" 
                          className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("linktabs"); }}
                        >
                          External Resources →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("scenarios")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">Scenarios</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Explore complete attack chains and workflows for comprehensive understanding</p>
                        <Button 
                          size="sm" 
                          className="bg-red-600 hover:bg-red-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("scenarios"); }}
                        >
                          Attack Scenarios →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("users")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">User Management</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Manage user accounts and permissions efficiently</p>
                        <Button 
                          size="sm" 
                          className="bg-gray-600 hover:bg-gray-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("users"); }}
                        >
                          User Admin →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("ai-providers")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Rocket className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">AI & Models</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Configure AI providers and model access for advanced capabilities</p>
                        <Button 
                          size="sm" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("ai-providers"); }}
                        >
                          AI Configuration →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/50 border-pink-200 dark:border-pink-800 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => setActiveTab("announcements")}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform duration-200" />
                          <CardTitle className="text-base">Support System</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <p className="text-sm text-muted-foreground">Handle announcements, FAQ, and ticket management</p>
                        <Button 
                          size="sm" 
                          className="bg-pink-600 hover:bg-pink-700 text-white w-full"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("announcements"); }}
                        >
                          Support Tools →
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Quick Start Guide
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/50">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">1</div>
                        <div>
                          <h4 className="font-medium">Manage Techniques</h4>
                          <p className="text-sm text-muted-foreground">Use the "Technique Management" tab for all technique operations - import from markdown, bulk import, web scraping, and direct database management.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/50">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">2</div>
                        <div>
                          <h4 className="font-medium">Organize Content</h4>
                          <p className="text-sm text-muted-foreground">Use "Cheat Sheets" for quick commands and "Scenarios" for complex attack workflows. Link related techniques together.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/50">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">3</div>
                        <div>
                          <h4 className="font-medium">Configure Access</h4>
                          <p className="text-sm text-muted-foreground">Set up user permissions, AI models, and external links to create a comprehensive security knowledge base.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cheatsheets" className="space-y-6">
              <CheatSheetManager />
            </TabsContent>

            <TabsContent value="linktabs" className="space-y-6">
              <LinkTabsManager />
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-6">
              <ScenarioManager />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UserManager />
            </TabsContent>

            <TabsContent value="ai-providers" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <AIProviderManager />
            </TabsContent>

            <TabsContent value="model-access" className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <ModelAccessManager />
            </TabsContent>

            <TabsContent value="announcements" className="space-y-6">
              <AnnouncementManager />
            </TabsContent>

            <TabsContent value="faq" className="space-y-6">
              <FAQManager />
            </TabsContent>

            <TabsContent value="techniques" className="space-y-6">
              <TechniqueManager />
            </TabsContent>

            <TabsContent value="support" className="space-y-6">
              <SupportTicketManager />
            </TabsContent>

            <TabsContent value="bulk-import" className="space-y-6">
              <BulkImportManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};