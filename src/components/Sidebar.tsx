import { useState } from "react";
import { ChevronRight, Star, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const navigationItems = [
  { label: "Initial Access", active: false },
  { label: "Reconnaissance", active: false },
  { label: "Enumeration", active: false },
  { label: "Credential Access", active: true },
  { label: "Lateral Movement", active: false }
];

const favoriteItems = [
  { label: "Password Spraying", count: 1 }
];

export const Sidebar = () => {
  const [selectedScenario, setSelectedScenario] = useState("Select your situation...");

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
          {favoriteItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/30"
            >
              <Star className="w-4 h-4 mr-2 fill-cyber-orange text-cyber-orange" />
              {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
};