import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Edit, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to?: string;
  profiles?: {
    display_name: string;
    email: string;
  };
}

interface TicketMessage {
  id: string;
  message_text: string;
  created_at: string;
  sender_id: string;
  is_internal: boolean;
  profiles?: {
    display_name: string;
    email: string;
  };
}

export default function SupportTicketManager() {
  const { isAdmin, loading: adminLoading } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      fetchTickets();
    }
  }, [user, isAdmin]);

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data for each ticket
      if (ticketsData && ticketsData.length > 0) {
        const userIds = [...new Set(ticketsData.map(ticket => ticket.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const ticketsWithProfiles = ticketsData.map(ticket => ({
          ...ticket,
          profiles: profilesMap.get(ticket.user_id)
        }));

        setTickets(ticketsWithProfiles);
      } else {
        setTickets([]);
      }

    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profile data for message senders
      if (messagesData && messagesData.length > 0) {
        const userIds = [...new Set(messagesData.map(message => message.sender_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const messagesWithProfiles = messagesData.map(message => ({
          ...message,
          profiles: profilesMap.get(message.sender_id)
        }));

        setTicketMessages(messagesWithProfiles);
      } else {
        setTicketMessages([]);
      }
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ticket messages',
        variant: 'destructive',
      });
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      await fetchTickets();
      toast({
        title: 'Success',
        description: 'Ticket updated successfully',
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert([
          {
            ticket_id: selectedTicket.id,
            sender_id: user.id,
            message_text: newMessage.trim(),
            is_internal: false,
          },
        ]);

      if (error) throw error;

      setNewMessage('');
      await fetchTicketMessages(selectedTicket.id);
      
      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTicketClick = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchTicketMessages(ticket.id);
    setShowTicketDialog(true);
  };

  const handleEditTicket = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setShowEditDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Support Tickets</CardTitle>
          <CardDescription>
            Manage and respond to user support requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No support tickets found.</p>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{ticket.subject}</h4>
                      <Badge className={`text-white ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={`text-white ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      From: {ticket.profiles?.display_name || ticket.profiles?.email || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created: {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTicket(ticket)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Ticket from {selectedTicket?.profiles?.display_name || selectedTicket?.profiles?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <div className="flex gap-2">
                <Badge className={`text-white ${getStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status.replace('_', ' ')}
                </Badge>
                <Badge className={`text-white ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">Original Description:</p>
                <p className="text-sm">{selectedTicket.description}</p>
              </div>

              <div className="flex-1 min-h-0">
                <h4 className="font-medium mb-2">Messages</h4>
                <ScrollArea className="h-64 border rounded-lg p-4">
                  <div className="space-y-4">
                    {ticketMessages.map((message) => (
                      <div key={message.id} className="border-b pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {message.profiles?.display_name || message.profiles?.email || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{message.message_text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Type your response..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sendingMessage}
                  className="w-full"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  Send Response
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Update ticket status and priority
            </DialogDescription>
          </DialogHeader>
          
          {editingTicket && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editingTicket.status}
                  onValueChange={(value) => setEditingTicket({...editingTicket, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={editingTicket.priority}
                  onValueChange={(value) => setEditingTicket({...editingTicket, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await updateTicket(editingTicket.id, {
                      status: editingTicket.status,
                      priority: editingTicket.priority,
                    });
                    setShowEditDialog(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}