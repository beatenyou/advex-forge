import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Hash, Edit, Trash2, Users, RefreshCw, Merge } from 'lucide-react';

interface TagUsage {
  tag: string;
  count: number;
  techniques: Array<{ id: string; title: string }>;
}

export const TagManager: React.FC = () => {
  const [tagUsage, setTagUsage] = useState<TagUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadTagUsage();
  }, []);

  const loadTagUsage = async () => {
    try {
      setLoading(true);
      const { data: techniques, error } = await supabase
        .from('techniques')
        .select('id, title, tags')
        .eq('is_active', true);

      if (error) throw error;

      // Create tag usage map
      const tagMap = new Map<string, TagUsage>();
      
      techniques?.forEach(technique => {
        technique.tags.forEach((tag: string) => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, {
              tag,
              count: 0,
              techniques: []
            });
          }
          const usage = tagMap.get(tag)!;
          usage.count++;
          usage.techniques.push({ id: technique.id, title: technique.title });
        });
      });

      setTagUsage(Array.from(tagMap.values()).sort((a, b) => b.count - a.count));
    } catch (error) {
      console.error('Error loading tag usage:', error);
      toast({
        title: "Error",
        description: "Failed to load tag usage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!newTag.trim() || newTag === oldTag) return;

    try {
      // Get all techniques with this tag
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, tags')
        .contains('tags', [oldTag]);

      if (fetchError) throw fetchError;

      // Update each technique
      for (const technique of techniques || []) {
        const updatedTags = technique.tags.map((tag: string) => 
          tag === oldTag ? newTag.trim() : tag
        );

        const { error: updateError } = await supabase
          .from('techniques')
          .update({ tags: updatedTags })
          .eq('id', technique.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: `Renamed tag "${oldTag}" to "${newTag}" across ${techniques?.length || 0} techniques`,
      });

      setEditingTag(null);
      setNewTagName('');
      loadTagUsage();
    } catch (error) {
      console.error('Error renaming tag:', error);
      toast({
        title: "Error",
        description: "Failed to rename tag",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    try {
      // Get all techniques with this tag
      const { data: techniques, error: fetchError } = await supabase
        .from('techniques')
        .select('id, tags')
        .contains('tags', [tagToDelete]);

      if (fetchError) throw fetchError;

      // Remove tag from each technique
      for (const technique of techniques || []) {
        const updatedTags = technique.tags.filter((tag: string) => tag !== tagToDelete);

        const { error: updateError } = await supabase
          .from('techniques')
          .update({ tags: updatedTags })
          .eq('id', technique.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: `Deleted tag "${tagToDelete}" from ${techniques?.length || 0} techniques`,
      });

      loadTagUsage();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive"
      });
    }
  };

  const filteredTags = tagUsage.filter(item =>
    item.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const orphanedTags = tagUsage.filter(item => item.count === 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tag Management</h2>
          <p className="text-muted-foreground">Manage tags used across all techniques</p>
        </div>
        <Button onClick={loadTagUsage} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tagUsage.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tagUsage.filter(t => t.count > 0).length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orphaned Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{orphanedTags.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Usage</CardTitle>
          <CardDescription>
            All tags and their usage across techniques
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>Techniques</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map((item) => (
                  <TableRow key={item.tag}>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center w-fit">
                        <Hash className="w-3 h-3 mr-1" />
                        {item.tag}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${item.count === 0 ? 'text-destructive' : ''}`}>
                        {item.count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {item.techniques.slice(0, 3).map(t => t.title).join(', ')}
                          {item.techniques.length > 3 && ` +${item.techniques.length - 3} more`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTag(item.tag);
                                setNewTagName(item.tag);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rename Tag</DialogTitle>
                              <DialogDescription>
                                This will update the tag across all {item.count} techniques
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="newTagName">New tag name</Label>
                                <Input
                                  id="newTagName"
                                  value={newTagName}
                                  onChange={(e) => setNewTagName(e.target.value)}
                                  placeholder="Enter new tag name"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingTag(null);
                                    setNewTagName('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => handleRenameTag(item.tag, newTagName)}
                                  disabled={!newTagName.trim() || newTagName === item.tag}
                                >
                                  Rename Tag
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the tag "{item.tag}" from all {item.count} techniques.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTag(item.tag)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Tag
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};