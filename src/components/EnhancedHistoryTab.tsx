import { useState, useEffect } from "react";
import { Clock, MessageSquare, Calendar, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryManager } from "@/components/HistoryManager";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface HistoryStats {
  totalSessions: number;
  todaySessions: number;
  totalMessages: number;
}

interface RecentSession {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

interface EnhancedHistoryTabProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const EnhancedHistoryTab = ({
  currentSessionId,
  onSessionSelect,
  onNewSession
}: EnhancedHistoryTabProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<HistoryStats>({ totalSessions: 0, todaySessions: 0, totalMessages: 0 });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistoryStats();
    }
  }, [user]);

  const fetchHistoryStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get sessions with message count
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          chat_messages(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySessions = sessions?.filter(session => {
        const sessionDate = new Date(session.created_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      }).length || 0;

      const totalMessages = sessions?.reduce((sum, session) => {
        return sum + (session.chat_messages?.[0]?.count || 0);
      }, 0) || 0;

      const processedSessions = sessions?.map(session => ({
        id: session.id,
        title: session.title,
        updated_at: session.updated_at,
        message_count: session.chat_messages?.[0]?.count || 0
      })) || [];

      setStats({
        totalSessions: sessions?.length || 0,
        todaySessions,
        totalMessages
      });

      setRecentSessions(processedSessions.slice(0, 3));
    } catch (error) {
      console.error('Error fetching history stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/60 border-border/50">
              <CardContent className="p-3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-6 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-gradient-subtle border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-lg font-bold text-primary">{stats.totalSessions}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-subtle border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Today</div>
            <div className="text-lg font-bold text-accent">{stats.todaySessions}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-subtle border-border/50 hover:border-primary/30 transition-colors">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-lg font-bold text-secondary">{stats.totalMessages}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">Recent Conversations</h4>
          <HistoryManager 
            currentSessionId={currentSessionId}
            onSessionSelect={onSessionSelect}
            onNewSession={onNewSession}
            mode="dialog"
            trigger={
              <Button variant="ghost" size="sm" className="h-auto p-1 text-xs hover:bg-primary/10">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            }
          />
        </div>
        
        {recentSessions.length === 0 ? (
          <Card className="bg-gradient-subtle border-dashed border-border/50">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No chat history yet</p>
              <Button 
                size="sm" 
                onClick={onNewSession}
                className="bg-gradient-cyber hover:bg-gradient-cyber/90"
              >
                Start Your First Chat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <HistoryManager 
                key={session.id}
                currentSessionId={currentSessionId}
                onSessionSelect={onSessionSelect}
                onNewSession={onNewSession}
                mode="dialog"
                trigger={
                  <Card 
                    className={`bg-card/60 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group ${
                      currentSessionId === session.id ? 'border-primary bg-primary/10' : ''
                    }`}
                    onClick={() => onSessionSelect(session.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {session.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(session.updated_at)}
                            </div>
                            <Badge variant="secondary" className="text-xs bg-muted/50">
                              <MessageSquare className="w-2.5 h-2.5 mr-1" />
                              {session.message_count}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};