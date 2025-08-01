import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigationPhases } from '@/hooks/useNavigationPhases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, GripVertical, Search, Grid3X3, Zap, Send, Target, Download, Radio, Flag, Navigation, RefreshCw } from 'lucide-react';

const iconOptions = [
  { value: 'Grid3X3', label: 'Grid', icon: Grid3X3 },
  { value: 'Search', label: 'Search', icon: Search },
  { value: 'Zap', label: 'Zap', icon: Zap },
  { value: 'Send', label: 'Send', icon: Send },
  { value: 'Target', label: 'Target', icon: Target },
  { value: 'Download', label: 'Download', icon: Download },
  { value: 'Radio', label: 'Radio', icon: Radio },
  { value: 'Flag', label: 'Flag', icon: Flag },
  { value: 'Navigation', label: 'Navigation', icon: Navigation },
];

interface PhaseFormData {
  name: string;
  label: string;
  description: string;
  icon: string;
}

export const NavigationManager = () => {
  const { phases, loading, createPhase, updatePhase, deletePhase, reorderPhases, refetch } = useNavigationPhases();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState<PhaseFormData>({
    name: '',
    label: '',
    description: '',
    icon: 'Navigation',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPhase) {
      await updatePhase(editingPhase.id, formData);
    } else {
      const maxOrder = Math.max(...phases.map(p => p.order_index), -1);
      await createPhase({
        ...formData,
        order_index: maxOrder + 1,
        is_active: true,
      });
    }
    
    setIsDialogOpen(false);
    setEditingPhase(null);
    setFormData({ name: '', label: '', description: '', icon: 'Navigation' });
  };

  const handleEdit = (phase: any) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name,
      label: phase.label,
      description: phase.description || '',
      icon: phase.icon,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (phaseId: string) => {
    await deletePhase(phaseId);
  };

  const handleRefreshNavigation = async () => {
    setIsRefreshing(true);
    try {
      // Trigger refresh in current hook
      await refetch();
      
      // Dispatch global event to refresh all navigation instances
      window.dispatchEvent(new CustomEvent('refreshNavigation'));
      
      toast({
        title: "Success",
        description: "Navigation synchronized successfully",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh navigation",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Navigation;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading navigation phases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Navigation Management</h2>
          <p className="text-muted-foreground">Manage navigation phases and their configurations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshNavigation}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Navigation
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPhase(null);
              setFormData({ name: '', label: '', description: '', icon: 'Navigation' });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Phase
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPhase ? 'Edit Phase' : 'Create New Phase'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Phase Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., reconnaissance"
                  required
                />
              </div>
              <div>
                <Label htmlFor="label">Display Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Reconnaissance"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this phase"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPhase ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Order</TableHead>
                <TableHead className="w-[50px]">Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((phase) => {
                const IconComponent = getIconComponent(phase.icon);
                return (
                  <TableRow key={phase.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {phase.order_index}
                      </div>
                    </TableCell>
                    <TableCell>
                      <IconComponent className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{phase.name}</TableCell>
                    <TableCell className="font-medium">{phase.label}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {phase.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={phase.is_active ? "default" : "secondary"}>
                        {phase.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(phase)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Phase</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{phase.label}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(phase.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};