import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Trash2, Clock, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface SessionHistoryProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionHistory = ({ 
  currentSessionId, 
  onSessionSelect, 
  onNewSession 
}: SessionHistoryProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch sessions with message counts
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          chat_messages(count)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Transform the data to include message counts
      const formattedSessions = (sessionsData || []).map(session => ({
        ...session,
        message_count: session.chat_messages?.[0]?.count || 0
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      // If this was the current session, create a new one
      if (sessionId === currentSessionId) {
        onNewSession();
      }

      toast({
        title: "Session deleted",
        description: "Chat session has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat session",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-medium text-sm text-foreground">Chat History</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNewSession}
                className="h-7 w-7 p-0 hover:bg-primary/10"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New conversation</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chat history yet</p>
                <p className="text-xs mt-1">Start a conversation to see it here</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-primary/10 ${
                    session.id === currentSessionId 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(session.updated_at)}
                      </span>
                      {session.message_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          • {session.message_count} messages
                        </span>
                      )}
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => deleteSession(session.id, e)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete session</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};