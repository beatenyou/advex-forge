import { useState } from "react";
import { Star, Zap, Eye, Copy, ExternalLink, Bolt, Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { TechniqueModal } from "./TechniqueModal";
import { CommandGenerator } from "./CommandGenerator";
import QuickSupportTicket from "./QuickSupportTicket";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTechniqueTracking } from "@/hooks/useTechniqueTracking";

interface Technique {
  id: string;
  mitre_id?: string;
  title: string;
  description: string;
  phase?: string; // Keep for backwards compatibility
  phases?: string[]; // New multiple phases field
  tags: string[];
  tools: string[];
  starred: boolean;
  category: string;
  commands?: Array<{
    tool: string;
    command: string;
    description: string;
    platform?: string;
    references?: Array<{
      url: string;
      description: string;
    }>;
  }>;
}

// Helper function to extract clean MITRE ID
const extractCleanMitreId = (id: string): string => {
  // Extract MITRE ID from extended IDs like "T1110.003-password-spraying"
  // Return everything before the first hyphen if it contains a hyphen
  if (id.includes('-')) {
    return id.split('-')[0];
  }
  return id;
};

// Helper function to check if ID is a valid MITRE ID format
const isValidMitreId = (id: string): boolean => {
  if (!id) return false;
  // MITRE ID format: T#### or T####.### (with optional sub-technique)
  const mitrePattern = /^T\d{4}(\.\d{3})?$/;
  return mitrePattern.test(extractCleanMitreId(id));
};

// Helper function to generate MITRE ATT&CK URL
const generateMitreUrl = (mitreId: string): string => {
  if (!mitreId || !isValidMitreId(mitreId)) return '';
  
  const cleanId = extractCleanMitreId(mitreId);
  
  // Handle sub-techniques (e.g., T1110.003 → /T1110/003/)
  if (cleanId.includes('.')) {
    const [mainTechnique, subTechnique] = cleanId.split('.');
    return `https://attack.mitre.org/techniques/${mainTechnique}/${subTechnique}/`;
  }
  
  // Handle main techniques (e.g., T1110 → /T1110/)
  return `https://attack.mitre.org/techniques/${cleanId}/`;
};

interface TechniqueCardProps {
  technique: Technique;
  onToggleFavorite: (techniqueId: string) => Promise<void>;
  onOpenAIChat?: (prompt: string) => void;
}

export const TechniqueCard = ({ technique, onToggleFavorite, onOpenAIChat }: TechniqueCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommandGenOpen, setIsCommandGenOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    trackTechniqueViewed,
    trackTechniqueFavorited,
    trackTechniqueUnfavorited,
    trackTechniqueCommandGenerated,
    trackTechniqueAIQuery,
    trackTechniqueMitreLinkAccessed,
    trackTechniqueModalOpened
  } = useTechniqueTracking();

  const toggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save favorites",
        variant: "destructive"
      });
      return;
    }

    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await onToggleFavorite(technique.id);
      
      // Track the favorite action
      const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
      const techniqueData = {
        techniqueId: technique.id,
        techniqueTitle: technique.title,
        mitreId: technique.mitre_id,
        phase: primaryPhase,
        category: technique.category
      };
      
      if (technique.starred) {
        trackTechniqueUnfavorited(techniqueData);
      } else {
        trackTechniqueFavorited(techniqueData);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAIChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenAIChat) {
      const prompt = `Tell me more about the ${technique.title} attack technique${technique.mitre_id && isValidMitreId(technique.mitre_id) ? ` (${extractCleanMitreId(technique.mitre_id)})` : ''}. Please provide additional details about its usage, tools, and methods to employ this strategy.`;
      
      // Track AI query
      const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
      trackTechniqueAIQuery({
        techniqueId: technique.id,
        techniqueTitle: technique.title,
        mitreId: technique.mitre_id,
        phase: primaryPhase,
        category: technique.category
      });
      
      onOpenAIChat(prompt);
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "Initial Access": return "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30";
      case "Reconnaissance": return "bg-cyber-green/20 text-cyber-green border-cyber-green/30";
      case "Credential Access": return "bg-cyber-purple/20 text-cyber-purple border-cyber-purple/30";
      case "Lateral Movement": return "bg-cyber-orange/20 text-cyber-orange border-cyber-orange/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <>
      <Card 
        className="group bg-gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
        onClick={() => {
          // Track technique viewed
          const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
          trackTechniqueViewed({
            techniqueId: technique.id,
            techniqueTitle: technique.title,
            mitreId: technique.mitre_id,
            phase: primaryPhase,
            category: technique.category
          });
          setIsModalOpen(true);
        }}
      >
        <CardHeader className="pb-3">
          <div className="grid grid-cols-[1fr_auto_auto] items-start gap-2">
            {/* Title and Badge Area */}
            <div className="min-w-0">
              <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors mb-2 pr-2">
                {technique.title}
              </CardTitle>
              <div className="flex flex-wrap gap-1 mb-2">
                {(technique.phases && technique.phases.length > 0 ? technique.phases : technique.phase ? [technique.phase] : []).map((phase, index) => (
                  <Badge key={index} variant="outline" className={`text-xs ${getPhaseColor(phase)}`}>
                    {phase}
                  </Badge>
                ))}
                {(technique.mitre_id && isValidMitreId(technique.mitre_id)) && (
                  <Badge variant="outline" className="text-xs bg-muted/20 text-muted-foreground border-muted/30">
                    {extractCleanMitreId(technique.mitre_id)}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Star Button - Always Top Right */}
            <div className="flex items-start justify-center pt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 hover:bg-transparent ${!user ? 'opacity-50' : ''}`}
                      onClick={toggleStar}
                      disabled={isToggling}
                    >
                      {isToggling ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Star 
                          className={`w-4 h-4 transition-colors ${
                            technique.starred ? "fill-cyber-orange text-cyber-orange" : "text-muted-foreground hover:text-cyber-orange"
                          }`} 
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{!user ? "Sign in to save favorites" : technique.starred ? "Remove favorite" : "Add favorite"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Action Icons */}
            <div className="flex items-start gap-2 pt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                      onClick={handleAIChatClick}
                    >
                      <MessageSquare className="w-4 h-4 text-cyber-purple" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ask AI</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Track command generation
                        const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
                        trackTechniqueCommandGenerated({
                          techniqueId: technique.id,
                          techniqueTitle: technique.title,
                          mitreId: technique.mitre_id,
                          phase: primaryPhase,
                          category: technique.category
                        });
                        
                        setIsCommandGenOpen(true);
                      }}
                    >
                      <Bolt className="w-4 h-4 text-cyber-blue" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate Commands</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <Zap className="w-4 h-4 text-cyber-orange" />
                      <span className="text-xs text-muted-foreground">{technique.tools.length} tools</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Available tools</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <CardDescription className="text-muted-foreground line-clamp-2">
            {technique.description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {technique.tags.slice(0, 3).map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-xs bg-muted/30 text-muted-foreground border-border/50"
                >
                  {tag}
                </Badge>
              ))}
              {technique.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs bg-muted/30 text-muted-foreground">
                  +{technique.tags.length - 3}
                </Badge>
              )}
            </div>

            {/* Tools */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tools:</span>
              <div className="flex gap-1">
                {technique.tools.slice(0, 2).map(tool => (
                  <span key={tool} className="text-xs font-mono bg-muted/30 px-2 py-1 rounded text-primary">
                    {tool}
                  </span>
                ))}
                {technique.tools.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{technique.tools.length - 2}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex flex-wrap gap-1">
                {(technique.phases || [technique.phase]).filter(Boolean).map((phase, index) => (
                  <Badge key={index} variant="outline" className={getPhaseColor(phase!)}>
                    {phase}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          // Track modal open
                          const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
                          trackTechniqueModalOpened({
                            techniqueId: technique.id,
                            techniqueTitle: technique.title,
                            mitreId: technique.mitre_id,
                            phase: primaryPhase,
                            category: technique.category
                          });
                          
                          setIsModalOpen(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View technique details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <QuickSupportTicket technique={technique} />
{(technique.mitre_id && isValidMitreId(technique.mitre_id)) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            // Track MITRE link access
                            const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
                            trackTechniqueMitreLinkAccessed({
                              techniqueId: technique.id,
                              techniqueTitle: technique.title,
                              mitreId: technique.mitre_id,
                              phase: primaryPhase,
                              category: technique.category
                            });
                            
                            const mitreUrl = generateMitreUrl(technique.mitre_id!);
                            if (mitreUrl) {
                              window.open(mitreUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View MITRE ATT&CK reference</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TechniqueModal 
        technique={technique} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onToggleFavorite={onToggleFavorite}
        onOpenAIChat={onOpenAIChat}
      />
      
      <CommandGenerator
        technique={{
          ...technique,
          phase: technique.phases?.[0] || technique.phase || 'Unknown'
        }}
        isOpen={isCommandGenOpen}
        onClose={() => setIsCommandGenOpen(false)}
      />
    </>
  );
};