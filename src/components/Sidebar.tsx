import { useState, useEffect } from "react";
import { ChevronRight, Star, Hash, X, ExternalLink, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigationPhases } from "@/hooks/useNavigationPhases";

interface Technique {
  id: string;
  title: string;
  description: string;
  phase: string;
  tags: string[];
  tools: string[];
  starred: boolean;
  category: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  phase: string;
  tags: string[];
  linked_techniques: string[];
  order_index: number;
  is_active: boolean;
}

interface LinkTab {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  icon: string;
  order_index: number;
  is_active: boolean;
}

interface SidebarProps {
  techniques: Technique[];
  onTechniqueClick: (technique: Technique) => void;
  selectedPhase: string;
  onPhaseSelect: (phase: string) => void;
  onClearAllFavorites: () => void;
  selectedScenario?: Scenario | null;
  onScenarioSelect?: (scenario: Scenario | null) => void;
  onOpenChatWithScenario?: () => void;
}

export const Sidebar = ({ 
  techniques, 
  onTechniqueClick, 
  selectedPhase, 
  onPhaseSelect, 
  onClearAllFavorites,
  selectedScenario,
  onScenarioSelect,
  onOpenChatWithScenario
}: SidebarProps) => {
  console.log('Sidebar techniques array:', techniques);
  console.log('Techniques count:', techniques.length);
  console.log('First technique:', techniques[0]);
  
  const { phases: navigationPhases } = useNavigationPhases();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [linkTabs, setLinkTabs] = useState<LinkTab[]>([]);
  
  const favoriteItems = techniques.filter(technique => technique.starred);

  useEffect(() => {
    fetchScenarios();
    fetchLinkTabs();

    // Set up real-time subscription for scenarios
    const scenariosChannel = supabase
      .channel('scenarios-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenarios'
        },
        () => {
          console.log('Scenarios table changed, refreshing...');
          fetchScenarios();
        }
      )
      .subscribe();

    // Listen for manual refresh events
    const handleRefreshScenarios = () => {
      fetchScenarios();
    };

    window.addEventListener('refresh-scenarios', handleRefreshScenarios);

    return () => {
      supabase.removeChannel(scenariosChannel);
      window.removeEventListener('refresh-scenarios', handleRefreshScenarios);
    };
  }, []);

  const fetchScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setScenarios(data || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    }
  };

  const fetchLinkTabs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_link_tabs')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      setLinkTabs(data || []);
    } catch (error) {
      console.error('Error fetching link tabs:', error);
    }
  };

  const handleScenarioSelect = (value: string) => {
    const scenario = scenarios.find(s => s.id === value) || null;
    
    if (onScenarioSelect) {
      onScenarioSelect(scenario);
    }
    
    if (scenario) {
      console.log('Selected scenario:', scenario.title);
      console.log('Linked techniques:', scenario.linked_techniques);
    }
  };

  return (
    <aside className="w-80 bg-gradient-card border-r border-border/50 p-6 space-y-6">
      {/* Quick Navigation */}
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            {navigationPhases.map((phase) => (
              <Button
                key={phase.name}
                variant={selectedPhase === phase.label ? "default" : "ghost"}
                className={`w-full justify-start text-sm h-8 ${
                  selectedPhase === phase.label 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => onPhaseSelect(phase.label)}
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                {phase.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Assistant */}
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Scenario Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select onValueChange={handleScenarioSelect} value={selectedScenario?.id || ""}>
              <SelectTrigger className="bg-muted/30 border-border/50 flex-1">
                <SelectValue placeholder="Choose a scenario..." />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedScenario && onOpenChatWithScenario && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenChatWithScenario}
                className="px-3 border-primary/50 text-primary hover:bg-primary/10"
                title="Ask AI about this scenario"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
          </div>
          {selectedScenario && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                {selectedScenario.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedScenario.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Phase:</strong> {selectedScenario.phase}
              </p>
              {selectedScenario.linked_techniques.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Linked Techniques:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedScenario.linked_techniques.map((techniqueName, index) => {
                      console.log('=== DEBUG START ===');
                      console.log('Processing technique:', techniqueName);
                      console.log('Total techniques available:', techniques.length);
                      console.log('Techniques array:', techniques);
                      
                      // Simplified exact match first, then partial match
                      let matchedTechnique = techniques.find(t => t.title === techniqueName);
                      if (!matchedTechnique) {
                        matchedTechnique = techniques.find(t => 
                          t.title.toLowerCase().includes(techniqueName.toLowerCase()) ||
                          techniqueName.toLowerCase().includes(t.title.toLowerCase())
                        );
                      }
                      
                      console.log('Final matched technique:', matchedTechnique);
                      console.log('=== DEBUG END ===');
                      
                      return (
                        <Badge 
                          key={index} 
                          variant={matchedTechnique ? "default" : "outline"}
                          className={`text-xs ${matchedTechnique ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
                          onClick={(e) => {
                            console.log('BADGE CLICKED!');
                            console.log('Technique name:', techniqueName);
                            console.log('Matched technique:', matchedTechnique);
                            e.preventDefault();
                            e.stopPropagation();
                            if (matchedTechnique) {
                              console.log('Calling onTechniqueClick');
                              onTechniqueClick(matchedTechnique);
                            } else {
                              console.log('No matched technique - cannot click');
                            }
                          }}
                        >
                          {techniqueName}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg text-foreground">Favorites</CardTitle>
              <Badge variant="outline" className="bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30">
                {favoriteItems.length}
              </Badge>
            </div>
            {favoriteItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllFavorites}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Clear all favorites"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {favoriteItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No favorites yet. Star techniques to add them here.
            </p>
          ) : (
            <TooltipProvider>
              {favoriteItems.map((technique) => (
                <Tooltip key={technique.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/30 min-w-0"
                      onClick={() => onTechniqueClick(technique)}
                    >
                      <Star className="w-4 h-4 mr-2 fill-cyber-orange text-cyber-orange flex-shrink-0" />
                      <span className="truncate">{technique.title}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{technique.title}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Page Sections */}
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Page Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => {
              const element = document.getElementById('cheat-sheets-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            <Hash className="w-4 h-4 mr-2" />
            Cheat Sheets
          </Button>
        </CardContent>
      </Card>

      {/* Quick Links */}
      {linkTabs.length > 0 && (
        <Card className="bg-muted/20 border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkTabs.reduce((acc, tab) => {
              if (!acc[tab.category]) acc[tab.category] = [];
              acc[tab.category].push(tab);
              return acc;
            }, {} as Record<string, LinkTab[]>) && 
              Object.entries(
                linkTabs.reduce((acc, tab) => {
                  if (!acc[tab.category]) acc[tab.category] = [];
                  acc[tab.category].push(tab);
                  return acc;
                }, {} as Record<string, LinkTab[]>)
              ).map(([category, tabs]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {tabs.map(tab => (
                      <a
                        key={tab.id}
                        href={tab.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 p-2 bg-card/60 rounded-md border border-border hover:border-primary/50 hover:bg-primary/10 transition-all duration-200 group text-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors block truncate text-xs">
                            {tab.title}
                          </span>
                          {tab.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {tab.description}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      )}
    </aside>
  );
};