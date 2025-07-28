import { useState, useEffect } from "react";
import { Search, Shield, Users, Settings, Star, Hash, Filter, LogOut, UserCog, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TechniqueCard } from "./TechniqueCard";
import { TechniqueModal } from "./TechniqueModal";
import { Sidebar } from "./Sidebar";
import { QuickReference } from "./QuickReference";
import { AdminDashboard } from "./AdminDashboard";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";
import { sampleMarkdownTechniques, parseMultipleMarkdownTechniques, ParsedTechnique } from "@/lib/markdownParser";

// Parse techniques from markdown
const initialTechniques = parseMultipleMarkdownTechniques(sampleMarkdownTechniques);
export const Dashboard = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const [techniques, setTechniques] = useState<ParsedTechnique[]>(initialTechniques);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("All Phases");
  const [filteredTechniques, setFilteredTechniques] = useState(techniques);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "There was a problem signing you out."
      });
    }
  };
  const phases = ["All Phases", "Enumeration", "Initial Access", "Privilege Escalation", "Persistence", "Credential Access", "Lateral Movement"];
  const allTags = [...new Set(techniques.flatMap(t => t.tags.map(tag => tag.toLowerCase().replace(/\s+/g, '-'))))];
  useEffect(() => {
    let filtered = techniques;
    
    // Search functionality
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(technique => 
        technique.title.toLowerCase().includes(query) ||
        technique.description.toLowerCase().includes(query) ||
        technique.id.toLowerCase().includes(query) ||
        technique.phase.toLowerCase().includes(query) ||
        technique.category.toLowerCase().includes(query) ||
        technique.tags.some(tag => tag.toLowerCase().includes(query)) ||
        technique.tools.some(tool => tool.toLowerCase().includes(query))
      );
    }
    
    // Phase filtering
    if (selectedPhase !== "All Phases") {
      filtered = filtered.filter(technique => technique.phase === selectedPhase);
    }
    
    // Tag filtering
    if (selectedTags.length > 0) {
      filtered = filtered.filter(technique => 
        selectedTags.some(selectedTag => 
          technique.tags.some(tag => tag.toLowerCase().includes(selectedTag.toLowerCase()))
        )
      );
    }
    
    setFilteredTechniques(filtered);
  }, [searchQuery, selectedPhase, selectedTags, techniques]);
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleFavorite = (techniqueId: string) => {
    setTechniques(prev => prev.map(technique => 
      technique.id === techniqueId 
        ? { ...technique, starred: !technique.starred }
        : technique
    ));
  };

  const openTechniqueModal = (technique: any) => {
    setSelectedTechnique(technique);
    setIsModalOpen(true);
  };
  return <div className="bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="p-1" />
              <div className="w-8 h-8 rounded-full bg-gradient-cyber flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Active Directory Attack & Enumeration Dashboard
                </h1>
                <p className="text-muted-foreground text-sm">Comprehensive reference for security pros</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <SidebarTrigger asChild>
                <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI
                  <AIStatusIndicator size="sm" className="ml-2" />
                </Button>
              </SidebarTrigger>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                {user?.email?.split('@')[0] || 'User'}
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdminDashboard(true)}
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                <UserCog className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search attacks, tools, commands..." className="pl-10 bg-muted/50 border-border/50 focus:border-primary" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="w-48 bg-muted/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {phases.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {allTags.map(tag => <Badge key={tag} variant={selectedTags.includes(tag) ? "default" : "outline"} className={`cursor-pointer transition-all hover:scale-105 ${selectedTags.includes(tag) ? "bg-gradient-cyber text-primary-foreground border-primary" : "hover:border-primary/50"}`} onClick={() => toggleTag(tag)}>
                <Hash className="w-3 h-3 mr-1" />
                {tag}
              </Badge>)}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          techniques={techniques} 
          onTechniqueClick={openTechniqueModal}
          selectedPhase={selectedPhase}
          onPhaseSelect={setSelectedPhase}
        />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Phase Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-3xl font-bold text-foreground">
                {selectedPhase === "All Phases" ? "Initial Access" : selectedPhase}
              </h2>
              <Badge variant="outline" className="text-primary">
                Techniques used to gain initial foothold in the network
              </Badge>
            </div>

            {/* Technique Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {filteredTechniques.map(technique => (
                <TechniqueCard 
                  key={technique.id} 
                  technique={technique} 
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {filteredTechniques.length === 0 && <Card className="bg-gradient-card border-border/50">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No techniques found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                  </div>
                </CardContent>
              </Card>}
          </div>

          {/* Quick Reference Section */}
          <QuickReference />
        </main>
      </div>

      {/* Technique Modal */}
      {selectedTechnique && (
        <TechniqueModal 
          technique={selectedTechnique}
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* Admin Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard
          techniques={techniques}
          onTechniquesUpdate={setTechniques}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}
    </div>;
};