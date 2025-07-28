import { useState } from "react";
import { ChevronRight, Star, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface SidebarProps {
  techniques: Technique[];
  onTechniqueClick: (technique: Technique) => void;
}

const navigationItems = [
  { label: "Enumeration", active: false },
  { label: "Initial Access", active: false },
  { label: "Privilege Escalation", active: true },
  { label: "Persistence", active: false },
  { label: "Credential Access", active: false },
  { label: "Lateral Movement", active: false }
];

export const Sidebar = ({ techniques, onTechniqueClick }: SidebarProps) => {
  const [selectedScenario, setSelectedScenario] = useState("Select your situation...");
  
  const favoriteItems = techniques.filter(technique => technique.starred);

  return (
    <aside className="w-80 bg-gradient-card border-r border-border/50 p-6 space-y-6">
      {/* Quick Navigation */}
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {navigationItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "default" : "ghost"}
              className={`w-full justify-start ${
                item.active 
                  ? "bg-gradient-cyber text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Scenario Assistant */}
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Scenario Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-full bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial-foothold">Initial Foothold</SelectItem>
              <SelectItem value="domain-admin">Path to Domain Admin</SelectItem>
              <SelectItem value="persistence">Maintain Persistence</SelectItem>
              <SelectItem value="data-exfil">Data Exfiltration</SelectItem>
            </SelectContent>
          </Select>
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