import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Upload, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { migrateTechniquesToDatabase, fetchTechniquesFromDatabase, DatabaseTechnique } from "@/lib/techniqueDataMigration";

const PHASES = [
  'Reconnaissance',
  'Enumeration', 
  'Initial Access',
  'Credential Access',
  'Lateral Movement',
  'Privilege Escalation',
  'Persistence',
  'Collection',
  'Command and Control'
];

const TechniqueManager = () => {
  const [techniques, setTechniques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phase: '',
    tags: '',
    tools: '',
    category: '',
    when_to_use: '',
    how_to_use: '',
    detection: '',
    mitigation: '',
    reference_links: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTechniques();
  }, []);

  const loadTechniques = async () => {
    setLoading(true);
    try {
      const data = await fetchTechniquesFromDatabase();
      setTechniques(data);
    } catch (error) {
      console.error('Error loading techniques:', error);
      toast({
        title: "Error",
        description: "Failed to load techniques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    setLoading(true);
    try {
      const success = await migrateTechniquesToDatabase();
      if (success) {
        toast({
          title: "Success",
          description: "Sample techniques migrated to database successfully",
        });
        await loadTechniques();
      } else {
        toast({
          title: "Error", 
          description: "Failed to migrate techniques",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Error",
        description: "Migration failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      phase: '',
      tags: '',
      tools: '',
      category: '',
      when_to_use: '',
      how_to_use: '',
      detection: '',
      mitigation: '',
      reference_links: ''
    });
    setEditingTechnique(null);
  };

  const openEditDialog = (technique: any) => {
    setEditingTechnique(technique);
    setFormData({
      title: technique.title || '',
      description: technique.description || '',
      phase: technique.phase || '',
      tags: Array.isArray(technique.tags) ? technique.tags.join(', ') : '',
      tools: Array.isArray(technique.tools) ? technique.tools.join(', ') : '',
      category: technique.category || '',
      when_to_use: Array.isArray(technique.when_to_use) ? technique.when_to_use.join('\n') : '',
      how_to_use: Array.isArray(technique.how_to_use) ? technique.how_to_use.join('\n') : '',
      detection: Array.isArray(technique.detection) ? technique.detection.join('\n') : '',
      mitigation: Array.isArray(technique.mitigation) ? technique.mitigation.join('\n') : '',
      reference_links: JSON.stringify(technique.reference_links || [], null, 2)
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const techniqueData: DatabaseTechnique = {
        title: formData.title,
        description: formData.description,
        phase: formData.phase,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        tools: formData.tools.split(',').map(t => t.trim()).filter(Boolean),
        category: formData.category || 'General',
        when_to_use: formData.when_to_use.split('\n').filter(Boolean),
        how_to_use: formData.how_to_use.split('\n').filter(Boolean),
        detection: formData.detection.split('\n').filter(Boolean),
        mitigation: formData.mitigation.split('\n').filter(Boolean),
        reference_links: formData.reference_links ? JSON.parse(formData.reference_links) : [],
        commands: []
      };

      if (editingTechnique) {
        const { error } = await supabase
          .from('techniques')
          .update(techniqueData)
          .eq('id', editingTechnique.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Technique updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('techniques')
          .insert([techniqueData]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Technique created successfully",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      await loadTechniques();
      
    } catch (error) {
      console.error('Error saving technique:', error);
      toast({
        title: "Error",
        description: "Failed to save technique",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (techniqueId: string) => {
    if (!confirm('Are you sure you want to delete this technique?')) return;
    
    try {
      const { error } = await supabase
        .from('techniques')
        .delete()
        .eq('id', techniqueId);
      
      if (error) throw error;
      
      toast({
        title: "Success", 
        description: "Technique deleted successfully",
      });
      
      await loadTechniques();
    } catch (error) {
      console.error('Error deleting technique:', error);
      toast({
        title: "Error",
        description: "Failed to delete technique",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Technique Management</h2>
          <p className="text-muted-foreground">Manage cybersecurity techniques and their details</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleMigration} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Migrate Sample Data
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Technique
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTechnique ? 'Edit Technique' : 'Add New Technique'}
                </DialogTitle>
                <DialogDescription>
                  {editingTechnique ? 'Update technique details' : 'Create a new cybersecurity technique'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phase">Phase</Label>
                    <Select value={formData.phase} onValueChange={(value) => setFormData({...formData, phase: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                      <SelectContent>
                        {PHASES.map(phase => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="Network, Credential, Attack"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tools">Tools (comma-separated)</Label>
                    <Input
                      id="tools"
                      value={formData.tools}
                      onChange={(e) => setFormData({...formData, tools: e.target.value})}
                      placeholder="Nmap, CrackMapExec, Hydra"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reference_links">Reference Links (JSON format)</Label>
                  <Textarea
                    id="reference_links"
                    value={formData.reference_links}
                    onChange={(e) => setFormData({...formData, reference_links: e.target.value})}
                    placeholder='[{"title": "MITRE ATT&CK", "url": "https://attack.mitre.org", "description": "Official documentation"}]'
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTechnique ? 'Update' : 'Create'} Technique
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {techniques.map((technique) => (
          <Card key={technique.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{technique.title}</CardTitle>
                  <CardDescription>{technique.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(technique)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(technique.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">{technique.phase}</Badge>
                  <Badge variant="outline">{technique.category}</Badge>
                </div>
                {technique.tags && technique.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {technique.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {technique.reference_links && technique.reference_links.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {technique.reference_links.length} reference link(s)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {techniques.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No techniques found. Click "Migrate Sample Data" to import sample techniques.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TechniqueManager;