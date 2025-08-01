import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, History, Trash2, Star, Clock, User } from 'lucide-react';
import { TemplateManagementService, ExtractionTemplate } from '@/services/TemplateManagementService';

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUpdate?: () => void;
}

export const TemplateEditor = ({ open, onOpenChange, onTemplateUpdate }: TemplateEditorProps) => {
  const { toast } = useToast();
  const [activeTemplate, setActiveTemplate] = useState<ExtractionTemplate | null>(null);
  const [templateHistory, setTemplateHistory] = useState<ExtractionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_content: ''
  });
  const [showHistory, setShowHistory] = useState(false);

  const loadTemplateData = async () => {
    setLoading(true);
    try {
      const [active, history] = await Promise.all([
        TemplateManagementService.getActiveTemplate(),
        TemplateManagementService.getTemplateHistory()
      ]);

      setActiveTemplate(active);
      setTemplateHistory(history);

      if (active) {
        setFormData({
          name: active.name,
          description: active.description || '',
          template_content: active.template_content
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load template data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplateData();
    }
  }, [open]);

  const handleSaveTemplate = async () => {
    if (!formData.name.trim() || !formData.template_content.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and template content are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await TemplateManagementService.saveNewTemplate(
        formData.template_content,
        formData.name,
        formData.description
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Template saved and activated successfully",
        });
        onTemplateUpdate?.();
        await loadTemplateData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActivateTemplate = async (templateId: string) => {
    try {
      const result = await TemplateManagementService.activateTemplate(templateId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Template activated successfully",
        });
        onTemplateUpdate?.();
        await loadTemplateData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to activate template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const result = await TemplateManagementService.deleteTemplate(templateId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Template deleted successfully",
        });
        await loadTemplateData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>System Template Editor</DialogTitle>
          <DialogDescription>
            Manage the default extraction template used system-wide for cybersecurity technique extraction.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Main Editor */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Template name"
                />
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="flex-1">
              <Label htmlFor="template-content">Template Content</Label>
              <Textarea
                id="template-content"
                value={formData.template_content}
                onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                placeholder="Enter your extraction template..."
                className="h-[400px] font-mono text-sm"
              />
            </div>
          </div>

          {/* Template History Sidebar */}
          <div className="w-80 border-l pl-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Template History</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showHistory && (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {templateHistory.map((template) => (
                    <Card key={template.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{template.name}</h4>
                            {template.is_active && (
                              <Badge variant="default" className="h-5">
                                <Star className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            v{template.version_number} • {new Date(template.created_at).toLocaleDateString()}
                          </p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {!template.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivateTemplate(template.id)}
                              className="h-6 px-2"
                            >
                              Activate
                            </Button>
                          )}
                          {!template.is_active && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-6 px-2">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this template version? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save as New Active Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};