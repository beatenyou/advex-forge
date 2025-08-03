import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search } from 'lucide-react';
import { useNavigationPhases } from '@/hooks/useNavigationPhases';
import { supabase } from '@/integrations/supabase/client';

interface Technique {
  id: string;
  title: string;
  description: string;
  phase: string;
  category: string;
  tags: string[];
  tools: string[];
  mitre_id?: string;
  difficulty?: string;
  detection_difficulty?: string;
}

interface TechniquePaletteV2Props {
  onAddTechnique: (technique: Technique) => void;
}

const TechniquePaletteV2: React.FC<TechniquePaletteV2Props> = ({ onAddTechnique }) => {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { phases: navigationPhases, loading: phasesLoading } = useNavigationPhases();

  const handlePhaseDragStart = (e: React.DragEvent, phase: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'phase',
      phase: phase
    }));
  };

  const fetchTechniquesFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('techniques')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching techniques:', error);
        return;
      }

      setTechniques(data || []);
      console.log('📊 TechniquePaletteV2 - Loaded techniques:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📊 TechniquePaletteV2 - First technique phases:', data[0].phase);
      }
    } catch (error) {
      console.error('Unexpected error fetching techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechniquesFromDatabase();
  }, []);

  // Log navigation phases for debugging
  useEffect(() => {
    console.log('🆕 TechniquePaletteV2 - Navigation phases:', navigationPhases);
    navigationPhases.forEach((phase, index) => {
      console.log(`🆕 V2 Phase ${index}: ${phase.name} -> Label: ${phase.label} (Icon: ${phase.icon})`);
    });
  }, [navigationPhases]);

  const filteredTechniques = techniques.filter(technique => {
    const matchesSearch = technique.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         technique.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         technique.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPhase = selectedPhase === null || technique.phase === selectedPhase;
    
    return matchesSearch && matchesPhase;
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Technique Palette V2</CardTitle>
        <CardDescription>
          Drag techniques onto the canvas or click Add to include them in your attack plan
        </CardDescription>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search techniques..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Phase Filter - Brand New Implementation */}
          {!phasesLoading && navigationPhases.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedPhase === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPhase(null)}
              >
                All
              </Button>
              {navigationPhases.map((phase) => (
                <Button
                  key={`v2-${phase.id}-${phase.name}`}
                  variant={selectedPhase === phase.label ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPhase(phase.label)}
                  draggable
                  onDragStart={(e) => handlePhaseDragStart(e, phase)}
                  className="text-xs cursor-grab active:cursor-grabbing hover:cursor-grab"
                >
                  {phase.icon} {phase.label}
                </Button>
              ))}
            </div>
          )}
          {phasesLoading && (
            <div className="flex flex-wrap gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded"></div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : (
              <>
                {filteredTechniques.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No techniques found matching your criteria
                  </div>
                ) : (
                  filteredTechniques.map((technique) => (
                    <Card key={technique.id} className="cursor-move hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm leading-tight">{technique.title}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddTechnique(technique)}
                            className="ml-2 h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {technique.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {technique.phase}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {technique.category}
                          </Badge>
                        </div>
                        {technique.tags && technique.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {technique.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {technique.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{technique.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TechniquePaletteV2;