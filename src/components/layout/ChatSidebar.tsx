import { useState, useEffect } from "react";
import { Bot, ExternalLink, Download, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatSession } from "@/components/ChatSession";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const { user } = useAuth();
  const { toast } = useToast();

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

  const handleClearChats = async () => {
    if (!user) return;
    
    try {
      // Delete all chat sessions for the current user
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({
        title: "Chats cleared",
        description: "All chat history has been cleared successfully.",
      });
    } catch (error) {
      console.error('Error clearing chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear chat history.",
      });
    }
  };

  const handleDownloadChats = async () => {
    if (!user) return;
    
    try {
      // Fetch all chat sessions and their messages
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Format the data for download
      const chatData = {
        exportDate: new Date().toISOString(),
        user: user.email,
        sessions: sessions?.map(session => ({
          id: session.id,
          title: session.title,
          createdAt: session.created_at,
          messages: session.chat_messages?.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            provider: msg.provider_name
          }))
        }))
      };

      // Create and download the file
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your chat history is being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download chat history.",
      });
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
      <SidebarHeader className="p-4 border-b border-border bg-gradient-card backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-cyber flex items-center justify-center shadow-glow">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">AI Assistant</h3>
              <div className="flex items-center gap-2 mt-1">
                <AIStatusIndicator size="sm" showLabel />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadChats}
              className="h-7 w-7 p-0 hover:bg-primary/10"
              title="Download chat history"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              onClick={handleClearChats}
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Clear all chats"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 bg-background">
        {hasLinkTabs ? (
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
              <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chat</TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Links</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-0 h-[calc(100vh-180px)]">
              <ChatSession />
            </TabsContent>
            <TabsContent value="links" className="mt-0 h-[calc(100vh-180px)] overflow-y-auto">
              <SidebarGroup>
                <SidebarGroupContent className="space-y-3">
                  {Object.entries(groupedTabs).map(([category, tabs]) => (
                    <div key={category}>
                      <SidebarGroupLabel className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">
                        {category}
                      </SidebarGroupLabel>
                      <div className="space-y-2">
                        {tabs.map((tab) => (
                          <a
                            key={tab.id}
                            href={tab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-3 bg-card/60 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 group hover:shadow-glow animate-fade-in"
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
          <div className="h-[calc(100vh-180px)]">
            <ChatSession />
          </div>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};