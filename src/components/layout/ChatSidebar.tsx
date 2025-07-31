import { useState } from "react";
import { Bot, Download, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatSession } from "@/components/ChatSession";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAIUsage } from '@/hooks/useAIUsage';

interface ChatSidebarProps {
  onClose?: () => void;
}
export const ChatSidebar = ({
  onClose
}: ChatSidebarProps) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [showUsage, setShowUsage] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUseAI, currentUsage, quotaLimit, planName } = useAIUsage();

  // Function to clear chat that can be passed to ChatSession
  const clearChatAndResetSession = async () => {
    // This will be called by the global function if available
    if ((window as any).__clearChatFunction) {
      await (window as any).__clearChatFunction();
    }
  };
  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // You could also trigger session loading here if needed
  };

  const handleNewSession = async () => {
    setCurrentSessionId(undefined);
    // Trigger creation of new session
    if ((window as any).__clearChatFunction) {
      await (window as any).__clearChatFunction();
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

      // Clear the current chat interface immediately
      if ((window as any).__clearChatFunction) {
        await (window as any).__clearChatFunction();
      }
      
      setCurrentSessionId(undefined);
      
      toast({
        title: "Chats cleared",
        description: "All chat history has been cleared successfully."
      });
    } catch (error) {
      console.error('Error clearing chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear chat history."
      });
    }
  };
  const handleDownloadChats = async () => {
    if (!user) return;
    try {
      console.log('Starting chat download for user:', user.id);
      
      // Add a small delay to ensure any pending messages are saved
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch all chat sessions for the user
      const {
        data: sessions,
        error: sessionsError
      } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw sessionsError;
      }
      
      console.log('Found sessions:', sessions?.length || 0);
      
      // Fetch all messages for all sessions in one query
      const sessionIds = sessions?.map(s => s.id) || [];
      console.log('Session IDs:', sessionIds);
      
      if (sessionIds.length === 0) {
        toast({
          title: "No chat history found",
          description: "You don't have any chat sessions to download."
        });
        return;
      }
      
      const {
        data: allMessages,
        error: messagesError
      } = await supabase
        .from('chat_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }
      
      console.log('Found total messages:', allMessages?.length || 0);
      console.log('Message breakdown by role:', 
        allMessages?.reduce((acc, msg) => {
          acc[msg.role] = (acc[msg.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
      
      // Group messages by session
      const messagesBySession = allMessages?.reduce((acc, msg) => {
        if (!acc[msg.session_id]) acc[msg.session_id] = [];
        acc[msg.session_id].push(msg);
        return acc;
      }, {} as Record<string, any[]>) || {};
      
      // Format the data for download
      const chatData = {
        exportDate: new Date().toISOString(),
        user: user.email,
        totalSessions: sessions?.length || 0,
        totalMessages: allMessages?.length || 0,
        sessions: sessions?.map(session => ({
          id: session.id,
          title: session.title,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          messageCount: messagesBySession[session.id]?.length || 0,
          messages: (messagesBySession[session.id] || []).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            provider: msg.provider_name,
            tokensUsed: msg.tokens_used
          }))
        }))
      };
      
      console.log('Final chat data structure:', {
        sessions: chatData.sessions.length,
        totalMessages: chatData.totalMessages,
        messagesPerSession: chatData.sessions.map(s => ({ 
          title: s.title, 
          messageCount: s.messageCount 
        }))
      });

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
        title: "Download completed",
        description: `Downloaded ${chatData.totalSessions} sessions with ${chatData.totalMessages} messages.`
      });
    } catch (error) {
      console.error('Error downloading chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download chat history. Check console for details."
      });
    }
  };
  return <TooltipProvider>
      <div className="h-full flex flex-col border-r border-border bg-background overflow-hidden">{/* Use h-full to respect parent constraints */}
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">RT AI</h3>
                <div className="flex items-center gap-2 mt-1">
                  <AIStatusIndicator key="sidebar-status" size="sm" showLabel />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleDownloadChats} className="h-7 w-7 p-0 hover:bg-primary/10">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download chat history</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleClearChats} className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all chats</p>
                </TooltipContent>
              </Tooltip>
              {onClose && <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 hover:bg-muted/50">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Close chat panel</p>
                  </TooltipContent>
                </Tooltip>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 bg-background overflow-hidden min-h-0">
          <div className="w-full h-full flex flex-col min-h-0">
            {/* Chat session */}
            <div className="flex-1 overflow-hidden">
              <ChatSession onClear={clearChatAndResetSession} sessionId={currentSessionId} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>;
};