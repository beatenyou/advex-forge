import React, { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { fetchTechniquesFromDatabase } from '@/lib/techniqueDataMigration';
import { useNavigationPhases } from '@/hooks/useNavigationPhases';

interface TechniqueQuickAccessProps {
  selectedPhase: string | null;
  onAddTechnique: (technique: any) => void;
}

const TechniqueQuickAccess: React.FC<TechniqueQuickAccessProps> = ({
  selectedPhase,
  onAddTechnique,
}) => {
  const { phases } = useNavigationPhases();
  const [techniques, setTechniques] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTechniques();
  }, []);

  const fetchTechniques = async () => {
    try {
      const data = await fetchTechniquesFromDatabase();
      setTechniques(data);
    } catch (error) {
      console.error('Error fetching techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTechniques = techniques.filter(technique => {
    const matchesSearch = technique.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         technique.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (technique.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!selectedPhase) return matchesSearch;
    
    // Map phase labels to actual phase names in the database
    const phaseMap: { [key: string]: string[] } = {
      'Active Reconnaissance': ['Reconnaissance', 'recon'],
      'Establish Foothold': ['Weaponization', 'weaponization'],
      'Deliver Payload': ['Delivery', 'delivery'],
      'Exploit Target': ['Exploitation', 'exploitation'],
      'Install Persistence': ['Installation', 'installation'],
      'Maintain Access': ['Command & Control', 'c2', 'command-control'],
      'Execute Objectives': ['Actions', 'actions', 'actions-on-objectives']
    };
    
    const selectedPhaseName = phases.find(p => p.id === selectedPhase)?.name;
    if (!selectedPhaseName) return matchesSearch;
    
    const possiblePhaseNames = phaseMap[selectedPhaseName] || [selectedPhaseName];
    const matchesPhase = possiblePhaseNames.some(phaseName => 
      technique.phase?.toLowerCase().includes(phaseName.toLowerCase()) ||
      technique.category?.toLowerCase().includes(phaseName.toLowerCase())
    );
    
    return matchesSearch && matchesPhase;
  });

  const handleAddTechnique = (technique: any) => {
    onAddTechnique(technique);
    setIsOpen(false);
  };

  const selectedPhaseName = selectedPhase 
    ? phases.find(p => p.id === selectedPhase)?.name 
    : 'All Techniques';

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Techniques
          {selectedPhase && (
            <Badge variant="secondary" className="ml-1">
              {selectedPhaseName}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-96 sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Add Techniques
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-auto p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search techniques..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter indicator */}
          {selectedPhase && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Filtered by:</span>
              <Badge variant="outline">{selectedPhaseName}</Badge>
            </div>
          )}

          {/* Techniques List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                ))
              ) : filteredTechniques.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No techniques found</p>
                  {searchTerm && (
                    <p className="text-xs mt-1">Try adjusting your search terms</p>
                  )}
                </div>
              ) : (
                filteredTechniques.map((technique) => (
                  <div
                    key={technique.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-foreground line-clamp-2">
                        {technique.title}
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => handleAddTechnique(technique)}
                        className="ml-2 shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {technique.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {technique.phase && (
                          <Badge variant="outline" className="text-xs">
                            {technique.phase}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {technique.category}
                        </Badge>
                      </div>
                    </div>
                    
                    {technique.tags && technique.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {technique.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {technique.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{technique.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TechniqueQuickAccess;