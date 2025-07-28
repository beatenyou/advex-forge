import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, ExternalLink, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LinkTab {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  icon: string;
  order_index: number;
  is_active: boolean;
}

const iconOptions = [
  "ExternalLink", "BookOpen", "Shield", "Terminal", "GitBranch", "Globe", 
  "FileText", "Tool", "Database", "Lock", "Search", "Settings",
  "Users", "Server", "Code", "Zap", "Star", "Heart"
];

const categoryOptions = ["Resources", "Tools", "Documentation", "Community", "General"];

export const LinkTabsManager = () => {
  const [linkTabs, setLinkTabs] = useState<LinkTab[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<LinkTab | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    category: "General",
    icon: "ExternalLink",
    is_active: true
  });

  useEffect(() => {
    fetchLinkTabs();
  }, []);

  const fetchLinkTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_link_tabs')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setLinkTabs(data || []);
    } catch (error) {
      console.error('Error fetching link tabs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch link tabs",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tabData = {
        ...formData,
        order_index: editingTab?.order_index ?? linkTabs.length
      };

      if (editingTab) {
        const { error } = await supabase
          .from('ai_link_tabs')
          .update(tabData)
          .eq('id', editingTab.id);

        if (error) throw error;
        toast({ title: "Success", description: "Link tab updated successfully" });
      } else {
        const { error } = await supabase
          .from('ai_link_tabs')
          .insert([tabData]);

        if (error) throw error;
        toast({ title: "Success", description: "Link tab created successfully" });
      }

      setIsDialogOpen(false);
      setEditingTab(null);
      setFormData({
        title: "",
        url: "",
        description: "",
        category: "General",
        icon: "ExternalLink",
        is_active: true
      });
      fetchLinkTabs();
    } catch (error) {
      console.error('Error saving link tab:', error);
      toast({
        title: "Error",
        description: "Failed to save link tab",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (tab: LinkTab) => {
    setEditingTab(tab);
    setFormData({
      title: tab.title,
      url: tab.url,
      description: tab.description || "",
      category: tab.category,
      icon: tab.icon,
      is_active: tab.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link tab?")) return;

    try {
      const { error } = await supabase
        .from('ai_link_tabs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Link tab deleted successfully" });
      fetchLinkTabs();
    } catch (error) {
      console.error('Error deleting link tab:', error);
      toast({
        title: "Error",
        description: "Failed to delete link tab",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_link_tabs')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchLinkTabs();
    } catch (error) {
      console.error('Error toggling link tab status:', error);
      toast({
        title: "Error",
        description: "Failed to update link tab status",
        variant: "destructive"
      });
    }
  };

  const updateOrderIndex = async (id: string, newOrderIndex: number) => {
    try {
      const { error } = await supabase
        .from('ai_link_tabs')
        .update({ order_index: newOrderIndex })
        .eq('id', id);

      if (error) throw error;
      fetchLinkTabs();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const moveTab = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= linkTabs.length) return;

    const tab = linkTabs[index];
    const otherTab = linkTabs[newIndex];
    
    updateOrderIndex(tab.id, otherTab.order_index);
    updateOrderIndex(otherTab.id, tab.order_index);
  };

  const groupedTabs = linkTabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {} as Record<string, LinkTab[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Link Tabs Management</h3>
          <p className="text-sm text-muted-foreground">Manage quick access links in the AI section</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-cyber hover:shadow-lg hover:shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Add Link Tab
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTab ? "Edit Link Tab" : "Create Link Tab"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="MITRE ATT&CK"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://attack.mitre.org/"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the resource"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={formData.icon} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTab ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {Object.entries(groupedTabs).map(([category, tabs]) => (
        <Card key={category} className="bg-gradient-glow border-primary/10">
          <CardHeader>
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{tab.title}</span>
                          <Badge variant={tab.is_active ? "default" : "secondary"}>
                            {tab.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {tab.description && (
                          <p className="text-xs text-muted-foreground">{tab.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono">{tab.url}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTab(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTab(index, 'down')}
                      disabled={index === tabs.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      ↓
                    </Button>
                    <Switch
                      checked={tab.is_active}
                      onCheckedChange={(checked) => handleToggleActive(tab.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tab)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tab.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {linkTabs.length === 0 && (
        <Card className="bg-gradient-glow border-primary/10">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No link tabs configured yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};