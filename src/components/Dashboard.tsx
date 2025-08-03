import React, { useState, useEffect } from "react";
import { Search, Shield, Users, Settings, Star, Hash, Filter, LogOut, UserCog, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigationPhases } from "@/hooks/useNavigationPhases";
import { useResponsiveCardGrid } from '@/hooks/useResponsiveCardGrid';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { TechniqueCard } from "./TechniqueCard";
import { TechniqueModal } from "./TechniqueModal";
import { Sidebar } from "./Sidebar";
import { MobileSidebar } from './MobileSidebar';
import { MobileNavigation } from './MobileNavigation';
import { QuickReference } from "./QuickReference";
import { AdminDashboard } from "./AdminDashboard";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";
import { TagSelector } from "./TagSelector";
import { cn } from '@/lib/utils';

import { ParsedTechnique } from "@/lib/markdownParser";
import { supabase } from "@/integrations/supabase/client";
import { fetchTechniquesFromDatabase, fetchUserFavorites, toggleTechniqueFavorite } from "@/lib/techniqueDataMigration";
interface DashboardProps {
  onTechniqueSelect?: (technique: ParsedTechnique) => void;
  onToggleChat?: () => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
  isChatVisible?: boolean;
  isWideScreen?: boolean;
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
export const Dashboard = ({
  onTechniqueSelect,
  onToggleChat,
  onOpenChatWithPrompt,
  isChatVisible = false,
  isWideScreen = false
}: DashboardProps) => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    isAdmin,
    loading: adminLoading
  } = useAdminCheck();
  const {
    phases: navigationPhases,
    loading: phasesLoading
  } = useNavigationPhases();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Responsive grid hook
  const { 
    containerRef, 
    columnCount, 
    cardWidth, 
    isInitialized, 
    getGridClasses,
    getCardContextClasses 
  } = useResponsiveCardGrid({
    isChatVisible: isChatVisible,
    isWideScreen: isWideScreen,
    isMobile: isMobile,
    minCardWidth: 280,
    maxColumns: 6
  });
  
  const [techniques, setTechniques] = useState<any[]>([]);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhase, setSelectedPhase] = useState<string>(""); // Initialize empty, will set to first phase when loaded
  const [filteredTechniques, setFilteredTechniques] = useState(techniques);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  // Initialize selectedPhase when navigation phases load
  useEffect(() => {
    if (navigationPhases.length > 0 && !selectedPhase) {
      setSelectedPhase(navigationPhases[0].label);
    }
  }, [navigationPhases, selectedPhase]);

  // Load techniques and favorites on mount
  useEffect(() => {
    loadTechniques();
    if (user) {
      loadUserFavorites();
    }
  }, [user]);

  // Sync techniques starred state with userFavorites
  useEffect(() => {
    setTechniques(prev => prev.map(technique => ({
      ...technique,
      starred: userFavorites.includes(technique.id)
    })));
  }, [userFavorites]);

  // Set up realtime subscriptions
  useEffect(() => {
    const techniquesChannel = supabase.channel('techniques-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'techniques'
    }, () => {
      loadTechniques();
    }).subscribe();

    // Set up favorites realtime subscription
    const favoritesChannel = user ? supabase.channel('favorites-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_favorites'
    }, payload => {
      // Only update if it's for the current user
      if ((payload.new as any)?.user_id === user.id || (payload.old as any)?.user_id === user.id) {
        loadUserFavorites();
      }
    }).subscribe() : null;
    return () => {
      supabase.removeChannel(techniquesChannel);
      if (favoritesChannel) {
        supabase.removeChannel(favoritesChannel);
      }
    };
  }, [user]);
  const loadTechniques = async () => {
    try {
      const data = await fetchTechniquesFromDatabase();
      const formattedTechniques = data.map(technique => ({
        ...technique,
        mitre_id: technique.mitre_id,
        tags: technique.tags || [],
        tools: technique.tools || [],
        starred: userFavorites.includes(technique.id),
        phases: technique.phases || (technique.phase ? [technique.phase] : []),
        whenToUse: technique.when_to_use,
        howToUse: technique.how_to_use,
        commands: technique.commands || [],
        detection: technique.detection,
        mitigation: technique.mitigation,
        referenceLinks: technique.reference_links || []
      }));
      setTechniques(formattedTechniques);

      // Update starred status based on favorites
      if (userFavorites.length > 0) {
        setTechniques(prev => prev.map(technique => ({
          ...technique,
          starred: userFavorites.includes(technique.id)
        })));
      }
    } catch (error) {
      console.error('Error loading techniques:', error);
      toast({
        title: "Error",
        description: "Failed to load techniques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadUserFavorites = async () => {
    if (!user) return;
    try {
      const favorites = await fetchUserFavorites(user.id);
      setUserFavorites(favorites);
    } catch (error) {
      console.error('Error loading user favorites:', error);
    }
  };
  const handleSessionSelect = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };
  const handleNewSession = () => {
    navigate('/chat');
  };
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
  // No longer need phase mapping since database has been cleaned

  // Create mapping for tag transformation
  const createTagMapping = (tags: string[]) => {
    const mapping = new Map();
    tags.forEach(tag => {
      const transformed = tag.toLowerCase().replace(/\s+/g, '-');
      mapping.set(transformed, tag);
    });
    return mapping;
  };
  
  const allOriginalTags = [...new Set(techniques.flatMap(t => t.tags))];
  const tagMapping = createTagMapping(allOriginalTags);
  const allTags = [...tagMapping.keys()];
  
  useEffect(() => {
    let filtered = techniques;

    // Search functionality
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(technique => technique.title.toLowerCase().includes(query) || technique.description.toLowerCase().includes(query) || technique.mitre_id && technique.mitre_id.toLowerCase().includes(query) || technique.id.toLowerCase().includes(query) || technique.phase.toLowerCase().includes(query) || technique.category.toLowerCase().includes(query) || technique.tags.some(tag => tag.toLowerCase().includes(query)) || technique.tools.some(tool => tool.toLowerCase().includes(query)));
    }

    // Phase filtering using navigation phase names
    const currentPhase = selectedPhase || (navigationPhases.length > 0 ? navigationPhases[0].label : "All Techniques");
    if (currentPhase !== "All Techniques") {
      // Find the navigation phase name that corresponds to the selected label
      const selectedNavPhase = navigationPhases.find(p => p.label === currentPhase);
      const phaseName = selectedNavPhase ? selectedNavPhase.name : currentPhase;
      
      filtered = filtered.filter(technique => {
        // Check phases array first (preferred)
        if (technique.phases && Array.isArray(technique.phases)) {
          return technique.phases.some(p => p?.trim() === phaseName);
        }
        
        // Fallback to legacy phase field
        return technique.phase?.trim() === phaseName;
      });
    }

    // Tag filtering - Fix the transformation mismatch
    if (selectedTags.length > 0) {
      filtered = filtered.filter(technique => 
        selectedTags.some(selectedTag => {
          const originalTag = tagMapping.get(selectedTag);
          return technique.tags.some(tag => 
            tag === originalTag || tag.toLowerCase().replace(/\s+/g, '-') === selectedTag
          );
        })
      );
    }
    setFilteredTechniques(filtered);
  }, [searchQuery, selectedPhase, selectedTags, techniques]);
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const toggleFavorite = async (techniqueId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save favorites",
        variant: "destructive"
      });
      return;
    }
    const isFavorite = userFavorites.includes(techniqueId);
    try {
      const success = await toggleTechniqueFavorite(user.id, techniqueId, isFavorite);
      if (success) {
        // Optimistically update the UI
        if (isFavorite) {
          setUserFavorites(prev => prev.filter(id => id !== techniqueId));
        } else {
          setUserFavorites(prev => [...prev, techniqueId]);
        }

        // Update the techniques array to reflect the starred status
        setTechniques(prev => prev.map(technique => technique.id === techniqueId ? {
          ...technique,
          starred: !isFavorite
        } : technique));
        toast({
          title: isFavorite ? "Removed from favorites" : "Added to favorites",
          description: isFavorite ? "Technique removed from your favorites" : "Technique saved to your favorites"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update favorite",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  };
  const clearAllFavorites = async () => {
    if (!user || userFavorites.length === 0) return;
    try {
      const {
        error
      } = await supabase.from('user_favorites').delete().eq('user_id', user.id);
      if (error) throw error;
      setUserFavorites([]);
      toast({
        title: "Success",
        description: "All favorites cleared"
      });
    } catch (error) {
      console.error('Error clearing favorites:', error);
      toast({
        title: "Error",
        description: "Failed to clear favorites",
        variant: "destructive"
      });
    }
  };
  const openTechniqueModal = (technique: any) => {
    setSelectedTechnique(technique);
    setIsModalOpen(true);
  };
  const handleScenarioSelect = (scenario: Scenario | null) => {
    setSelectedScenario(scenario);
  };
  const generateScenarioPrompt = (scenario: Scenario): string => {
    const linkedTechniquesText = scenario.linked_techniques.length > 0 ? `\n\nLinked techniques: ${scenario.linked_techniques.join(', ')}` : '';
    return `I'm working on a scenario: "${scenario.title}"

Description: ${scenario.description}
Phase: ${scenario.phase}
Tags: ${scenario.tags.join(', ')}${linkedTechniquesText}

Can you help me understand this scenario and provide guidance on the techniques, tools, and methodologies involved?`;
  };
  const handleOpenChatWithScenario = () => {
    if (selectedScenario && onOpenChatWithPrompt) {
      const prompt = generateScenarioPrompt(selectedScenario);
      onOpenChatWithPrompt(prompt);
    } else if (onToggleChat) {
      onToggleChat();
    }
  };
  // Add debug logging
  console.log('Dashboard render:', {
    navigationPhases: navigationPhases.length,
    selectedPhase,
    loading,
    filteredTechniques: filteredTechniques.length
  });

  // Use proper loading state from the hook
  if (phasesLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading navigation...</p>
        </div>
      </div>
    );
  }

  // Set fallback if no selectedPhase is set but phases are loaded
  const effectiveSelectedPhase = selectedPhase || (navigationPhases.length > 0 ? navigationPhases[0].label : "All Techniques");

  return <div className="bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-cyber flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={onToggleChat} title={isChatVisible ? "Close chat panel" : "Open chat panel"}>
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cyber Red Team Attack &amp; Enumeration</h1>
                <p className="text-muted-foreground text-sm">A reference for cybersecurity professionals</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <AIStatusIndicator size="sm" readOnly={true} />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => navigate('/preferences')} className="hover-scale">
                      <Users className="w-4 h-4 mr-2" />
                      {user?.email?.split('@')[0] || 'User'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>User Preferences</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" onClick={onToggleChat} title={isChatVisible ? "Close AI Chat" : "Open AI Chat"} className="hover-scale text-red-700 hover:bg-red-700/10">
                <MessageSquare className="w-4 h-4" />
              </Button>
              {isAdmin && <Button variant="outline" size="sm" onClick={() => setShowAdminDashboard(true)} title="Admin Dashboard" className="border-primary/50 text-primary hover:bg-primary/10 hover-scale">
                  <UserCog className="w-4 h-4" />
                </Button>}
              <Button variant="outline" size="sm" onClick={handleSignOut} title="Sign Out" className="hover-scale">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobile && <div className="mb-4">
              <MobileNavigation selectedPhase={effectiveSelectedPhase} onPhaseSelect={setSelectedPhase} />
            </div>}
          
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search attacks, tools, commands..." className="pl-10 bg-muted/50 border-border/50 focus:border-primary btn-touch" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              
              {/* Desktop Phase Selector */}
              {!isMobile && <Select value={effectiveSelectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger className="w-48 bg-muted/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {navigationPhases.map(phase => <SelectItem key={phase.name} value={phase.label}>{phase.label}</SelectItem>)}
                  </SelectContent>
                </Select>}
            </div>

            {/* Tag Filters */}
            <div className="mt-2">
              <TagSelector allTags={allTags} selectedTags={selectedTags} onToggleTag={toggleTag} maxVisibleTags={isMobile ? 3 : 5} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile Sidebar */}
        {isMobile && <MobileSidebar techniques={techniques} onTechniqueSelect={openTechniqueModal} onStarTechnique={toggleFavorite} selectedPhase={selectedPhase} onPhaseSelect={setSelectedPhase} selectedScenario={selectedScenario} onScenarioSelect={handleScenarioSelect} onOpenChat={handleOpenChatWithScenario} onOpenChatWithPrompt={onOpenChatWithPrompt || (() => {})} />}
        
        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar techniques={techniques} onTechniqueClick={openTechniqueModal} selectedPhase={selectedPhase} onPhaseSelect={setSelectedPhase} onClearAllFavorites={clearAllFavorites} selectedScenario={selectedScenario} onScenarioSelect={handleScenarioSelect} onOpenChatWithScenario={handleOpenChatWithScenario} />}

        {/* Main Content - Optimized container for multi-column grid */}
        <main className="flex-1 w-full min-w-0 overflow-hidden">
          <div className={`${isMobile ? 'p-4' : 'p-6'} w-full h-full overflow-y-auto`}>
          {/* Phase Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-3xl font-bold text-foreground">
                {selectedPhase}
              </h2>
              <Badge variant="outline" className="text-primary">
                {navigationPhases.find(p => p.label === selectedPhase)?.description || "Browse available techniques and tools"}
              </Badge>
            </div>

            {/* Technique Cards Grid - Fully responsive multi-column layout */}
            <div 
              ref={containerRef}
              className={cn(getGridClasses(), getCardContextClasses())}
            >
              {isInitialized && filteredTechniques.map(technique => (
                <TechniqueCard 
                  key={technique.id} 
                  technique={technique} 
                  onToggleFavorite={toggleFavorite} 
                  onOpenAIChat={onOpenChatWithPrompt}
                  cardWidth={cardWidth}
                  columnCount={columnCount}
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
          <div className="mt-8">
            <QuickReference />
          </div>
          </div>
        </main>
      </div>

      {/* Technique Modal */}
      {selectedTechnique && <TechniqueModal technique={selectedTechnique} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onToggleFavorite={toggleFavorite} onOpenAIChat={onOpenChatWithPrompt} />}

      {/* Admin Dashboard */}
      {showAdminDashboard && <AdminDashboard onClose={() => setShowAdminDashboard(false)} />}
      
    </div>;
};