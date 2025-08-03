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
import { cn } from '@/lib/utils';

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

// Helper function to convert navigation phase names to display labels
const getDisplayPhases = (technique: Technique): string[] => {
  const phaseNameToLabel: Record<string, string> = {
    // Navigation phases
    'recon': 'Active Reconnaissance',
    'foothold': 'Establish Foothold',
    'enum': 'Enumeration',
    'enumeration': 'Enumeration',
    'user_persistence': 'User Persistence',
    'pe': 'Privilege Escalation',
    'system_persistence': 'System Persistence',
    'collection': 'Collection',
    'remote_enum': 'Remote Enumeration',
    'lateral_mvmnt': 'Lateral Movement',
    'c2': 'C2',
    'effects': 'Effects',
    // MITRE ATT&CK phases
    'initial-access': 'Initial Access',
    'execution': 'Execution',
    'persistence': 'Persistence',
    'privilege-escalation': 'Privilege Escalation',
    'defense-evasion': 'Defense Evasion',
    'credential-access': 'Credential Access',
    'discovery': 'Discovery',
    'lateral-movement': 'Lateral Movement',
    'command-and-control': 'Command and Control',
    'exfiltration': 'Exfiltration',
    'impact': 'Impact',
    'reconnaissance': 'Reconnaissance',
    'resource-development': 'Resource Development'
  };
  
  // Use phases array if available, otherwise fall back to single phase
  const phases = technique.phases && technique.phases.length > 0 
    ? technique.phases.filter(phase => phase && phase.trim() !== '')
    : (technique.phase ? [technique.phase] : []);
    
  return phases.map(phase => {
    // Convert to lowercase for case-insensitive matching
    const cleanPhase = phase?.toLowerCase()?.trim();
    return phaseNameToLabel[cleanPhase] || 
           // Fallback: capitalize first letter and replace hyphens/underscores with spaces
           phase?.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
           'Unknown';
  }).filter(Boolean);
};

interface TechniqueCardProps {
  technique: Technique;
  onToggleFavorite: (techniqueId: string) => Promise<void>;
  onOpenAIChat?: (prompt: string) => void;
  cardWidth?: string;
  columnCount?: number;
}

export const TechniqueCard = ({ technique, onToggleFavorite, onOpenAIChat, cardWidth = 'medium', columnCount = 3 }: TechniqueCardProps) => {
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

  // Determine content adaptation based on card width and column count
  const isNarrow = columnCount >= 5 || cardWidth === 'minimal' || cardWidth === 'compact';
  const isVeryNarrow = columnCount >= 6 || cardWidth === 'minimal';
  const showFullContent = cardWidth === 'full' || cardWidth === 'wide';
  const showSecondaryActions = !isVeryNarrow;

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
      case "Active Reconnaissance": 
        return "bg-cyber-green/20 text-cyber-green border-cyber-green/30";
      case "Establish Foothold": 
        return "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30";
      case "Enumeration": 
        return "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/30";
      case "Remote Enumeration": 
        return "bg-cyber-yellow/30 text-cyber-yellow border-cyber-yellow/40";
      case "User Persistence": 
        return "bg-cyber-purple/20 text-cyber-purple border-cyber-purple/30";
      case "Privilege Escalation": 
        return "bg-cyber-purple/30 text-cyber-purple border-cyber-purple/40";
      case "System Persistence": 
        return "bg-cyber-purple/25 text-cyber-purple border-cyber-purple/35";
      case "Lateral Movement": 
        return "bg-cyber-orange/20 text-cyber-orange border-cyber-orange/30";
      case "Collection": 
        return "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30";
      case "C2": 
        return "bg-cyber-cyan/30 text-cyber-cyan border-cyber-cyan/40";
      case "Effects": 
        return "bg-cyber-red/20 text-cyber-red border-cyber-red/30";
      default: 
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <>
      <Card 
        className="group relative overflow-hidden border-border/50 bg-gradient-card backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer"
        onClick={() => {
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
        <CardContent className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-foreground leading-tight mb-1",
                isVeryNarrow ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
              )}>
                {technique.title}
              </h3>
              {/* MITRE ID Badge */}
              {(technique.mitre_id && isValidMitreId(technique.mitre_id)) && !isVeryNarrow && (
                <Badge variant="outline" className="text-xs bg-muted/20 text-muted-foreground border-muted/30">
                  {extractCleanMitreId(technique.mitre_id)}
                </Badge>
              )}
              {/* Phase badges - always visible */}
              <div className="flex flex-wrap gap-1 mt-1">
                {getDisplayPhases(technique).slice(0, isNarrow ? 1 : 2).map((phase, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={cn("text-xs px-2 py-0.5", getPhaseColor(phase))}
                  >
                    {phase}
                  </Badge>
                ))}
                {getDisplayPhases(technique).length > (isNarrow ? 1 : 2) && (
                  <Badge 
                    variant="outline" 
                    className="text-xs px-2 py-0.5 text-muted-foreground border-muted-foreground/30 bg-muted/5"
                  >
                    +{getDisplayPhases(technique).length - (isNarrow ? 1 : 2)}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Top-right action icons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Star button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-amber-500 transition-colors"
                      onClick={toggleStar}
                      disabled={isToggling}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Star className={cn("w-3 h-3", technique.starred && "fill-amber-500 text-amber-500")} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{!user ? "Sign in to save favorites" : technique.starred ? "Remove favorite" : "Add favorite"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* AI Chat button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                      onClick={handleAIChatClick}
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ask AI about this technique</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Generate Commands */}
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
                      <Bolt className="w-3 h-3 text-cyber-blue" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate Commands</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Description - adaptive length */}
          <p className={cn(
            "text-muted-foreground leading-relaxed mb-4 flex-1",
            isVeryNarrow ? "text-xs line-clamp-2" : isNarrow ? "text-xs line-clamp-3" : "text-xs line-clamp-3"
          )}>
            {technique.description}
          </p>

          {/* Tags - show fewer in narrow layouts */}
          {technique.tags && technique.tags.length > 0 && !isVeryNarrow && (
            <div className="flex flex-wrap gap-1 mb-4">
              {technique.tags.slice(0, isNarrow ? 2 : 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 text-secondary-foreground bg-secondary/50"
                >
                  {tag}
                </Badge>
              ))}
              {technique.tags.length > (isNarrow ? 2 : 3) && (
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 text-muted-foreground bg-muted/20"
                >
                  +{technique.tags.length - (isNarrow ? 2 : 3)}
                </Badge>
              )}
            </div>
          )}

          {/* Tools - always show indicator */}
          {technique.tools && technique.tools.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                <span>
                  {showFullContent 
                    ? `${technique.tools.slice(0, isNarrow ? 2 : 3).join(", ")}${technique.tools.length > (isNarrow ? 2 : 3) ? ` +${technique.tools.length - (isNarrow ? 2 : 3)} more` : ''}`
                    : `${technique.tools.length} tool${technique.tools.length > 1 ? 's' : ''}`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Footer with action buttons - bottom right only */}
          <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/30 min-h-[28px]">
            {/* Support Ticket - always visible */}
            <div onClick={(e) => e.stopPropagation()}>
              <QuickSupportTicket technique={technique} />
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