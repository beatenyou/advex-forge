import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchTechniquesFromDatabase } from '@/lib/techniqueDataMigration';
import { useNavigationPhases } from '@/hooks/useNavigationPhases';
import { Search, Plus } from 'lucide-react';

interface Technique {
  id: string;
  mitre_id?: string;
  title: string;
  description: string;
  phase: string;
  phases?: string[];
  category: string;
  tags: string[];
  tools: string[];
  when_to_use: string[];
  how_to_use: string[];
  commands: any;
  detection: string[];
  mitigation: string[];
  reference_links: any;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface TechniquePaletteProps {
  onAddTechnique: (technique: Technique) => void;
}

export const TechniquePalette: React.FC<TechniquePaletteProps> = ({ onAddTechnique }) => {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { phases: navigationPhases } = useNavigationPhases();

  useEffect(() => {
    loadTechniques();
  }, []);

  const loadTechniques = async () => {
    try {
      const data = await fetchTechniquesFromDatabase();
      setTechniques(data);
    } catch (error) {
      console.error('Error loading techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTechniques = techniques.filter(technique => {
    const matchesSearch = technique.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         technique.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedPhase) return matchesSearch;
    
    // Map phase labels to actual phase names in the database
    const phaseMap: { [key: string]: string[] } = {
      'Reconnaissance': ['Reconnaissance', 'recon'],
      'Weaponization': ['Weaponization', 'weaponization'],
      'Delivery': ['Delivery', 'delivery'],
      'Exploitation': ['Exploitation', 'exploitation'],
      'Installation': ['Installation', 'installation'],
      'Command & Control': ['Command & Control', 'c2', 'command-control'],
      'Actions': ['Actions', 'actions', 'actions-on-objectives']
    };
    
    // Debug logging
    console.log('Filtering - selectedPhase:', selectedPhase, 'technique phase:', technique.phase, 'technique phases:', technique.phases);
    
    // Get possible phase names for the selected phase
    const possiblePhaseNames = phaseMap[selectedPhase] || [selectedPhase];
    
    // Check if any of the possible phase names match
    const matchesPhase = possiblePhaseNames.some(phaseName => 
      technique.phases?.includes(phaseName) || technique.phase === phaseName
    );
    
    return matchesSearch && matchesPhase;
  });

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Technique Palette</CardTitle>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search techniques..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Phase Filter */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedPhase === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPhase(null)}
            >
              All
            </Button>
            {navigationPhases.map(phase => (
              <Button
                key={phase.name}
                variant={selectedPhase === phase.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPhase(phase.name)}
                className="text-xs"
              >
                {phase.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading techniques...
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredTechniques.map(technique => (
                <Card key={technique.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{technique.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {technique.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {technique.phases?.[0] || technique.phase}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {technique.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 p-1 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Button clicked for technique:', technique.title);
                          onAddTechnique(technique);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredTechniques.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No techniques found matching your criteria.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </div>
  );
};