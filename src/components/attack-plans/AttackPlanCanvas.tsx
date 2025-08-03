import React from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowInstance
} from '@xyflow/react';
import TechniqueNode from './TechniqueNode';
import PhaseNode from './PhaseNode';

interface AttackPlanCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onInit?: (instance: ReactFlowInstance) => void;
  onDrop?: (event: React.DragEvent) => void;
}

const nodeTypes: NodeTypes = {
  technique: TechniqueNode,
  phase: PhaseNode,
};

export const AttackPlanCanvas: React.FC<AttackPlanCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onInit,
  onDrop
}) => {
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      if (selectedNodes.length > 0 || selectedEdges.length > 0) {
        event.preventDefault();
        
        // Remove selected nodes
        if (selectedNodes.length > 0) {
          const nodeChanges = selectedNodes.map(node => ({
            type: 'remove' as const,
            id: node.id
          }));
          onNodesChange(nodeChanges);
        }
        
        // Remove selected edges
        if (selectedEdges.length > 0) {
          const edgeChanges = selectedEdges.map(edge => ({
            type: 'remove' as const,
            id: edge.id
          }));
          onEdgesChange(edgeChanges);
        }
      }
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        className="bg-background"
      >
        <Background color="#94a3b8" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch ((node.data.technique as any)?.phase) {
              case 'Reconnaissance': return '#ef4444';
              case 'Weaponization': return '#f97316';
              case 'Delivery': return '#eab308';
              case 'Exploitation': return '#22c55e';
              case 'Installation': return '#06b6d4';
              case 'Command & Control': return '#3b82f6';
              case 'Actions': return '#8b5cf6';
              default: return '#6b7280';
            }
          }}
          className="bg-background border border-border"
        />
      </ReactFlow>
    </div>
  );
};