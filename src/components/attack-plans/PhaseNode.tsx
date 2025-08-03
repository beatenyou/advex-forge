import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface PhaseData {
  label: string;
  phase: {
    id: string;
    name: string;
    icon: string;
    order_index: number;
  };
}

const PhaseNode: React.FC<NodeProps> = ({ data, selected }) => {
  const phase = (data as any)?.phase;
  
  if (!phase) {
    return (
      <div className="phase-node">
        <div className="phase-node__title">Unknown Phase</div>
      </div>
    );
  }

  const getPhaseClassName = (phaseName: string) => {
    const normalizedPhase = phaseName.toLowerCase().replace(/[^a-z]/g, '-');
    return `phase-node__indicator--${normalizedPhase}`;
  };

  return (
    <div className={`phase-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      
      <div className="phase-node__content">
        <div className="phase-node__icon">
          {phase.icon}
        </div>
        <div className={`phase-node__indicator ${getPhaseClassName(phase.name)}`}>
          {phase.name}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

export default memo(PhaseNode);