import { useState, useEffect } from "react";
import { Bot, ExternalLink } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { ChatSession } from "@/components/ChatSession";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LinkTab {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  icon: string;
  order_index: number;
  is_active: boolean;
}

export const ChatSidebar = () => {
  const [linkTabs, setLinkTabs] = useState<LinkTab[]>([]);

  useEffect(() => {
    fetchLinkTabs();
  }, []);

  const fetchLinkTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_link_tabs')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setLinkTabs(data || []);
    } catch (error) {
      console.error('Error fetching link tabs:', error);
    }
  };

  const groupedTabs = linkTabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, LinkTab[]>);

  const hasLinkTabs = linkTabs.length > 0;

  return (
    <Sidebar 
      className="border-r border-border bg-background"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="p-6 border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-cyber flex items-center justify-center shadow-glow">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
            <div className="flex items-center gap-2 mt-1">
              <AIStatusIndicator size="sm" showLabel />
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-6 bg-background">
        {hasLinkTabs ? (
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
              <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chat</TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Links</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-0 h-[calc(100vh-200px)]">
              <ChatSession />
            </TabsContent>
            <TabsContent value="links" className="mt-0 h-[calc(100vh-200px)] overflow-y-auto">
              <SidebarGroup>
                <SidebarGroupContent className="space-y-4">
                  {Object.entries(groupedTabs).map(([category, tabs]) => (
                    <div key={category}>
                      <SidebarGroupLabel className="text-xs font-medium text-primary mb-3 uppercase tracking-wide">
                        {category}
                      </SidebarGroupLabel>
                      <div className="space-y-3">
                        {tabs.map((tab) => (
                          <a
                            key={tab.id}
                            href={tab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-4 bg-card/60 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 group hover:shadow-glow animate-fade-in"
                          >
                            <ExternalLink className="w-4 h-4 text-primary mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors block truncate">
                                {tab.title}
                              </span>
                              {tab.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {tab.description}
                                </p>
                              )}
                              <Badge variant="secondary" className="text-xs mt-2 bg-primary/10 text-primary border-primary/20">
                                {tab.category}
                              </Badge>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            <ChatSession />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};