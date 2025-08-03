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
        // Use ReactFlow's built-in coordinate conversion
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
              name: dropData.phase.label || dropData.phase.name,
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

  const handleAddTextBox = (position: { x: number; y: number }) => {
    if (!reactFlowInstance) return;
    
    const flowPosition = reactFlowInstance.screenToFlowPosition(position);
    
    const newNode: Node = {
      id: `text-${Date.now()}`,
      type: 'text',
      position: flowPosition,
      data: {
        content: 'Enter your text here...',
        isEditing: true,
        fontSize: 'base',
        fontWeight: 'normal'
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
    toast.success('Text box added to canvas');
  };

  const exportPlan = (format: 'html' | 'markdown' | 'csv') => {
    const planData = {
      title: planTitle,
      description: planDescription,
      nodes,
      edges,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    switch (format) {
      case 'html':
        exportToHTML(planData);
        break;
      case 'markdown':
        exportToMarkdown(planData);
        break;
      case 'csv':
        exportToCSV(planData);
        break;
    }
  };

  const exportToHTML = (planData: any) => {
    try {
      // Preserve current state before export
      const currentNodes = [...nodes];
      const currentEdges = [...edges];
      
      const printContent = generatePrintableContent(planData);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${planData.title} - Attack Plan</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                line-height: 1.6;
                color: hsl(210 40% 98%);
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: hsl(215 25% 8%);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid hsl(217 30% 18%);
                padding-bottom: 20px;
              }
              .header h1 {
                color: hsl(195 100% 50%);
                margin-bottom: 10px;
                font-size: 2rem;
                text-shadow: 0 0 10px hsl(195 100% 50% / 0.3);
              }
              .header p {
                color: hsl(215 20% 65%);
                font-size: 1.1rem;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid hsl(217 30% 18%);
                color: hsl(215 15% 50%);
                font-size: 0.9rem;
              }
              .node {
                background-color: hsl(217 30% 15%);
                border: 1px solid hsl(217 30% 25%);
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                box-shadow: 0 4px 6px hsl(215 25% 8% / 0.3);
              }
              .phase-node {
                background-color: hsl(195 100% 50%);
                border-left: 4px solid hsl(195 100% 40%);
                color: hsl(215 25% 8%);
                box-shadow: 0 0 20px hsl(195 100% 50% / 0.3);
              }
              .node h3 {
                margin: 0 0 10px 0;
                color: hsl(195 100% 50%);
                font-size: 1.2rem;
                font-weight: 600;
              }
              .phase-node h3 {
                color: hsl(215 25% 8%);
              }
              .node p {
                margin: 5px 0;
                color: hsl(215 20% 65%);
              }
              .phase-node p {
                color: hsl(215 25% 15%);
              }
              .metadata {
                font-size: 0.9rem;
                color: hsl(215 15% 50%);
                margin-top: 10px;
                font-style: italic;
              }
              .connections {
                margin-top: 30px;
                padding: 20px;
                background-color: hsl(217 30% 12%);
                border-radius: 8px;
                border: 1px solid hsl(217 30% 20%);
              }
              .connections h3 {
                color: hsl(195 100% 50%);
                margin-bottom: 15px;
              }
              .connection {
                background-color: hsl(217 30% 18%);
                padding: 10px;
                margin: 8px 0;
                border-radius: 6px;
                border-left: 3px solid hsl(195 100% 50%);
              }
              .connection code {
                background-color: hsl(217 30% 25%);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 0.9rem;
                color: hsl(210 40% 85%);
              }
              .tool-tag {
                background-color: hsl(217 30% 20%);
                color: hsl(195 100% 50%);
                padding: 2px 8px;
                margin: 2px;
                border-radius: 4px;
                border: 1px solid hsl(195 100% 50% / 0.3);
                display: inline-block;
                font-size: 0.85rem;
                font-weight: 500;
              }
              .command-block {
                background-color: hsl(217 30% 15%);
                color: hsl(210 40% 90%);
                padding: 12px;
                margin: 8px 0;
                border-radius: 6px;
                border: 1px solid hsl(217 30% 25%);
                overflow-x: auto;
                font-family: 'Courier New', Consolas, monospace;
                font-size: 0.9rem;
                line-height: 1.4;
              }
              .command-block code {
                color: inherit;
                background: none;
                padding: 0;
                font-family: inherit;
              }
              @media print {
                body { max-width: none; margin: 0; padding: 15px; }
                .node { break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `;

      // Use setTimeout to defer the download and prevent state clearing
      setTimeout(() => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${planData.title.replace(/\s+/g, '-').toLowerCase()}-attack-plan.html`;
        a.style.display = 'none'; // Hide the link element
        
        // Prevent any potential focus events
        a.addEventListener('click', (e) => {
          e.stopPropagation();
        }, { once: true });
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up with a slight delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Restore state if somehow it got cleared (defensive programming)
          if (nodes.length === 0 && currentNodes.length > 0) {
            setNodes(currentNodes);
            setEdges(currentEdges);
          }
        }, 100);
        
        toast.success('HTML file downloaded successfully');
      }, 10);
      
    } catch (error) {
      console.error('HTML export error:', error);
      toast.error('Failed to export HTML');
    }
  };

  const exportToMarkdown = (planData: any) => {
    const markdown = generateMarkdownContent(planData);
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${planData.title.replace(/\s+/g, '-').toLowerCase()}-attack-plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Markdown file downloaded');
  };

  const exportToCSV = (planData: any) => {
    const csv = generateCSVContent(planData);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${planData.title.replace(/\s+/g, '-').toLowerCase()}-attack-plan.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('CSV file downloaded');
  };

  const generatePrintableContent = (planData: any) => {
    // Sort all nodes by canvas position (Y first, then X)
    const sortedNodes = [...planData.nodes].sort((a: Node, b: Node) => 
      a.position.y - b.position.y || a.position.x - b.position.x
    );
    
    let content = `
      <div class="header">
        <h1>${planData.title}</h1>
        <p>${planData.description}</p>
        <p><small>Generated on ${new Date().toLocaleDateString()}</small></p>
      </div>
      <h2>Attack Plan Elements</h2>
    `;

    sortedNodes.forEach((node: Node) => {
      if (node.type === 'phase') {
        content += `
          <div class="node phase-node">
            <h3>📋 Phase: ${node.data.label || (node.data.phase as any)?.name || 'Phase'}</h3>
          </div>
        `;
      } else if (node.type === 'technique') {
        const technique = node.data.technique as any;
        if (technique) {
          content += `
          <div class="node technique-node">
            <h3>⚡ ${technique.title || technique.name || 'Technique'}</h3>
            <p><strong>Description:</strong> ${technique.description || 'No description'}</p>
            <p><strong>Phase:</strong> ${technique.phase || 'N/A'}</p>
            <p><strong>Category:</strong> ${technique.category || 'N/A'}</p>
            ${technique.tags && technique.tags.length > 0 ? `<p><strong>Tags:</strong> ${technique.tags.join(', ')}</p>` : ''}
            
            ${technique.how_to_use && technique.how_to_use.length > 0 ? `
              <div><strong>How to Use:</strong></div>
              <ol>
                ${technique.how_to_use.map((step: string) => `<li>${step}</li>`).join('')}
              </ol>
            ` : ''}
            
            ${technique.when_to_use && technique.when_to_use.length > 0 ? `
              <div><strong>When to Use:</strong></div>
              <ul>
                ${technique.when_to_use.map((item: string) => `<li>${item}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${technique.tools && technique.tools.length > 0 ? `
              <p><strong>Tools:</strong> ${technique.tools.map((tool: string) => `<span class="tool-tag">${tool}</span>`).join(' ')}</p>
            ` : ''}
            
            ${technique.commands && technique.commands.length > 0 ? `
              <div><strong>Commands:</strong></div>
              ${technique.commands.map((cmd: any) => {
                const command = typeof cmd === 'string' ? cmd : cmd.command || cmd.text || JSON.stringify(cmd);
                return `<pre class="command-block"><code>${command}</code></pre>`;
              }).join('')}
            ` : ''}
          </div>
          `;
        }
      } else if (node.type === 'text') {
        content += `
          <div class="node text-node">
            <h4>📝 Note:</h4>
            <div>${node.data.content}</div>
          </div>
        `;
      }
    });
    
    return content;
  };

  const generateMarkdownContent = (planData: any) => {
    // Sort all nodes by canvas position (Y first, then X)
    const sortedNodes = [...planData.nodes].sort((a: Node, b: Node) => 
      a.position.y - b.position.y || a.position.x - b.position.x
    );
    
    let markdown = `# ${planData.title}\n\n`;
    markdown += `${planData.description}\n\n`;
    markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    markdown += `## Attack Plan Elements\n\n`;
    
    sortedNodes.forEach((node: Node) => {
      if (node.type === 'phase') {
        markdown += `### 📋 Phase: ${node.data.label || (node.data.phase as any)?.name || 'Phase'}\n\n`;
      } else if (node.type === 'technique') {
        const technique = node.data.technique as any;
        if (technique) {
          markdown += `### ⚡ ${technique.title || technique.name || 'Technique'}\n\n`;
          markdown += `${technique.description || 'No description'}\n\n`;
          markdown += `**Phase:** ${technique.phase || 'N/A'}\n\n`;
          markdown += `**Category:** ${technique.category || 'N/A'}\n\n`;
          
          if (technique.tags && technique.tags.length > 0) {
            markdown += `**Tags:** ${technique.tags.join(', ')}\n\n`;
          }
          
          if (technique.how_to_use && technique.how_to_use.length > 0) {
            markdown += `**How to Use:**\n\n`;
            technique.how_to_use.forEach((step: string, index: number) => {
              markdown += `${index + 1}. ${step}\n`;
            });
            markdown += `\n`;
          }
          
          if (technique.when_to_use && technique.when_to_use.length > 0) {
            markdown += `**When to Use:**\n\n`;
            technique.when_to_use.forEach((item: string) => {
              markdown += `- ${item}\n`;
            });
            markdown += `\n`;
          }
          
          if (technique.tools && technique.tools.length > 0) {
            markdown += `**Tools:** \`${technique.tools.join('`, `')}\`\n\n`;
          }
          
          if (technique.commands && technique.commands.length > 0) {
            markdown += `**Commands:**\n\n`;
            technique.commands.forEach((cmd: any) => {
              const command = typeof cmd === 'string' ? cmd : cmd.command || cmd.text || JSON.stringify(cmd);
              markdown += `\`\`\`\n${command}\n\`\`\`\n\n`;
            });
          }
        }
      } else if (node.type === 'text') {
        markdown += `### 📝 Note\n\n`;
        markdown += `${node.data.content}\n\n`;
      }
    });
    
    return markdown;
  };

  const generateCSVContent = (planData: any) => {
    const headers = ['Type', 'Name', 'Description', 'Phase', 'Category', 'Tags', 'How to Use', 'When to Use', 'Tools', 'Commands', 'Content'];
    const rows = [headers.join(',')];
    
    // Sort all nodes by canvas position (Y first, then X)
    const sortedNodes = [...planData.nodes].sort((a: Node, b: Node) => 
      a.position.y - b.position.y || a.position.x - b.position.x
    );
    
    sortedNodes.forEach((node: Node) => {
      if (node.type === 'technique') {
        const technique = node.data.technique as any;
        const row = [
          'technique',
          technique?.title || technique?.name || '',
          technique?.description || '',
          technique?.phase || '',
          technique?.category || '',
          technique?.tags ? technique.tags.join('; ') : '',
          technique?.how_to_use ? technique.how_to_use.join('; ') : '',
          technique?.when_to_use ? technique.when_to_use.join('; ') : '',
          technique?.tools ? technique.tools.join('; ') : '',
          technique?.commands ? technique.commands.map((cmd: any) => 
            typeof cmd === 'string' ? cmd : cmd.command || cmd.text || JSON.stringify(cmd)
          ).join('; ') : '',
          ''
        ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`);
        
        rows.push(row.join(','));
      } else {
        const row = [
          node.type,
          node.type === 'text' ? 'Text Box' : ((node.data.phase as any)?.name || node.data.label || ''),
          '',
          node.type === 'phase' ? ((node.data.phase as any)?.name || '') : '',
          '',
          '',
          '',
          '',
          '',
          '',
          node.type === 'text' ? (node.data.content || '') : ''
        ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`);
        
        rows.push(row.join(','));
      }
    });
    
    return rows.join('\n');
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
                    onClick={() => exportPlan('html')} 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as HTML
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
              onAddTextBox={handleAddTextBox}
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