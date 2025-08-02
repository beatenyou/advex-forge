import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Upload, Download, RefreshCw, Search, Calendar, User, Clock, Navigation } from "lucide-react";
import { CommandTemplateEditor } from "./CommandTemplateEditor";
import { BulkTechniqueImporter } from "./BulkTechniqueImporter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { migrateTechniquesToDatabase, fetchTechniquesFromDatabase, DatabaseTechnique } from "@/lib/techniqueDataMigration";
import { format, formatDistanceToNow, isAfter, isBefore, subDays, subWeeks, subMonths } from "date-fns";
import { useNavigationPhases } from "@/hooks/useNavigationPhases";

const TechniqueManager = () => {
  const [techniques, setTechniques] = useState<any[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<any>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');
  const [formData, setFormData] = useState({
    title: '',
    mitre_id: '',
    description: '',
    phases: [] as string[],
    tags: '',
    tools: '',
    category: '',
    when_to_use: '',
    how_to_use: '',
    detection: '',
    mitigation: '',
    reference_links: '',
    commands: ''
  });
  const { toast } = useToast();
  const { phases, loading: phasesLoading } = useNavigationPhases();

  // Phase mapping to translate legacy technique phases to navigation phase labels
  const createPhaseMapping = () => {
    const mapping: Record<string, string> = {
      'Reconnaissance': 'Active Reconnaissance',
      'Command and Control': 'C2',
      'Initial Access': 'Establish Foothold',
      'Credential Access': 'Privilege Escalation', // Map to closest match
      'Discovery': 'Enumeration', // Map to closest match
    };
    return mapping;
  };

  const phaseMapping = createPhaseMapping();

  // Function to normalize and map phases
  const normalizeAndMapPhase = (phase: string): string => {
    const normalized = phase?.trim();
    return phaseMapping[normalized] || normalized;
  };

  useEffect(() => {
    loadTechniques();
  }, []);

  useEffect(() => {
    filterAndSortTechniques();
  }, [techniques, searchTerm, dateFilter, phaseFilter, sortBy]);

  const loadTechniques = async () => {
    setLoading(true);
    try {
      const data = await fetchTechniquesFromDatabase();
      setTechniques(data);
      
      // Load profiles for created_by users
      const userIds = [...new Set(data.map(t => t.created_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);
        
        const profileMap = {};
        profileData?.forEach(profile => {
          profileMap[profile.user_id] = profile;
        });
        setProfiles(profileMap);
      }
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

  const filterAndSortTechniques = () => {
    let filtered = [...techniques];

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(technique => 
        technique.title?.toLowerCase().includes(term) ||
        technique.description?.toLowerCase().includes(term) ||
        technique.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter !== 'all') {
      let cutoffDate;
      switch (dateFilter) {
        case 'today':
          cutoffDate = subDays(now, 1);
          break;
        case 'week':
          cutoffDate = subWeeks(now, 1);
          break;
        case 'month':
          cutoffDate = subMonths(now, 1);
          break;
      }
      
      if (cutoffDate) {
        filtered = filtered.filter(technique => 
          isAfter(new Date(technique.created_at), cutoffDate)
        );
      }
    }

    // Phase filter with phase mapping support
    if (phaseFilter !== 'all') {
      console.log('Phase filtering with:', phaseFilter);
      console.log('Available navigation phases:', phases.map(p => p.label));
      
      filtered = filtered.filter(technique => {
        const targetPhase = phaseFilter;
        
        // Handle both legacy phase field and new phases array
        if (technique.phases && Array.isArray(technique.phases)) {
          // Check for exact match or mapped match
          const hasExactMatch = technique.phases.some(p => p?.trim() === targetPhase);
          const hasMappedMatch = technique.phases.some(p => normalizeAndMapPhase(p?.trim()) === targetPhase);
          
          console.log(`Technique "${technique.title}" phases:`, technique.phases, 'Exact match:', hasExactMatch, 'Mapped match:', hasMappedMatch);
          return hasExactMatch || hasMappedMatch;
        }
        
        // Check legacy phase field for exact or mapped match
        const exactMatch = technique.phase?.trim() === targetPhase;
        const mappedMatch = normalizeAndMapPhase(technique.phase?.trim()) === targetPhase;
        
        console.log(`Technique "${technique.title}" legacy phase:`, technique.phase, 'Exact match:', exactMatch, 'Mapped match:', mappedMatch);
        return exactMatch || mappedMatch;
      });
      
      console.log(`Filtered to ${filtered.length} techniques for phase "${phaseFilter}"`);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '');
        default:
          return 0;
      }
    });

    setFilteredTechniques(filtered);
  };

  const handleMigration = async () => {
    setLoading(true);
    try {
      const success = await migrateTechniquesToDatabase();
      if (success) {
        toast({
          title: "Success",
          description: "All data deleted and sample techniques restored",
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
      mitre_id: '',
      description: '',
      phases: [],
      tags: '',
      tools: '',
      category: '',
      when_to_use: '',
      how_to_use: '',
      detection: '',
      mitigation: '',
      reference_links: '',
      commands: ''
    });
    setEditingTechnique(null);
  };

  const openEditDialog = (technique: any) => {
    setEditingTechnique(technique);
    setFormData({
      title: technique.title || '',
      mitre_id: technique.mitre_id || '',
      description: technique.description || '',
      phases: technique.phases || (technique.phase ? [technique.phase] : []),
      tags: Array.isArray(technique.tags) ? technique.tags.join(', ') : '',
      tools: Array.isArray(technique.tools) ? technique.tools.join(', ') : '',
      category: technique.category || '',
      when_to_use: Array.isArray(technique.when_to_use) ? technique.when_to_use.join('\n') : '',
      how_to_use: Array.isArray(technique.how_to_use) ? technique.how_to_use.join('\n') : '',
      detection: Array.isArray(technique.detection) ? technique.detection.join('\n') : '',
      mitigation: Array.isArray(technique.mitigation) ? technique.mitigation.join('\n') : '',
      reference_links: JSON.stringify(technique.reference_links || [], null, 2),
      commands: JSON.stringify(technique.commands || [], null, 2)
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const techniqueData: any = {
        title: formData.title,
        mitre_id: formData.mitre_id || null,
        description: formData.description,
        phases: formData.phases.length > 0 ? formData.phases : ['Reconnaissance'],
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        tools: formData.tools.split(',').map(t => t.trim()).filter(Boolean),
        category: formData.category || 'General',
        when_to_use: formData.when_to_use.split('\n').filter(Boolean),
        how_to_use: formData.how_to_use.split('\n').filter(Boolean),
        detection: formData.detection.split('\n').filter(Boolean),
        mitigation: formData.mitigation.split('\n').filter(Boolean),
        reference_links: formData.reference_links ? JSON.parse(formData.reference_links) : [],
        commands: formData.commands ? JSON.parse(formData.commands) : []
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
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('techniques')
          .insert([{ ...techniqueData, created_by: user?.id }]);
        
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
          <p className="text-muted-foreground">
            Manage cybersecurity techniques and their details • {filteredTechniques.length} of {techniques.length} techniques
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsBulkImportOpen(true)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Technique Data?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="font-semibold text-destructive">This will permanently delete ALL existing techniques from the database.</p>
                  <p>This includes both custom techniques and imported data.</p>
                  <p>Sample techniques will be restored, but your custom work will be lost forever.</p>
                  <p className="font-semibold">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMigration} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Delete All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                    <Label htmlFor="mitre_id">MITRE ID</Label>
                    <Input
                      id="mitre_id"
                      value={formData.mitre_id}
                      onChange={(e) => setFormData({...formData, mitre_id: e.target.value})}
                      placeholder="T1110.003"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: T#### or T####.### (e.g., T1110 or T1110.003)
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phases">Phases</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {phases.filter(phase => phase.label !== 'All Techniques').map(phase => (
                        <div key={phase.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`phase-${phase.name}`}
                            checked={formData.phases.includes(phase.label)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, phases: [...formData.phases, phase.label]});
                              } else {
                                setFormData({...formData, phases: formData.phases.filter(p => p !== phase.label)});
                              }
                            }}
                            className="rounded border-border"
                          />
                          <Label htmlFor={`phase-${phase.name}`} className="text-sm font-normal">
                            {phase.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {formData.phases.length === 0 && (
                      <p className="text-xs text-destructive mt-1">At least one phase must be selected</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="General"
                    />
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
                
                <div>
                  <Label htmlFor="commands">Command Templates</Label>
                  <CommandTemplateEditor
                    commands={formData.commands ? JSON.parse(formData.commands) : []}
                    onChange={(commands) => setFormData({...formData, commands: JSON.stringify(commands, null, 2)})}
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

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search techniques..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={phaseFilter} onValueChange={setPhaseFilter} disabled={phasesLoading}>
              <SelectTrigger>
                <Navigation className="h-4 w-4 mr-2" />
                <SelectValue placeholder={phasesLoading ? "Loading phases..." : phaseFilter === "all" ? "All Phases" : phases.find(p => p.label === phaseFilter)?.label || "Select phase"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {!phasesLoading && phases.map((phase) => (
                  <SelectItem key={phase.name} value={phase.label}>
                    {phase.icon} {phase.label}
                  </SelectItem>
                ))}
                {phasesLoading && (
                  <SelectItem value="loading" disabled>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading phases...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest First</SelectItem>
                <SelectItem value="created_asc">Oldest First</SelectItem>
                <SelectItem value="updated_desc">Recently Updated</SelectItem>
                <SelectItem value="updated_asc">Least Recently Updated</SelectItem>
                <SelectItem value="title_asc">Title A-Z</SelectItem>
                <SelectItem value="title_desc">Title Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredTechniques.map((technique) => (
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
              <div className="space-y-3">
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
                
                <Separator />
                
                {/* Date and Creator Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Created {formatDistanceToNow(new Date(technique.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      Updated {formatDistanceToNow(new Date(technique.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {technique.created_by && profiles[technique.created_by] && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>
                        by {profiles[technique.created_by].display_name || profiles[technique.created_by].email}
                      </span>
                    </div>
                  )}
                  
                  {technique.reference_links && technique.reference_links.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span>{technique.reference_links.length} reference link(s)</span>
                    </div>
                  )}
                </div>
                
                {/* Exact dates on hover */}
                <div className="text-xs text-muted-foreground/70">
                  <div>Created: {format(new Date(technique.created_at), 'PPp')}</div>
                  <div>Updated: {format(new Date(technique.updated_at), 'PPp')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredTechniques.length === 0 && techniques.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No techniques found matching your search criteria.
            </p>
          </CardContent>
        </Card>
      )}
      
      {techniques.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No techniques found. Click "Migrate Sample Data" to import sample techniques.
            </p>
          </CardContent>
        </Card>
      )}

      <BulkTechniqueImporter
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportComplete={() => {
          setIsBulkImportOpen(false);
          loadTechniques();
        }}
      />
    </div>
  );
};

export default TechniqueManager;