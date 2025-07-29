import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { HelpCircle, MessageSquare, Plus, ExternalLink, Send, Edit, X, User, Clock, Reply } from 'lucide-react';
import { format } from 'date-fns';

const ticketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  priority: z.string().min(1, 'Priority is required'),
});

const messageSchema = z.object({
  message_text: z.string().min(1, 'Message is required'),
});

type TicketFormData = z.infer<typeof ticketSchema>;
type MessageFormData = z.infer<typeof messageSchema>;

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string;
    email: string;
  };
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_text: string;
  is_internal: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
    email: string;
  };
}

export default function SupportPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: '',
      priority: 'medium',
    },
  });

  const messageForm = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message_text: '',
    },
  });

  const editForm = useForm<{ status: string; priority: string }>({
    defaultValues: {
      status: '',
      priority: '',
    },
  });

  useEffect(() => {
    checkAdminStatus();
    fetchFAQs();
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [user, isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    }
  };

  const fetchTickets = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only show user's tickets
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      // Fetch profile data for each ticket if admin
      if (isAdmin && ticketsData) {
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
        setTickets(ticketsData || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch profile data for message senders
      if (messagesData) {
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
      }
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
    }
  };

  const onSubmit = async (data: TicketFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: data.subject,
          description: data.description,
          category: data.category,
          priority: data.priority,
        });

      if (error) throw error;

      toast({
        title: 'Support Ticket Created',
        description: 'Your support ticket has been submitted. We\'ll get back to you soon.',
      });

      form.reset();
      setDialogOpen(false);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create support ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (data: MessageFormData) => {
    if (!user || !selectedTicket) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message_text: data.message_text,
          is_internal: false,
        });

      if (error) throw error;

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent.',
      });

      messageForm.reset();
      fetchTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicket = async (data: { status: string; priority: string }) => {
    if (!editingTicket) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: data.status,
          priority: data.priority,
        })
        .eq('id', editingTicket.id);

      if (error) throw error;

      toast({
        title: 'Ticket Updated',
        description: 'The ticket has been updated successfully.',
      });

      setEditingTicket(null);
      fetchTickets();
      if (selectedTicket?.id === editingTicket.id) {
        setSelectedTicket({ ...selectedTicket, status: data.status, priority: data.priority });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketDialogOpen(true);
    fetchTicketMessages(ticket.id);
  };

  const handleEditTicket = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    editForm.reset({
      status: ticket.status,
      priority: ticket.priority,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const categories = ['all', ...new Set(faqs.map(faq => faq.category))];
  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Contact Support
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                  <DialogDescription>
                    Describe your issue and we'll help you resolve it
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief description of your issue" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="technical">Technical Issue</SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                                <SelectItem value="account">Account</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide detailed information about your issue..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? 'Creating...' : 'Create Ticket'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Need help? Create a support ticket or browse our FAQ below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center p-6 border rounded-lg">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">Need immediate help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Check our FAQ section below or create a support ticket for personalized assistance.
              </p>
              <Button variant="outline" asChild>
                <a href="mailto:support@example.com" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Email Support
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Tickets */}
      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? 'All Support Tickets' : 'Your Support Tickets'}
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'Manage and respond to support requests' : 'Track the status of your support requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleTicketClick(ticket)}>
                      <h4 className="font-medium mb-2">{ticket.subject}</h4>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Created {format(new Date(ticket.created_at), 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span className="capitalize">{ticket.category}</span>
                        {isAdmin && ticket.profiles && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ticket.profiles.display_name || ticket.profiles.email}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTicket(ticket);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Badge className={`text-white ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </Badge>
                      <Badge className={`text-white ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedTicket?.subject}</span>
              <div className="flex items-center gap-2">
                <Badge className={`text-white ${getPriorityColor(selectedTicket?.priority || '')}`}>
                  {selectedTicket?.priority?.toUpperCase()}
                </Badge>
                <Badge className={`text-white ${getStatusColor(selectedTicket?.status || '')}`}>
                  {selectedTicket?.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-4 text-sm">
                <span>Created {selectedTicket && format(new Date(selectedTicket.created_at), 'MMM dd, yyyy HH:mm')}</span>
                {isAdmin && selectedTicket?.profiles && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedTicket.profiles.display_name || selectedTicket.profiles.email}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Original ticket description */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Original Request</div>
              <div className="text-sm">{selectedTicket?.description}</div>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {ticketMessages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.profiles?.display_name || message.profiles?.email || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                      </span>
                      {message.is_internal && (
                        <Badge variant="secondary" className="text-xs">Internal</Badge>
                      )}
                    </div>
                    <div className="text-sm bg-background border rounded-lg p-3">
                      {message.message_text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message form for admins or ticket owners */}
          {(isAdmin || selectedTicket?.user_id === user?.id) && selectedTicket?.status !== 'closed' && (
            <div className="border-t pt-4">
              <Form {...messageForm}>
                <form onSubmit={messageForm.handleSubmit(sendMessage)} className="space-y-4">
                  <FormField
                    control={messageForm.control}
                    name="message_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add Response</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Type your response..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      <Reply className="w-4 h-4 mr-2" />
                      {loading ? 'Sending...' : 'Send Response'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog (Admin Only) */}
      {isAdmin && (
        <Dialog open={!!editingTicket} onOpenChange={() => setEditingTicket(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Ticket</DialogTitle>
              <DialogDescription>
                Update the ticket status and priority
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(updateTicket)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingTicket(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Ticket'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Find answers to common questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? 'All' : category}
                </Button>
              ))}
            </div>

            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-muted-foreground">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFAQs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No FAQs found for this category.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}