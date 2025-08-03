import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Settings, FileText, Globe, Users, Database, Shield, Target, Rocket, Wrench, BookOpen, Link, Bot, Key, Megaphone, HelpCircle, MessageSquare, Upload, BarChart3, Navigation, FileEdit, Hash } from "lucide-react";
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
import { AdminStatistics } from "@/components/admin/AdminStatistics";
import { NavigationManager } from "@/components/admin/NavigationManager";
import { AdminNotesManager } from "@/components/admin/AdminNotesManager";
import { TechniqueAnalytics } from "@/components/admin/TechniqueAnalytics";
import { TagManager } from "@/components/admin/TagManager";
import { MaintenanceManager } from "@/components/admin/MaintenanceManager";

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard = ({ onClose }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useProfile();
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
            <TabsList className="flex flex-col gap-2 h-auto bg-muted/50 p-3 items-start">
              {/* First Row - Core Management */}
              <div className="flex flex-wrap gap-2 justify-start">
                <TabsTrigger 
                  value="guidance" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <BookOpen className="w-4 h-4" />
                  Guidance
                </TabsTrigger>
                <TabsTrigger 
                  value="techniques" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Shield className="w-4 h-4" />
                  Techniques
                </TabsTrigger>
                <TabsTrigger 
                  value="cheatsheets" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <FileText className="w-4 h-4" />
                  Cheat Sheets
                </TabsTrigger>
                <TabsTrigger 
                  value="linktabs" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Link className="w-4 h-4" />
                  Link Tabs
                </TabsTrigger>
                <TabsTrigger 
                  value="scenarios" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Target className="w-4 h-4" />
                  Scenarios
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Users className="w-4 h-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="navigation" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Navigation className="w-4 h-4" />
                  Navigation
                </TabsTrigger>
              </div>
              
              {/* Second Row - System & Support */}
              <div className="flex flex-wrap gap-2 justify-start">
                <TabsTrigger 
                  value="ai-providers" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Bot className="w-4 h-4" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="model-access" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Key className="w-4 h-4" />
                  Model Access
                </TabsTrigger>
                <TabsTrigger 
                  value="announcements" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Megaphone className="w-4 h-4" />
                  Announcements
                </TabsTrigger>
                <TabsTrigger 
                  value="faq" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <HelpCircle className="w-4 h-4" />
                  FAQ
                </TabsTrigger>
                <TabsTrigger 
                  value="support" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <MessageSquare className="w-4 h-4" />
                  Support
                </TabsTrigger>
                <TabsTrigger 
                  value="bulk-import" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Import
                </TabsTrigger>
                <TabsTrigger 
                  value="statistics" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <BarChart3 className="w-4 h-4" />
                  Statistics
                </TabsTrigger>
                <TabsTrigger 
                  value="admin-notes" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <FileEdit className="w-4 h-4" />
                  Admin Notes
                </TabsTrigger>
                <TabsTrigger 
                  value="technique-analytics" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-primary/10 hover:bg-primary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Target className="w-4 h-4" />
                  Technique Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="tags" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-secondary/10 hover:bg-secondary/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Hash className="w-4 h-4" />
                  Tags
                </TabsTrigger>
                <TabsTrigger 
                  value="maintenance" 
                  className="flex items-center gap-2 data-[state=active]:bg-background text-sm px-3 py-2 flex-shrink-0 bg-destructive/10 hover:bg-destructive/20 data-[state=active]:text-foreground min-w-[120px]"
                >
                  <Wrench className="w-4 h-4" />
                  Maintenance
                </TabsTrigger>
              </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-card border border-border hover:border-cyan-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("techniques")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors duration-200">
                            <Database className="w-5 h-5 text-cyan-400" />
                          </div>
                          <CardTitle className="text-lg">Technique Management</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Manage all techniques with import, edit, search, and tracking capabilities</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("techniques"); }}
                        >
                          Central Hub →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-purple-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("cheatsheets")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors duration-200">
                            <FileText className="w-5 h-5 text-purple-400" />
                          </div>
                          <CardTitle className="text-lg">Cheat Sheets</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Access quick reference commands and tools for efficient operations</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("cheatsheets"); }}
                        >
                          Quick Reference →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-orange-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("linktabs")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors duration-200">
                            <Globe className="w-5 h-5 text-orange-400" />
                          </div>
                          <CardTitle className="text-lg">Link Tabs</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Discover external resources and documentation links for further learning</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("linktabs"); }}
                        >
                          External Resources →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-red-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("scenarios")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors duration-200">
                            <Target className="w-5 h-5 text-red-400" />
                          </div>
                          <CardTitle className="text-lg">Scenarios</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Explore complete attack chains and workflows for comprehensive understanding</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("scenarios"); }}
                        >
                          Attack Scenarios →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-blue-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("users")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-200">
                            <Users className="w-5 h-5 text-blue-400" />
                          </div>
                          <CardTitle className="text-lg">User Management</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Manage user accounts and permissions efficiently</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("users"); }}
                        >
                          User Admin →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-indigo-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("ai-providers")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors duration-200">
                            <Rocket className="w-5 h-5 text-indigo-400" />
                          </div>
                          <CardTitle className="text-lg">AI & Models</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Configure AI providers and model access for advanced capabilities</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("ai-providers"); }}
                        >
                          AI Configuration →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-emerald-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("statistics")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors duration-200">
                            <BarChart3 className="w-5 h-5 text-emerald-400" />
                          </div>
                          <CardTitle className="text-lg">Analytics</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Monitor user engagement, AI usage, errors, and system performance</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("statistics"); }}
                        >
                          View Analytics →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-pink-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("announcements")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors duration-200">
                            <Shield className="w-5 h-5 text-pink-400" />
                          </div>
                          <CardTitle className="text-lg">Support System</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Handle announcements, FAQ, and ticket management</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("announcements"); }}
                        >
                          Support Tools →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-teal-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("navigation")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors duration-200">
                            <Navigation className="w-5 h-5 text-teal-400" />
                          </div>
                          <CardTitle className="text-lg">Navigation</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Customize Quick Navigation phases, labels, icons, and descriptions</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("navigation"); }}
                        >
                          Manage Navigation →
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border border-border hover:border-yellow-500/50 transition-all duration-200 cursor-pointer group hover:shadow-lg" onClick={() => setActiveTab("admin-notes")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors duration-200">
                            <FileEdit className="w-5 h-5 text-yellow-400" />
                          </div>
                          <CardTitle className="text-lg">Admin Notes</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">Share notes, track issues, support tickets, and information requests among admins</p>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50"
                          onClick={(e) => { e.stopPropagation(); setActiveTab("admin-notes"); }}
                        >
                          Admin Communication →
                        </Button>
                      </CardContent>
                    </Card>
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

            <TabsContent value="statistics" className="space-y-6">
              <AdminStatistics />
            </TabsContent>

            <TabsContent value="navigation" className="space-y-6">
              <NavigationManager />
            </TabsContent>

            <TabsContent value="admin-notes" className="space-y-6">
              <AdminNotesManager />
            </TabsContent>

            <TabsContent value="technique-analytics" className="space-y-6">
              <TechniqueAnalytics />
            </TabsContent>

            <TabsContent value="tags" className="space-y-6">
              <TagManager />
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-6">
              <MaintenanceManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};