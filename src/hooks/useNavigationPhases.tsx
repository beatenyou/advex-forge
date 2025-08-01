import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NavigationPhase {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useNavigationPhases = () => {
  const [phases, setPhases] = useState<NavigationPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPhases = async () => {
    try {
      const { data, error } = await supabase
        .from('navigation_phases')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setPhases(data || []);
    } catch (error) {
      console.error('Error fetching navigation phases:', error);
      toast({
        title: "Error",
        description: "Failed to load navigation phases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePhase = async (id: string, updates: Partial<NavigationPhase>) => {
    try {
      const { error } = await supabase
        .from('navigation_phases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchPhases();
      toast({
        title: "Success",
        description: "Phase updated successfully",
      });
    } catch (error) {
      console.error('Error updating phase:', error);
      toast({
        title: "Error",
        description: "Failed to update phase",
        variant: "destructive",
      });
    }
  };

  const createPhase = async (phase: Omit<NavigationPhase, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('navigation_phases')
        .insert([phase]);

      if (error) throw error;
      
      await fetchPhases();
      toast({
        title: "Success",
        description: "Phase created successfully",
      });
    } catch (error) {
      console.error('Error creating phase:', error);
      toast({
        title: "Error",
        description: "Failed to create phase",
        variant: "destructive",
      });
    }
  };

  const deletePhase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('navigation_phases')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      await fetchPhases();
      toast({
        title: "Success",
        description: "Phase deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting phase:', error);
      toast({
        title: "Error",
        description: "Failed to delete phase",
        variant: "destructive",
      });
    }
  };

  const reorderPhases = async (reorderedPhases: NavigationPhase[]) => {
    try {
      const updates = reorderedPhases.map((phase, index) => ({
        id: phase.id,
        order_index: index
      }));

      for (const update of updates) {
        await supabase
          .from('navigation_phases')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }
      
      await fetchPhases();
      toast({
        title: "Success",
        description: "Phase order updated successfully",
      });
    } catch (error) {
      console.error('Error reordering phases:', error);
      toast({
        title: "Error",
        description: "Failed to reorder phases",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPhases();
  }, []);

  return {
    phases,
    loading,
    refetch: fetchPhases,
    updatePhase,
    createPhase,
    deletePhase,
    reorderPhases,
  };
};