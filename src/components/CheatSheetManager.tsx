import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Copy, Upload, Download } from "lucide-react";
import { parseCheatSheetMarkdown, generateCheatSheetTemplate } from "@/lib/cheatSheetMarkdownParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheatSheetCommand {
  command: string;
  description: string;
  category: string;
}

interface CheatSheet {
  id: string;
  title: string;
  description: string;
  category: string;
  bg_color: string;
  commands: CheatSheetCommand[];
  created_at: string;
  updated_at: string;
}

const backgroundOptions = [
  { value: "bg-gradient-to-br from-cyber-blue/5 to-cyber-blue/10", label: "Cyber Blue", preview: "from-cyber-blue/20 to-cyber-blue/30" },
  { value: "bg-gradient-to-br from-cyber-purple/5 to-cyber-purple/10", label: "Cyber Purple", preview: "from-cyber-purple/20 to-cyber-purple/30" },
  { value: "bg-gradient-to-br from-green-500/5 to-green-600/10", label: "Matrix Green", preview: "from-green-500/20 to-green-600/30" },
  { value: "bg-gradient-to-br from-red-500/5 to-red-600/10", label: "Alert Red", preview: "from-red-500/20 to-red-600/30" },
  { value: "bg-gradient-to-br from-orange-500/5 to-orange-600/10", label: "Warning Orange", preview: "from-orange-500/20 to-orange-600/30" },
];

export const CheatSheetManager = () => {
  const [cheatSheets, setCheatSheets] = useState<CheatSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<CheatSheet | null>(null);
  const [importMarkdown, setImportMarkdown] = useState("");
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    bg_color: backgroundOptions[0].value,
    commands: [] as CheatSheetCommand[]
  });

  const [newCommand, setNewCommand] = useState({
    command: "",
    description: "",
    category: ""
  });

  useEffect(() => {
    fetchCheatSheets();
  }, []);

  const fetchCheatSheets = async () => {
    try {
      const { data, error } = await supabase
        .from('cheat_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast commands from Json to CheatSheetCommand[]
      const typedData = (data || []).map(sheet => ({
        ...sheet,
        commands: sheet.commands as unknown as CheatSheetCommand[]
      }));
      
      setCheatSheets(typedData);
    } catch (error) {
      console.error('Error fetching cheat sheets:', error);
      toast({
        title: "Error",
        description: "Failed to load cheat sheets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      bg_color: backgroundOptions[0].value,
      commands: []
    });
    setNewCommand({ command: "", description: "", category: "" });
  };

  const addCommand = () => {
    if (!newCommand.command || !newCommand.description || !newCommand.category) {
      toast({
        title: "Error",
        description: "Please fill in all command fields",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      commands: [...prev.commands, { ...newCommand }]
    }));
    setNewCommand({ command: "", description: "", category: "" });
  };

  const removeCommand = (index: number) => {
    setFormData(prev => ({
      ...prev,
      commands: prev.commands.filter((_, i) => i !== index)
    }));
  };

  const handleImportPreview = () => {
    try {
      const parsed = parseCheatSheetMarkdown(importMarkdown);
      setImportPreview(parsed);
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to parse markdown",
        variant: "destructive",
      });
      setImportPreview([]);
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const sheet of importPreview) {
      try {
        const { error } = await supabase
          .from('cheat_sheets')
          .insert({
            title: sheet.title,
            category: sheet.category,
            description: sheet.description,
            bg_color: sheet.bg_color,
            commands: sheet.commands,
            created_by: null
          });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Failed to import cheat sheet:', error);
        errorCount++;
      }
    }

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setImportMarkdown("");
    setImportPreview([]);
    
    toast({
      title: "Import Complete",
      description: `Successfully imported ${successCount} cheat sheet(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      variant: successCount > 0 ? "default" : "destructive",
    });

    if (successCount > 0) {
      fetchCheatSheets();
    }
  };

  const downloadTemplate = () => {
    const template = generateCheatSheetTemplate();
    const blob = new Blob([template], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cheat-sheet-template.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveCheatSheet = async () => {
    if (!formData.title || !formData.category || formData.commands.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one command",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingSheet) {
        const { error } = await supabase
          .from('cheat_sheets')
          .update({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            bg_color: formData.bg_color,
            commands: formData.commands as any
          })
          .eq('id', editingSheet.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Cheat sheet updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('cheat_sheets')
          .insert({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            bg_color: formData.bg_color,
            commands: formData.commands as any
          });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Cheat sheet created successfully"
        });
      }

      fetchCheatSheets();
      setIsCreateDialogOpen(false);
      setEditingSheet(null);
      resetForm();
    } catch (error) {
      console.error('Error saving cheat sheet:', error);
      toast({
        title: "Error",
        description: "Failed to save cheat sheet",
        variant: "destructive"
      });
    }
  };

  const deleteCheatSheet = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cheat_sheets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Cheat sheet deleted successfully"
      });
      fetchCheatSheets();
    } catch (error) {
      console.error('Error deleting cheat sheet:', error);
      toast({
        title: "Error",
        description: "Failed to delete cheat sheet",
        variant: "destructive"
      });
    }
  };

  const duplicateCheatSheet = async (sheet: CheatSheet) => {
    try {
      const { error } = await supabase
        .from('cheat_sheets')
        .insert({
          title: `${sheet.title} (Copy)`,
          description: sheet.description,
          category: sheet.category,
          bg_color: sheet.bg_color,
          commands: sheet.commands as any
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Cheat sheet duplicated successfully"
      });
      fetchCheatSheets();
    } catch (error) {
      console.error('Error duplicating cheat sheet:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate cheat sheet",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (sheet: CheatSheet) => {
    setFormData({
      title: sheet.title,
      description: sheet.description || "",
      category: sheet.category,
      bg_color: sheet.bg_color,
      commands: sheet.commands
    });
    setEditingSheet(sheet);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingSheet(null);
    resetForm();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading cheat sheets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cheat Sheet Management</h2>
          <p className="text-muted-foreground">Manage quick reference command sheets</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSheet ? "Edit Cheat Sheet" : "Create New Cheat Sheet"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., PowerView Quick Reference"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Active Directory"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the cheat sheet"
                  rows={2}
                />
              </div>

              {/* Background Color */}
              <div>
                <label className="text-sm font-medium">Background Style</label>
                <Select value={formData.bg_color} onValueChange={(value) => setFormData(prev => ({ ...prev, bg_color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {backgroundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-gradient-to-br ${option.preview}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Command Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Add Command</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Command</label>
                    <Input
                      value={newCommand.command}
                      onChange={(e) => setNewCommand(prev => ({ ...prev, command: e.target.value }))}
                      placeholder="e.g., Get-NetUser"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={newCommand.description}
                      onChange={(e) => setNewCommand(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Get all domain users"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={newCommand.category}
                      onChange={(e) => setNewCommand(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., User Enum"
                    />
                  </div>
                </div>
                <Button onClick={addCommand} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Command
                </Button>
              </div>

              {/* Commands List */}
              <div className="space-y-2">
                <h3 className="font-medium">Commands ({formData.commands.length})</h3>
                {formData.commands.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No commands added yet</p>
                ) : (
                  <div className="space-y-2">
                    {formData.commands.map((cmd, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded bg-muted/20">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-primary">{cmd.command}</code>
                            <Badge variant="outline" className="text-xs">
                              {cmd.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{cmd.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCommand(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={saveCheatSheet}>
                  {editingSheet ? "Update" : "Create"} Cheat Sheet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Cheat Sheets from Markdown</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Markdown Content</label>
                <Textarea
                  placeholder="Paste your markdown content here..."
                  value={importMarkdown}
                  onChange={(e) => setImportMarkdown(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleImportPreview}>
                  Preview
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importPreview.length === 0 || isImporting}
                >
                  {isImporting ? "Importing..." : `Import ${importPreview.length} Sheet(s)`}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium">Preview</label>
              <div className="border rounded-lg p-4 min-h-[300px] bg-muted/50">
                {importPreview.length > 0 ? (
                  <div className="space-y-4">
                    {importPreview.map((sheet, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold">{sheet.title}</h3>
                            <Badge variant="secondary">{sheet.category}</Badge>
                          </div>
                          {sheet.description && (
                            <p className="text-sm text-muted-foreground">{sheet.description}</p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {sheet.commands.length} commands
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Paste markdown and click Preview to see parsed cheat sheets
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{cheatSheets.length}</div>
            <p className="text-sm text-muted-foreground">Total Cheat Sheets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {cheatSheets.reduce((acc, sheet) => acc + sheet.commands.length, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Commands</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(cheatSheets.map(sheet => sheet.category)).size}
            </div>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Cheat Sheets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cheatSheets.map((sheet) => (
          <Card key={sheet.id} className={`${sheet.bg_color} border-border/30`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg text-foreground">{sheet.title}</CardTitle>
                  {sheet.description && (
                    <p className="text-sm text-muted-foreground mt-1">{sheet.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{sheet.category}</Badge>
                    <Badge variant="outline">{sheet.commands.length} commands</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateCheatSheet(sheet)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(sheet)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Cheat Sheet</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{sheet.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCheatSheet(sheet.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="max-h-40 overflow-y-auto space-y-1">
                {sheet.commands.slice(0, 5).map((cmd, index) => (
                  <div key={index} className="text-xs p-2 rounded bg-muted/20">
                    <code className="text-primary">{cmd.command}</code>
                    <span className="text-muted-foreground ml-2">- {cmd.description}</span>
                  </div>
                ))}
                {sheet.commands.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{sheet.commands.length - 5} more commands
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {cheatSheets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">No Cheat Sheets</h3>
            <p className="text-muted-foreground mb-4">
              Create your first cheat sheet to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Cheat Sheet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};