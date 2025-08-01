import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Edit, Plus, Upload, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseMultipleScenarios, sampleScenarioMarkdown } from "@/lib/scenarioMarkdownParser";
import { useNavigationPhases } from "@/hooks/useNavigationPhases";

interface Scenario {
  id: string;
  title: string;
  description?: string;
  phase: string;
  tags: string[];
  linked_techniques: string[];
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ScenarioManager = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [markdownInput, setMarkdownInput] = useState('');
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [showSample, setShowSample] = useState(false);
  const { toast } = useToast();
  const { phases } = useNavigationPhases();

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setScenarios(data || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast({
        title: "Error",
        description: "Failed to fetch scenarios",
        variant: "destructive",
      });
    }
  };

  const handleMarkdownUpload = async () => {
    if (!markdownInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter markdown content",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedScenarios = parseMultipleScenarios(markdownInput);
      
      if (parsedScenarios.length === 0) {
        toast({
          title: "Error",
          description: "No valid scenarios found in markdown",
          variant: "destructive",
        });
        return;
      }

      // Get the highest order_index to append new scenarios
      const maxOrder = scenarios.length > 0 ? Math.max(...scenarios.map(s => s.order_index)) : 0;

      const scenariosToInsert = parsedScenarios.map((scenario, index) => ({
        ...scenario,
        order_index: maxOrder + index + 1,
      }));

      const { error } = await supabase
        .from('scenarios')
        .insert(scenariosToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${parsedScenarios.length} scenario(s) successfully`,
      });

      setMarkdownInput('');
      fetchScenarios();
    } catch (error) {
      console.error('Error uploading scenarios:', error);
      toast({
        title: "Error",
        description: "Failed to upload scenarios",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scenario deleted successfully",
      });

      fetchScenarios();
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast({
        title: "Error",
        description: "Failed to delete scenario",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
  };

  const handleSaveEdit = async () => {
    if (!editingScenario) return;

    try {
      const { error } = await supabase
        .from('scenarios')
        .update({
          title: editingScenario.title,
          description: editingScenario.description,
          phase: editingScenario.phase,
          tags: editingScenario.tags,
          linked_techniques: editingScenario.linked_techniques,
          is_active: editingScenario.is_active,
        })
        .eq('id', editingScenario.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scenario updated successfully",
      });

      setEditingScenario(null);
      fetchScenarios();
    } catch (error) {
      console.error('Error updating scenario:', error);
      toast({
        title: "Error",
        description: "Failed to update scenario",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = async () => {
    try {
      const maxOrder = scenarios.length > 0 ? Math.max(...scenarios.map(s => s.order_index)) : 0;
      
      const { error } = await supabase
        .from('scenarios')
        .insert([{
          title: 'New Scenario',
          description: 'Scenario description',
          phase: phases.length > 0 ? phases[0].label : 'Active Reconnaissance',
          tags: [],
          linked_techniques: [],
          order_index: maxOrder + 1,
          is_active: true,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "New scenario added successfully",
      });

      fetchScenarios();
    } catch (error) {
      console.error('Error adding scenario:', error);
      toast({
        title: "Error",
        description: "Failed to add new scenario",
        variant: "destructive",
      });
    }
  };

  const updateEditingScenario = (field: keyof Scenario, value: any) => {
    if (!editingScenario) return;
    setEditingScenario({ ...editingScenario, [field]: value });
  };

  const addTag = (tag: string) => {
    if (!editingScenario || !tag.trim()) return;
    const newTags = [...editingScenario.tags, tag.trim()];
    updateEditingScenario('tags', newTags);
  };

  const removeTag = (index: number) => {
    if (!editingScenario) return;
    const newTags = editingScenario.tags.filter((_, i) => i !== index);
    updateEditingScenario('tags', newTags);
  };

  const addLinkedTechnique = (technique: string) => {
    if (!editingScenario || !technique.trim()) return;
    const newTechniques = [...editingScenario.linked_techniques, technique.trim()];
    updateEditingScenario('linked_techniques', newTechniques);
  };

  const removeLinkedTechnique = (index: number) => {
    if (!editingScenario) return;
    const newTechniques = editingScenario.linked_techniques.filter((_, i) => i !== index);
    updateEditingScenario('linked_techniques', newTechniques);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scenario Management</h2>
          <p className="text-muted-foreground">Manage attack scenarios and link them to techniques</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Scenario
        </Button>
      </div>

      {/* Markdown Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Scenarios from Markdown
          </CardTitle>
          <CardDescription>
            Upload multiple scenarios using markdown format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="markdown-input">Markdown Content</Label>
            <Textarea
              id="markdown-input"
              placeholder="Paste your scenario markdown here..."
              value={markdownInput}
              onChange={(e) => setMarkdownInput(e.target.value)}
              rows={10}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleMarkdownUpload} variant="default">
              Import Scenarios
            </Button>
            <Button 
              onClick={() => {
                setShowSample(!showSample);
                if (!showSample) {
                  setMarkdownInput(sampleScenarioMarkdown);
                }
              }} 
              variant="outline"
            >
              {showSample ? 'Clear' : 'Show Sample'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios List */}
      <div className="grid gap-4">
        {scenarios.map((scenario) => (
          <Card key={scenario.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{scenario.title}</CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{scenario.phase}</Badge>
                <Badge variant={scenario.is_active ? "default" : "secondary"}>
                  {scenario.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(scenario)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(scenario.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scenario.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {scenario.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {scenario.linked_techniques.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Linked Techniques ({scenario.linked_techniques.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {scenario.linked_techniques.map((technique, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {editingScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Scenario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingScenario.title}
                  onChange={(e) => updateEditingScenario('title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingScenario.description || ''}
                  onChange={(e) => updateEditingScenario('description', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phase">Phase</Label>
                <select
                  id="edit-phase"
                  value={editingScenario.phase}
                  onChange={(e) => updateEditingScenario('phase', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {phases.filter(phase => phase.label !== 'All Techniques').map((phase) => (
                    <option key={phase.name} value={phase.label}>
                      {phase.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {editingScenario.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(index)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add tag and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Linked Techniques</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {editingScenario.linked_techniques.map((technique, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeLinkedTechnique(index)}>
                      {technique} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add technique and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addLinkedTechnique(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editingScenario.is_active}
                  onChange={(e) => updateEditingScenario('is_active', e.target.checked)}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={handleSaveEdit}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditingScenario(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};