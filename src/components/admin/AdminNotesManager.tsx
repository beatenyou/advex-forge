import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Filter, Edit, Trash2, FileEdit, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AdminNote {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'resolved' | 'archived';
  created_by: string;
  assigned_to?: string;
  support_ticket_id?: string;
  tags: string[];
  due_date?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  assignee_name?: string;
}

const categories = ['General', 'Issues', 'Support Tickets', 'Information Requests', 'System Updates'];
const priorities = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];
const statuses = [
  { value: 'active', label: 'Active', icon: AlertCircle, color: 'bg-blue-100 text-blue-800' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'archived', label: 'Archived', icon: Clock, color: 'bg-gray-100 text-gray-800' }
];

export const AdminNotesManager = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNote, setSelectedNote] = useState<AdminNote | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'active' | 'resolved' | 'archived';
    assigned_to: string;
    support_ticket_id: string;
    tags: string;
    due_date: string;
  }>({
    title: '',
    content: '',
    category: 'General',
    priority: 'medium',
    status: 'active',
    assigned_to: '',
    support_ticket_id: '',
    tags: '',
    due_date: ''
  });

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator and assignee names separately
      const notesWithNames = await Promise.all(
        (data || []).map(async (note) => {
          // Get creator name
          const { data: creator } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', note.created_by)
            .single();

          // Get assignee name if assigned
          let assignee = null;
          if (note.assigned_to) {
            const { data: assigneeData } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', note.assigned_to)
              .single();
            assignee = assigneeData;
          }

          return {
            ...note,
            priority: note.priority as 'low' | 'medium' | 'high' | 'urgent',
            status: note.status as 'active' | 'resolved' | 'archived',
            creator_name: creator?.display_name || 'Unknown',
            assignee_name: assignee?.display_name || null
          } as AdminNote;
        })
      );

      setNotes(notesWithNames);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load admin notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .eq('role', 'admin');

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchAdmins();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'General',
      priority: 'medium',
      status: 'active',
      assigned_to: 'unassigned',
      support_ticket_id: '',
      tags: '',
      due_date: ''
    });
  };

  const handleCreate = async () => {
    if (!user || !formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const noteData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        created_by: user.id,
        assigned_to: formData.assigned_to === 'unassigned' ? null : formData.assigned_to,
        support_ticket_id: formData.support_ticket_id || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        due_date: formData.due_date || null
      };

      const { error } = await supabase
        .from('admin_notes')
        .insert([noteData]);

      if (error) throw error;

      toast.success('Admin note created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create admin note');
    }
  };

  const handleUpdate = async () => {
    if (!selectedNote || !formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const noteData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        assigned_to: formData.assigned_to === 'unassigned' ? null : formData.assigned_to,
        support_ticket_id: formData.support_ticket_id || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        due_date: formData.due_date || null
      };

      const { error } = await supabase
        .from('admin_notes')
        .update(noteData)
        .eq('id', selectedNote.id);

      if (error) throw error;

      toast.success('Admin note updated successfully');
      setIsEditDialogOpen(false);
      setSelectedNote(null);
      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update admin note');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('admin_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Admin note deleted successfully');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete admin note');
    }
  };

  const openEditDialog = (note: AdminNote) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category,
      priority: note.priority,
      status: note.status,
      assigned_to: note.assigned_to || 'unassigned',
      support_ticket_id: note.support_ticket_id || '',
      tags: note.tags.join(', '),
      due_date: note.due_date ? format(new Date(note.due_date), 'yyyy-MM-dd') : ''
    });
    setIsEditDialogOpen(true);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || note.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || note.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const getPriorityColor = (priority: string) => {
    return priorities.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading admin notes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Admin Notes</h2>
          <p className="text-muted-foreground">Manage internal admin communications and records</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Admin Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Note title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <Textarea
                placeholder="Note content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to admin (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {admins.map(admin => (
                      <SelectItem key={admin.user_id} value={admin.user_id}>
                        {admin.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  placeholder="Due date (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Support ticket ID (optional)"
                  value={formData.support_ticket_id}
                  onChange={(e) => setFormData({ ...formData, support_ticket_id: e.target.value })}
                />
                <Input
                  placeholder="Tags (comma separated)"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Note</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorities.map(priority => (
                  <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.map((note) => {
                const statusInfo = getStatusInfo(note.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{note.title}</div>
                        {note.support_ticket_id && (
                          <div className="text-xs text-muted-foreground">
                            Ticket: {note.support_ticket_id}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{note.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(note.priority)}>
                        {note.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{note.creator_name}</TableCell>
                    <TableCell>{note.assignee_name || 'Unassigned'}</TableCell>
                    <TableCell>
                      {format(new Date(note.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(note)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredNotes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No admin notes found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Admin Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Note title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Note content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to admin (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {admins.map(admin => (
                    <SelectItem key={admin.user_id} value={admin.user_id}>
                      {admin.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                placeholder="Due date (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Support ticket ID (optional)"
                value={formData.support_ticket_id}
                onChange={(e) => setFormData({ ...formData, support_ticket_id: e.target.value })}
              />
              <Input
                placeholder="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update Note</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};