import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crown, Save, Download, Plus, FileText, FileSpreadsheet, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TechniquePalette } from '@/components/attack-plans/TechniquePalette';
import { TechniqueDetailsPanel } from '@/components/attack-plans/TechniqueDetailsPanel';
import { AttackPlanCanvas } from '@/components/attack-plans/AttackPlanCanvas';

interface AttackPlan {
  id: string;
  title: string;
  description: string;
  plan_data: any;
  created_at: string;
  updated_at: string;
}

const AttackPlansPage: React.FC = () => {
  const { isProUser, loading: proLoading } = usePermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [planTitle, setPlanTitle] = useState('Untitled Attack Plan');
  const [planDescription, setPlanDescription] = useState('');
  const [savedPlans, setSavedPlans] = useState<AttackPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const nodeCounter = useRef(0);

  // Load saved plans
  useEffect(() => {
    if (user && isProUser) {
      loadSavedPlans();
    }
  }, [user, isProUser]);

  const loadSavedPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('attack_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load saved plans');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const savePlan = async () => {
    if (!user || !isProUser) return;
    
    setIsLoading(true);
    try {
      const planData = {
        user_id: user.id,
        title: planTitle,
        description: planDescription,
        plan_data: { nodes, edges }
      };

      if (currentPlanId) {
        const { error } = await supabase
          .from('attack_plans')
          .update(planData)
          .eq('id', currentPlanId);
        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        const { data, error } = await supabase
          .from('attack_plans')
          .insert(planData)
          .select()
          .single();
        if (error) throw error;
        setCurrentPlanId(data.id);
        toast.success('Plan saved successfully');
      }
      
      loadSavedPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlan = (plan: AttackPlan) => {
    setPlanTitle(plan.title);
    setPlanDescription(plan.description);
    setNodes(plan.plan_data.nodes || []);
    setEdges(plan.plan_data.edges || []);
    setCurrentPlanId(plan.id);
    toast.success('Plan loaded successfully');
  };

  const createNewPlan = () => {
    setPlanTitle('Untitled Attack Plan');
    setPlanDescription('');
    setNodes([]);
    setEdges([]);
    setCurrentPlanId(null);
    setSelectedNode(null);
  };

  const handleAddTechnique = (technique: any) => {
    const newNode: Node = {
      id: `technique-${Date.now()}`,
      type: 'technique',
      position: { x: Math.random() * 500, y: Math.random() * 300 },
      data: {
        label: technique.title,
        technique: technique
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
  };

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const dropData = JSON.parse(event.dataTransfer.getData('application/json'));
      
      if (dropData.type === 'phase' && reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode: Node = {
          id: `phase-${Date.now()}`,
          type: 'phase',
          position,
          data: {
            label: dropData.phase.label || dropData.phase.name,
            phase: {
              ...dropData.phase,
              name: dropData.phase.label || dropData.phase.name, // Ensure consistency
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
        toast.success(`Added "${dropData.phase.label || dropData.phase.name}" phase to canvas`);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      toast.error('Failed to add phase to canvas');
    }
  };

  const exportPlan = (format: 'pdf' | 'markdown' | 'csv') => {
    // Implementation for export functionality would go here
    toast.info(`Export to ${format.toUpperCase()} coming soon!`);
  };

  if (proLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isProUser) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Pro Feature: Attack Plans</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Attack Plans is a premium feature that allows you to create visual attack flows 
              by dragging and dropping techniques onto a canvas.
            </p>
            <div className="flex justify-center">
              <Lock className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro to access this feature and create professional attack plans.
            </p>
            <Button className="mt-6">
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </Button>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h1 className="text-2xl font-bold">Attack Plans</h1>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Pro Feature
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Plan Management */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Plans ({savedPlans.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Saved Attack Plans</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {savedPlans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h3 className="font-medium">{plan.title}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(plan.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button onClick={() => loadPlan(plan)} size="sm">
                        Load
                      </Button>
                    </div>
                  ))}
                  {savedPlans.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No saved plans yet. Create your first attack plan!
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={createNewPlan} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Plan
            </Button>

            <Button onClick={savePlan} disabled={isLoading} size="sm">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save'}
            </Button>

            {/* Export Menu */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Attack Plan</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Button 
                    onClick={() => exportPlan('pdf')} 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </Button>
                  <Button 
                    onClick={() => exportPlan('markdown')} 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as Markdown
                  </Button>
                  <Button 
                    onClick={() => exportPlan('csv')} 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Plan Title and Description */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Input
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            placeholder="Plan title..."
            className="font-medium"
          />
          <Input
            value={planDescription}
            onChange={(e) => setPlanDescription(e.target.value)}
            placeholder="Plan description..."
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Technique Palette */}
        <div className="w-80 border-r bg-card">
          <TechniquePalette onAddTechnique={(technique) => {
            console.log('Adding technique to canvas:', technique.title);
            
            // Calculate position in the center of the current viewport
            let x = 300; // Default fallback
            let y = 300; // Default fallback
            
            if (reactFlowInstance) {
              const viewport = reactFlowInstance.getViewport();
              const canvasCenter = reactFlowInstance.screenToFlowPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
              });
              
              // Add slight offset to prevent nodes from stacking exactly on top of each other
              const offset = (nodeCounter.current % 5) * 50;
              x = canvasCenter.x + offset;
              y = canvasCenter.y + offset;
            }
            
            const newNode: Node = {
              id: `technique-${Date.now()}-${nodeCounter.current}`,
              type: 'technique',
              position: { x, y },
              data: { 
                label: technique.title,
                technique: technique
              }
            };
            
            nodeCounter.current += 1;
            setNodes((nds) => [...nds, newNode]);
            toast.success(`Added ${technique.title} to canvas`);
          }} />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 relative">
            <AttackPlanCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onInit={setReactFlowInstance}
              onDrop={handleCanvasDrop}
            />
        </div>

        {/* Right Sidebar - Technique Details */}
        <div className="w-96 border-l bg-card">
          <TechniqueDetailsPanel selectedNode={selectedNode} />
        </div>
      </div>
    </div>
  );
};

export default AttackPlansPage;