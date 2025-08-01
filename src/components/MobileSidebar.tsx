import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface MobileSidebarProps {
  techniques: any[];
  onTechniqueSelect: (technique: any) => void;
  onStarTechnique: (techniqueId: string) => void;
  selectedPhase: string | null;
  onPhaseSelect: (phase: string | null) => void;
  selectedScenario: any | null;
  onScenarioSelect: (scenario: any | null) => void;
  onOpenChat: () => void;
  onOpenChatWithPrompt: (prompt: string) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes (for mobile UX)
  useEffect(() => {
    const handleRouteChange = () => setIsOpen(false);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const handleInteraction = (callback: () => void) => {
    callback();
    setIsOpen(false); // Close mobile sidebar after interaction
  };

  const wrappedProps = {
    techniques: props.techniques,
    onTechniqueClick: (technique: any) => handleInteraction(() => props.onTechniqueSelect(technique)),
    onPhaseSelect: (phase: string | null) => handleInteraction(() => props.onPhaseSelect(phase)),
    onScenarioSelect: (scenario: any | null) => handleInteraction(() => props.onScenarioSelect(scenario)),
    onClearAllFavorites: () => {}, // Add empty handler since it's required
    onOpenChatWithScenario: () => handleInteraction(props.onOpenChat),
    selectedPhase: props.selectedPhase,
    selectedScenario: props.selectedScenario,
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <Sidebar {...wrappedProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
};