import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigationPhases } from '@/hooks/useNavigationPhases';

interface MobileNavigationProps {
  selectedPhase: string | null;
  onPhaseSelect: (phase: string | null) => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  selectedPhase,
  onPhaseSelect,
}) => {
  const { phases } = useNavigationPhases();

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:hidden">
      <Button
        variant={selectedPhase === null ? "default" : "outline"}
        size="sm"
        onClick={() => onPhaseSelect(null)}
        className="whitespace-nowrap flex-shrink-0"
      >
        All Phases
      </Button>
      {phases.map((phase) => (
        <Button
          key={phase.name}
          variant={selectedPhase === phase.name ? "default" : "outline"}
          size="sm"
          onClick={() => onPhaseSelect(phase.name)}
          className="whitespace-nowrap flex-shrink-0 gap-2"
        >
          <span className="text-xs">{phase.icon}</span>
          <span className="hidden sm:inline">{phase.label}</span>
          <span className="sm:hidden">{phase.label.split(' ')[0]}</span>
        </Button>
      ))}
    </div>
  );
};