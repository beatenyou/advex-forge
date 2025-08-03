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
  OnConnect
} from '@xyflow/react';

interface AttackPlanCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}

export const AttackPlanCanvas: React.FC<AttackPlanCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick
}) => {
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
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