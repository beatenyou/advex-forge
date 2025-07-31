import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HistoryManager } from '@/components/HistoryManager';
import { 
  History, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Calendar,
  ArrowRight,
  Trash2,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isYesterday } from 'date-fns';

interface HistoryStats {
  totalSessions: number;
  totalMessages: number;
  todaySessions: number;
  recentSessions: Array<{
    id: string;
    title: string;
    updated_at: string;
    message_count: number;
  }>;
}

interface HistoryQuickAccessProps {
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const HistoryQuickAccess = ({ onSessionSelect, onNewSession }: HistoryQuickAccessProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<HistoryStats>({
    totalSessions: 0,
    totalMessages: 0,
    todaySessions: 0,
    recentSessions: []
  });
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

      // Fetch session data with message counts
      const { data: sessionsData, error } = await supabase
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
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const sessions = sessionsData || [];
      const todaySessions = sessions.filter(s => isToday(new Date(s.updated_at))).length;
      const totalMessages = sessions.reduce((sum, s) => sum + (s.chat_messages?.[0]?.count || 0), 0);

      setStats({
        totalSessions: sessions.length,
        totalMessages,
        todaySessions,
        recentSessions: sessions.map(s => ({
          id: s.id,
          title: s.title,
          updated_at: s.updated_at,
          message_count: s.chat_messages?.[0]?.count || 0
        }))
      });

    } catch (error) {
      console.error('Error fetching history stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Chat History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Chat History</CardTitle>
              <CardDescription>
                {stats.totalSessions} sessions, {stats.totalMessages} messages
              </CardDescription>
            </div>
          </div>
          
          <HistoryManager
            onSessionSelect={onSessionSelect}
            onNewSession={onNewSession}
            trigger={
              <Button variant="outline" size="sm">
                <History className="w-4 h-4 mr-2" />
                Manage
              </Button>
            }
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-foreground">{stats.totalSessions}</div>
            <div className="text-xs text-muted-foreground">Total Sessions</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-foreground">{stats.todaySessions}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold text-foreground">{stats.totalMessages}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
        </div>

        {/* Recent Sessions */}
        {stats.recentSessions.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Recent Sessions</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onNewSession}
                className="text-xs h-6 px-2"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                New Chat
              </Button>
            </div>
            
            <div className="space-y-1">
              {stats.recentSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(session.updated_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {session.message_count}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>

            {stats.recentSessions.length > 3 && (
              <HistoryManager
                onSessionSelect={onSessionSelect}
                onNewSession={onNewSession}
                trigger={
                  <Button variant="ghost" className="w-full text-xs h-8">
                    View all {stats.totalSessions} sessions
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">No chat history yet</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNewSession}
              className="w-full"
            >
              Start your first conversation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};