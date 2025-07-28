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
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-cyber flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">AI Assistant</h3>
            <div className="flex items-center gap-2 mt-1">
              <AIStatusIndicator size="sm" showLabel />
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        {hasLinkTabs ? (
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-0">
              <ChatSession />
            </TabsContent>
            
            <TabsContent value="links" className="mt-0">
              <SidebarGroup>
                <SidebarGroupContent className="space-y-4">
                  {Object.entries(groupedTabs).map(([category, tabs]) => (
                    <div key={category}>
                      <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2">
                        {category}
                      </SidebarGroupLabel>
                      <div className="space-y-2">
                        {tabs.map((tab) => (
                          <a
                            key={tab.id}
                            href={tab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/50 hover:bg-muted/30 transition-colors group"
                          >
                            <ExternalLink className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors block truncate">
                                {tab.title}
                              </span>
                              {tab.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {tab.description}
                                </p>
                              )}
                              <Badge variant="secondary" className="text-xs mt-1">
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
          <ChatSession />
        )}
      </SidebarContent>
    </Sidebar>
  );
};