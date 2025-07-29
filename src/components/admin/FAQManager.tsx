import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2, Save } from 'lucide-react';

const faqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().min(1, 'Category is required'),
  order_index: z.number().min(0),
});

type FAQFormData = z.infer<typeof faqSchema>;

export default function FAQManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<any>(null);

  const form = useForm<FAQFormData>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: '',
      answer: '',
      category: 'General',
      order_index: 0,
    },
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('faq_items')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    }
  };

  const onSubmit = async (data: FAQFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const faqData = {
        question: data.question,
        answer: data.answer,
        category: data.category,
        order_index: data.order_index,
        created_by: user.id
      };

      if (editingFAQ) {
        const { error } = await supabase
          .from('faq_items')
          .update(faqData)
          .eq('id', editingFAQ.id);
        if (error) throw error;
        toast({ title: 'FAQ Updated', description: 'FAQ has been updated successfully.' });
      } else {
        const { error } = await supabase.from('faq_items').insert(faqData);
        if (error) throw error;
        toast({ title: 'FAQ Created', description: 'FAQ has been created successfully.' });
      }

      form.reset();
      setDialogOpen(false);
      setEditingFAQ(null);
      fetchFAQs();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast({ title: 'Error', description: 'Failed to save FAQ.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteFAQ = async (id: string) => {
    try {
      const { error } = await supabase.from('faq_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'FAQ Deleted', description: 'FAQ has been deleted.' });
      fetchFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast({ title: 'Error', description: 'Failed to delete FAQ.', variant: 'destructive' });
    }
  };

  const openEditDialog = (faq: any) => {
    setEditingFAQ(faq);
    form.reset(faq);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          FAQ Management
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingFAQ(null); form.reset(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFAQ ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
                <DialogDescription>Create or edit FAQ items for users</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="answer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Answer</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>Manage FAQ items for user support</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{faq.question}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                  <p className="text-xs text-muted-foreground mt-2">Category: {faq.category}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(faq)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteFAQ(faq.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}