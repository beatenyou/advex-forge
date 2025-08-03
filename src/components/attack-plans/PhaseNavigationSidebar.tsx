import React, { useState } from 'react';
import { Search, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNavigationPhases } from '@/hooks/useNavigationPhases';

interface PhaseNavigationSidebarProps {
  selectedPhase: string | null;
  onPhaseSelect: (phaseId: string | null) => void;
}

const PhaseNavigationSidebar: React.FC<PhaseNavigationSidebarProps> = ({
  selectedPhase,
  onPhaseSelect,
}) => {
  const { phases, loading } = useNavigationPhases();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPhases = phases.filter(phase =>
    phase.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (event: React.DragEvent, phase: any) => {
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'phase',
        phase: phase,
      })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handlePhaseClick = (phaseId: string) => {
    onPhaseSelect(selectedPhase === phaseId ? null : phaseId);
  };

  if (loading) {
    return (
      <div className="w-80 bg-background border-r border-border p-4">
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Quick Navigation
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search phases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Phase List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {/* All Techniques Option */}
          <div
            className={`
              flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
              ${selectedPhase === null 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-foreground'
              }
            `}
            onClick={() => onPhaseSelect(null)}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                <span className="text-xs">🎯</span>
              </div>
              <span className="font-medium">All Techniques</span>
            </div>
            <Badge variant={selectedPhase === null ? "secondary" : "outline"} className="text-xs">
              All
            </Badge>
          </div>

          {/* Phase Items */}
          {filteredPhases.map((phase) => (
            <div
              key={phase.id}
              className={`
                group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                ${selectedPhase === phase.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-foreground'
                }
              `}
              onClick={() => handlePhaseClick(phase.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, phase)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <span className="text-xs">{phase.icon}</span>
                </div>
                <span className="font-medium truncate">{phase.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={selectedPhase === phase.id ? "secondary" : "outline"} 
                  className="text-xs"
                >
                  {phase.order_index}
                </Badge>
                <GripVertical 
                  className={`
                    w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab
                    ${selectedPhase === phase.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}
                  `} 
                />
              </div>
            </div>
          ))}
        </div>

        {filteredPhases.length === 0 && searchTerm && (
          <div className="text-center text-muted-foreground py-8">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No phases found matching "{searchTerm}"</p>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 Drag phases to canvas as visual organizers
        </p>
      </div>
    </div>
  );
};

export default PhaseNavigationSidebar;