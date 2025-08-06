import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Eye, Bolt, ExternalLink, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { TechniqueModal } from "../TechniqueModal";
import { CommandGenerator } from "../CommandGenerator";
import { cn } from "@/lib/utils";

// Use any type to avoid conflicts with different Technique interfaces
interface FocusedTechniqueData {
  id: string;
  mitre_id?: string;
  title: string;
  description: string;
  phase?: string;
  phases?: string[];
  tags: string[];
  tools: string[];
  starred: boolean;
  category: string;
  commands?: Array<{
    tool: string;
    command: string;
    description: string;
    platform?: string;
  }>;
}

interface FocusedTechniqueDisplayProps {
  technique: FocusedTechniqueData;
  onToggleFavorite?: (techniqueId: string) => Promise<void>;
  className?: string;
}

// Helper functions (copied from TechniqueCard for consistency)
const extractCleanMitreId = (id: string): string => {
  if (id.includes('-')) {
    return id.split('-')[0];
  }
  return id;
};

const isValidMitreId = (id: string): boolean => {
  if (!id) return false;
  const mitrePattern = /^T\d{4}(\.\d{3})?$/;
  return mitrePattern.test(extractCleanMitreId(id));
};

const generateMitreUrl = (mitreId: string): string => {
  if (!mitreId || !isValidMitreId(mitreId)) return '';
  
  const cleanId = extractCleanMitreId(mitreId);
  
  if (cleanId.includes('.')) {
    const [mainTechnique, subTechnique] = cleanId.split('.');
    return `https://attack.mitre.org/techniques/${mainTechnique}/${subTechnique}/`;
  }
  
  return `https://attack.mitre.org/techniques/${cleanId}/`;
};

const getDisplayPhases = (technique: FocusedTechniqueData): string[] => {
  const phaseNameToLabel: Record<string, string> = {
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
  
  const phases = technique.phases && technique.phases.length > 0 
    ? technique.phases.filter(phase => phase && phase.trim() !== '')
    : [];
    
  return phases.map(phase => {
    const cleanPhase = phase?.toLowerCase()?.trim();
    return phaseNameToLabel[cleanPhase] || 
           phase?.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
           'Unknown';
  }).filter(Boolean);
};

export const FocusedTechniqueDisplay = ({ 
  technique, 
  onToggleFavorite, 
  className 
}: FocusedTechniqueDisplayProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommandGenOpen, setIsCommandGenOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const displayPhases = getDisplayPhases(technique);
  const mitreUrl = technique.mitre_id ? generateMitreUrl(technique.mitre_id) : '';

  const handleToggleFavorite = async () => {
    if (isToggling || !onToggleFavorite) return;
    setIsToggling(true);
    try {
      await onToggleFavorite(technique.id);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className={cn("border-b border-border pb-4 mb-4", className)}>
      <Card className="bg-card/50 border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-base font-semibold text-foreground truncate">
                  {technique.title}
                </CardTitle>
                {technique.mitre_id && (
                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                    {technique.mitre_id}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                {technique.description}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {onToggleFavorite && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleFavorite}
                      disabled={isToggling}
                      className={cn(
                        "h-8 w-8 p-0 transition-colors",
                        technique.starred 
                          ? "text-yellow-500 hover:text-yellow-600" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Star className={cn("h-4 w-4", technique.starred && "fill-current")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{technique.starred ? "Remove from favorites" : "Add to favorites"}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View details</p>
                </TooltipContent>
              </Tooltip>

              {technique.commands && technique.commands.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCommandGenOpen(true)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Bolt className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate commands</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {mitreUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(mitreUrl, '_blank')}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on MITRE ATT&CK</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Phases */}
            {displayPhases.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Phases</p>
                <div className="flex flex-wrap gap-1">
                  {displayPhases.slice(0, 2).map((phase, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {phase}
                    </Badge>
                  ))}
                  {displayPhases.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{displayPhases.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {technique.tags && technique.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {technique.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {technique.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{technique.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Tools */}
            {technique.tools && technique.tools.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tools</p>
                <div className="flex flex-wrap gap-1">
                  {technique.tools.slice(0, 3).map((tool, index) => (
                    <Badge key={index} variant="outline" className="text-xs font-mono">
                      {tool}
                    </Badge>
                  ))}
                  {technique.tools.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{technique.tools.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {isModalOpen && (
        <TechniqueModal
          technique={technique as any}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      {isCommandGenOpen && (
        <CommandGenerator
          technique={technique as any}
          isOpen={isCommandGenOpen}
          onClose={() => setIsCommandGenOpen(false)}
        />
      )}
    </div>
  );
};