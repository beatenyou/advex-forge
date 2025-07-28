import { useState, useEffect } from "react";
import { ChevronRight, Star, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

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
  description?: string;
  phase: string;
  tags: string[];
  linked_techniques: string[];
  order_index: number;
  is_active: boolean;
}

interface SidebarProps {
  techniques: Technique[];
  onTechniqueClick: (technique: Technique) => void;
  selectedPhase: string;
  onPhaseSelect: (phase: string) => void;
}

const navigationItems = [
  { label: "All Phases", phase: "All Phases" },
  { label: "Enumeration", phase: "Enumeration" },
  { label: "Initial Access", phase: "Initial Access" },
  { label: "Privilege Escalation", phase: "Privilege Escalation" },
  { label: "Persistence", phase: "Persistence" },
  { label: "Credential Access", phase: "Credential Access" },
  { label: "Lateral Movement", phase: "Lateral Movement" }
];

export const Sidebar = ({ techniques, onTechniqueClick, selectedPhase, onPhaseSelect }: SidebarProps) => {
  const [selectedScenario, setSelectedScenario] = useState("Select your situation...");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const favoriteItems = techniques.filter(technique => technique.starred);

  useEffect(() => {
    fetchScenarios();
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

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    
    if (scenarioId === "Select your situation...") return;
    
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      // Filter techniques to show only those linked to the selected scenario
      // This could be enhanced to highlight matching techniques in the main view
      console.log(`Selected scenario: ${scenario.title}`);
      console.log(`Linked techniques: ${scenario.linked_techniques.join(', ')}`);
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
            {navigationItems.map((item) => (
              <Button
                key={item.phase}
                variant={selectedPhase === item.phase ? "default" : "ghost"}
                className={`w-full justify-start text-sm h-8 ${
                  selectedPhase === item.phase 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => onPhaseSelect(item.phase)}
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                {item.label}
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
          <Select value={selectedScenario} onValueChange={handleScenarioChange}>
            <SelectTrigger className="w-full bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Select your situation...">Select your situation...</SelectItem>
              {scenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  {scenario.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedScenario !== "Select your situation..." && scenarios.find(s => s.id === selectedScenario) && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                {scenarios.find(s => s.id === selectedScenario)?.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {scenarios.find(s => s.id === selectedScenario)?.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Phase:</strong> {scenarios.find(s => s.id === selectedScenario)?.phase}
              </p>
              {scenarios.find(s => s.id === selectedScenario)?.linked_techniques.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Linked Techniques:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {scenarios.find(s => s.id === selectedScenario)?.linked_techniques.map((techniqueName, index) => {
                      console.log('Looking for technique:', techniqueName);
                      console.log('Available techniques:', techniques.map(t => t.title));
                      
                      const matchedTechnique = techniques.find(t => 
                        t.title.toLowerCase().includes(techniqueName.toLowerCase()) ||
                        techniqueName.toLowerCase().includes(t.title.toLowerCase())
                      );
                      
                      console.log('Matched technique:', matchedTechnique);
                      
                      return (
                        <Badge 
                          key={index} 
                          variant={matchedTechnique ? "default" : "outline"}
                          className={`text-xs ${matchedTechnique ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                          onClick={() => {
                            console.log('Badge clicked:', techniqueName, matchedTechnique);
                            if (matchedTechnique) {
                              onTechniqueClick(matchedTechnique);
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg text-foreground">Favorites</CardTitle>
            <Badge variant="outline" className="bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30">
              {favoriteItems.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {favoriteItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No favorites yet. Star techniques to add them here.
            </p>
          ) : (
            favoriteItems.map((technique) => (
              <Button
                key={technique.id}
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/30"
                onClick={() => onTechniqueClick(technique)}
              >
                <Star className="w-4 h-4 mr-2 fill-cyber-orange text-cyber-orange" />
                {technique.title}
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </aside>
  );
};