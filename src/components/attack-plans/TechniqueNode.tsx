import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface TechniqueData {
  label: string;
  technique: {
    id: string;
    mitre_id: string;
    title: string;
    description: string;
    phase: string;
    category: string;
    tags: string[];
  };
}

const TechniqueNode: React.FC<NodeProps> = ({ data, selected }) => {
  const technique = (data as any)?.technique;
  
  if (!technique) {
    return (
      <div className="technique-node">
        <Handle type="target" position={Position.Top} />
        <div className="technique-node__title">Unknown Technique</div>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }
  
  const getPhaseClassName = (phase: string) => {
    const normalizedPhase = phase.toLowerCase().replace(/[^a-z]/g, '-');
    return `technique-node__phase--${normalizedPhase}`;
  };

  return (
    <div className={`technique-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      
      <div className="technique-node__title">
        {technique.title}
      </div>
      
      <div className={`technique-node__phase ${getPhaseClassName(technique.phase)}`}>
        {technique.phase}
      </div>
      
      <div className="technique-node__description">
        {technique.description}
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(TechniqueNode);