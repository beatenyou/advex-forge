import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  History, 
  Search, 
  Trash2, 
  Download, 
  Archive, 
  Calendar,
  MessageSquare,
  Clock,
  Filter,
  CheckSquare,
  Square,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  User,
  Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_preview?: string;
  provider_name?: string;
  chat_messages?: Array<{
    content: string;
    created_at: string;
    provider_name: string | null;
    role?: string;
  }>;
}

interface HistoryManagerProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  trigger?: React.ReactNode;
  mode?: 'dialog' | 'embedded';
}

export const HistoryManager = ({ 
  currentSessionId, 
  onSessionSelect, 
  onNewSession,
  trigger,
  mode = 'dialog'
}: HistoryManagerProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({ totalSessions: 0, totalMessages: 0 });

  const fetchSessions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch sessions with message counts and last message preview
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          chat_messages(
            content,
            created_at,
            provider_name,
            role
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Transform the data to include message counts and previews
      const formattedSessions = (sessionsData || []).map(session => {
        const messages = (session.chat_messages || []).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        
        return {
          id: session.id,
          title: session.title,
          created_at: session.created_at,
          updated_at: session.updated_at,
          message_count: messages.length,
          last_message_preview: lastMessage ? 
            (lastMessage.content.length > 100 ? 
              lastMessage.content.substring(0, 100) + '...' : 
              lastMessage.content) : 
            'No messages',
          provider_name: lastMessage?.provider_name,
          chat_messages: messages.map(msg => ({
            ...msg,
            role: msg.role || (msg.provider_name ? 'assistant' : 'user')
          }))
        };
      });

      setSessions(formattedSessions);
      
      // Calculate stats
      const totalMessages = formattedSessions.reduce((sum, session) => sum + (session.message_count || 0), 0);
      setStats({
        totalSessions: formattedSessions.length,
        totalMessages
      });

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
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, fetchSessions]);

  const deleteSelectedSessions = useCallback(async () => {
    if (selectedSessions.size === 0) return;

    try {
      setIsDeleting(true);
      
      const sessionIds = Array.from(selectedSessions);
      
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .in('id', sessionIds)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.filter(s => !selectedSessions.has(s.id)));
      setSelectedSessions(new Set());

      // If current session was deleted, create a new one
      if (currentSessionId && selectedSessions.has(currentSessionId)) {
        onNewSession();
      }

      toast({
        title: "Sessions deleted",
        description: `Successfully deleted ${sessionIds.length} chat session(s)`
      });

    } catch (error) {
      console.error('Error deleting sessions:', error);
      toast({
        title: "Error",
        description: "Failed to delete selected sessions",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedSessions, user, currentSessionId, onNewSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (mode === 'dialog' && isDialogOpen) {
        // Delete key to delete selected sessions
        if (event.key === 'Delete' && selectedSessions.size > 0) {
          event.preventDefault();
          deleteSelectedSessions();
        }
        
        // Escape to close dialog
        if (event.key === 'Escape') {
          setIsDialogOpen(false);
        }
        
        // Ctrl+A to select all
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
          event.preventDefault();
          handleSelectAll();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, isDialogOpen, selectedSessions.size, deleteSelectedSessions]);

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.last_message_preview && session.last_message_preview.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    sessions.forEach(session => {
      const date = new Date(session.updated_at);
      
      if (isToday(date)) {
        groups['Today'].push(session);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(session);
      } else if (isThisWeek(date)) {
        groups['This Week'].push(session);
      } else if (isThisMonth(date)) {
        groups['This Month'].push(session);
      } else {
        groups['Older'].push(session);
      }
    });

    // Remove empty groups
    return Object.entries(groups).filter(([_, sessions]) => sessions.length > 0);
  };

  const groupedSessions = groupSessionsByDate(filteredSessions);

  const handleSelectAll = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };


  const exportSelectedSessions = async () => {
    if (selectedSessions.size === 0) return;

    try {
      const sessionIds = Array.from(selectedSessions);
      const selectedSessionsData = sessions.filter(s => sessionIds.includes(s.id));
      
      // Fetch full message data for selected sessions
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group messages by session
      const messagesBySession = messagesData?.reduce((acc, msg) => {
        if (!acc[msg.session_id]) acc[msg.session_id] = [];
        acc[msg.session_id].push(msg);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Format export data
      const exportData = {
        exportDate: new Date().toISOString(),
        user: user?.email,
        selectedSessions: sessionIds.length,
        sessions: selectedSessionsData.map(session => ({
          id: session.id,
          title: session.title,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          messageCount: session.message_count,
          messages: (messagesBySession[session.id] || []).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            provider: msg.provider_name,
            tokensUsed: msg.tokens_used
          }))
        }))
      };

      // Download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selected-chat-sessions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export completed",
        description: `Exported ${sessionIds.length} chat session(s)`
      });

    } catch (error) {
      console.error('Error exporting sessions:', error);
      toast({
        title: "Error",
        description: "Failed to export selected sessions",
        variant: "destructive"
      });
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const renderSessionItem = (session: ChatSession) => {
    const isSelected = selectedSessions.has(session.id);
    const isCurrent = session.id === currentSessionId;
    const isExpanded = expandedSessions.has(session.id);
    
    return (
      <div key={session.id} className="space-y-2">
        <div
          className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
            isCurrent ? 'bg-primary/10 border border-primary/30' : ''
          } ${isSelected ? 'bg-muted/30' : ''}`}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => handleSessionSelect(session.id)}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div 
              className="cursor-pointer"
              onClick={() => {
                onSessionSelect(session.id);
                if (mode === 'dialog') setIsDialogOpen(false);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {session.title}
                </h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {session.provider_name && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {session.provider_name}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {session.message_count || 0}
                  </Badge>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {session.last_message_preview}
              </p>
              
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(session.updated_at), 'MMM d, h:mm a')}</span>
              </div>
            </div>
            
            {/* Expand/Collapse button for messages */}
            {session.chat_messages && session.chat_messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSessionExpansion(session.id);
                }}
                className="mt-2 h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Hide messages
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-3 h-3 mr-1" />
                    Show {session.message_count} messages
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded messages view */}
        {isExpanded && session.chat_messages && (
          <div className="ml-6 space-y-2 border-l border-border pl-4">
            {session.chat_messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 p-3 rounded-lg text-sm ${
                  message.role === 'user' 
                    ? 'bg-primary/5 border-l-2 border-primary/20' 
                    : 'bg-muted/30 border-l-2 border-muted-foreground/20'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-primary" />
                  ) : (
                    <Bot className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {message.role === 'user' ? 'You' : (message.provider_name || 'AI')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </span>
                  </div>
                  
                  <p className="text-foreground whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header with stats */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base">Chat History</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{stats.totalSessions} sessions</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{stats.totalMessages} messages</span>
            </div>
          </div>

          {/* Search and bulk actions */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Bulk actions bar */}
            {selectedSessions.size > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {selectedSessions.size} selected
                </span>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={exportSelectedSessions}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export selected</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deleteSelectedSessions}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete selected</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Select all checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredSessions.length})
              </span>
            </div>
          </div>
        </div>

        {/* Sessions list */}
        <ScrollArea className="flex-1 px-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              {searchQuery ? (
                <div>
                  <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No sessions found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                </div>
              ) : (
                <div>
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No chat history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a conversation to see it here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {groupedSessions.map(([groupName, groupSessions]) => (
                <div key={groupName}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm text-muted-foreground">{groupName}</h4>
                    <span className="text-xs text-muted-foreground">({groupSessions.length})</span>
                  </div>
                  <div className="space-y-1">
                    {groupSessions.map(renderSessionItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with quick actions */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedSessions(new Set())}>
                  Clear selection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setSelectedSessions(new Set(sessions.map(s => s.id)))}
                  disabled={sessions.length === 0}
                >
                  Select all sessions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );

  if (mode === 'embedded') {
    return content;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-full h-[80vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Chat History Manager</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};