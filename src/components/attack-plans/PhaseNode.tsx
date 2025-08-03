import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Target, Key, Shield, Activity, Zap, Eye, Grid3X3, Users, Wifi, Server, Database, Network, Globe, Settings, Lock, Search } from 'lucide-react';

interface PhaseData {
  label: string;
  phase: {
    id: string;
    name: string;
    label?: string;
    icon: string;
    order_index: number;
  };
}

// Icon mapping for navigation phases
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'Target': Target,
    'Key': Key,
    'Shield': Shield,
    'Activity': Activity,
    'Zap': Zap,
    'Eye': Eye,
    'Grid3X3': Grid3X3,
    'Users': Users,
    'Wifi': Wifi,
    'Server': Server,
    'Database': Database,
    'Network': Network,
    'Globe': Globe,
    'Settings': Settings,
    'Lock': Lock,
    'Search': Search
  };
  
  return iconMap[iconName] || Target; // Default to Target if icon not found
};

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

  const IconComponent = getIconComponent(phase.icon);
  const displayLabel = phase.label || phase.name;

  return (
    <div className={`phase-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      
      <div className="phase-node__content">
        <div className="phase-node__icon">
          <IconComponent className="w-4 h-4" />
        </div>
        <div className={`phase-node__indicator ${getPhaseClassName(phase.name)}`}>
          {displayLabel}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

export default memo(PhaseNode);