import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, Send, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Technique {
  id: string;
  title: string;
  description: string;
  mitre_id?: string;
  phase?: string;
}

interface QuickSupportTicketProps {
  technique: Technique;
}

export default function QuickSupportTicket({ technique }: QuickSupportTicketProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitImprovement = async () => {
    if (!user || !suggestion.trim()) return;

    setIsSubmitting(true);
    try {
      const subject = `Technique Card Improvement: ${technique.title}`;
      const description = `I would like to suggest an improvement for this technique card:

Technique: ${technique.title}${technique.mitre_id ? ` (${technique.mitre_id})` : ''}
Current Description: ${technique.description.substring(0, 100)}${technique.description.length > 100 ? '...' : ''}
Phase: ${technique.phase || 'Not specified'}

My suggested improvement:
${suggestion.trim()}

${context.trim() ? `Additional context:\n${context.trim()}` : ''}

---
Technique ID: ${technique.id}
Submitted via Quick Support Ticket`;

      const { error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: user.id,
            subject,
            description,
            category: 'feature',
            priority: 'medium',
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Improvement Suggestion Sent!',
        description: 'Thank you for your feedback. We\'ll review your suggestion.',
      });

      // Reset form and close dialog
      setSuggestion('');
      setContext('');
      setOpen(false);
    } catch (error) {
      console.error('Error submitting improvement:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit suggestion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs opacity-50 cursor-not-allowed"
              disabled
              onClick={(e) => e.stopPropagation()}
            >
              <HelpCircle className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign in to suggest improvements</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
            >
              <HelpCircle className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Suggest card improvement</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest Improvement</DialogTitle>
          <DialogDescription>
            Help us improve this technique card: "{technique.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your improvement suggestion *
            </label>
            <Textarea
              placeholder="What would make this technique card more useful? (e.g., better description, additional tools, clearer examples...)"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              className="min-h-[80px]"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              Additional context (optional)
            </label>
            <Textarea
              placeholder="Any additional context or specific use cases that would help us understand your suggestion better..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitImprovement}
              disabled={!suggestion.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Suggestion
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}