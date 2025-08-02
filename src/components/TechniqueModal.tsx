import { useState, useEffect } from "react";
import { X, Copy, Star, Zap, Shield, AlertTriangle, Eye, Settings, Bolt, ExternalLink, Loader2, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { CommandGenerator } from "./CommandGenerator";
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
  }>;
  referenceLinks?: Array<{
    title: string;
    url: string;
    description?: string;
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

// Helper function to clean "How to Use" steps
const cleanHowToUseSteps = (steps: string[]): string[] => {
  return steps.map(step => 
    step
      .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
      .replace(/^\*\*Step\s+\d+:\*\*\s*/, '') // Remove "**Step 1:** ", "**Step 2:** ", etc.
      .replace(/^\*\*Step\s+\d+\*\*\s*/, '') // Remove "**Step 1** ", "**Step 2** ", etc.
      .trim()
  ).filter(step => step.length > 0);
};

interface TechniqueModalProps {
  technique: Technique;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (techniqueId: string) => Promise<void>;
  onOpenAIChat?: (prompt: string) => void;
}

// Enhanced function to get detailed technique data
const getDetailedTechnique = (technique: any) => {
  // If the technique already has detailed data from markdown parsing, use it
  if (technique.whenToUse && technique.commands) {
    const rawHowToUse = Array.isArray(technique.howToUse) ? technique.howToUse : (technique.howToUse || "Follow standard procedures").split('\n').filter(Boolean);
    return {
      ...technique,
      whenToUse: Array.isArray(technique.whenToUse) ? technique.whenToUse : [technique.whenToUse],
      prerequisites: Array.isArray(technique.prerequisites) ? technique.prerequisites : [technique.prerequisites || "No specific prerequisites"],
      howToUse: cleanHowToUseSteps(rawHowToUse),
      commands: technique.commands.map((cmd: any) => ({
        tool: cmd.tool,
        template: cmd.command,
        params: extractParamsFromCommand(cmd.command)
      })),
      detection: Array.isArray(technique.detection) ? technique.detection : [technique.detection || "Monitor for suspicious activity"],
      mitigation: Array.isArray(technique.mitigation) ? technique.mitigation : [technique.mitigation || "Implement security controls"]
    };
  }

  // Fallback for techniques without detailed data
  return {
    ...technique,
    whenToUse: ["Use this technique when appropriate for your security assessment"],
    prerequisites: ["Ensure proper authorization and access"],
    howToUse: ["Follow documented procedures", "Execute with proper precautions"],
    commands: technique.tools.map((tool: string) => ({
      tool,
      template: `${tool.toLowerCase()} --help`,
      params: []
    })),
    detection: ["Monitor for unusual activity patterns"],
    mitigation: ["Implement proper security controls"]
  };
};

// Helper function to extract parameters from command strings
const extractParamsFromCommand = (command: string) => {
  const params: Array<{ name: string; required: boolean; example: string }> = [];
  const paramRegex = /<([^>]+)>/g;
  let match;
  
  while ((match = paramRegex.exec(command)) !== null) {
    const paramName = match[1];
    params.push({
      name: paramName,
      required: true,
      example: paramName.includes('ip') ? '10.10.10.10' : 
               paramName.includes('domain') ? 'example.com' :
               paramName.includes('user') ? 'admin' :
               paramName.includes('pass') ? 'password123' :
               'value'
    });
  }
  
  return params;
};

export const TechniqueModal = ({ technique, isOpen, onClose, onToggleFavorite, onOpenAIChat }: TechniqueModalProps) => {
  const [selectedCommand, setSelectedCommand] = useState(0);
  const [generatedCommand, setGeneratedCommand] = useState("");
  const [commandParams, setCommandParams] = useState<Record<string, string>>({});
  const [isCommandGenOpen, setIsCommandGenOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(technique.starred);
  const [isToggling, setIsToggling] = useState(false);
  
  const detailedTechnique = getDetailedTechnique(technique);
  const {
    trackTechniqueFavorited,
    trackTechniqueUnfavorited,
    trackTechniqueAIQuery,
    trackTechniqueCommandGenerated,
    trackTechniqueModalOpened
  } = useTechniqueTracking();

  // Reset starred state when modal opens or technique changes
  useEffect(() => {
    if (isOpen) {
      setIsStarred(technique.starred);
      
      // Track modal opened when it first opens
      const primaryPhase = technique.phases?.[0] || technique.phase || 'Unknown';
      trackTechniqueModalOpened({
        techniqueId: technique.id,
        techniqueTitle: technique.title,
        mitreId: technique.mitre_id,
        phase: primaryPhase,
        category: technique.category
      });
    }
  }, [isOpen, technique.starred, trackTechniqueModalOpened, technique.id, technique.title, technique.mitre_id, technique.phase, technique.category]);

  const generateCommand = () => {
    const command = detailedTechnique.commands[selectedCommand];
    let generated = command.template;
    
    command.params.forEach(param => {
      const value = commandParams[param.name] || param.example;
      generated = generated.replace(`{${param.name}}`, value);
    });
    
    setGeneratedCommand(generated);
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(generatedCommand);
    toast({
      title: "Copied",
      description: "Command copied to clipboard."
    });
  };

  const toggleStar = async () => {
    try {
      setIsToggling(true);
      const wasStarred = isStarred;
      // Update local state immediately for instant visual feedback
      setIsStarred(!isStarred);
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
      
      if (wasStarred) {
        trackTechniqueUnfavorited(techniqueData);
      } else {
        trackTechniqueFavorited(techniqueData);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert local state on error
      setIsStarred(isStarred);
      toast({
        title: "Error",
        description: "Failed to update favorite. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleAIChatClick = () => {
    if (onOpenAIChat) {
      const prompt = `Tell me more about the ${technique.title} attack technique${technique.mitre_id ? ` (${extractCleanMitreId(technique.mitre_id)})` : ''}. Please provide additional details about its usage, tools, and methods to employ this strategy.`;
      
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
      onClose(); // Close modal after opening chat
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-semibold">{technique.title}</DialogTitle>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                {extractCleanMitreId(technique.mitre_id || technique.id)}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={handleAIChatClick}
                    className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <MessageSquare className="h-4 w-4 text-cyber-purple" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>Ask AI</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="sm"
                     onClick={() => {
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
                    className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Bolt className="h-4 w-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>Generate Commands</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={toggleStar}
                    disabled={isToggling}
                    className="h-6 w-6 p-0 hover:bg-muted"
                  >
                    {isToggling ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Star className={`h-4 w-4 ${isStarred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>{isStarred ? "Remove favorite" : "Add favorite"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>Close</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] p-1">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {technique.description}
            </p>
          </div>

          {/* When to Use */}
          {detailedTechnique.whenToUse && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">When to Use</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {Array.isArray(detailedTechnique.whenToUse) ? 
                  detailedTechnique.whenToUse.join(". ") : 
                  detailedTechnique.whenToUse}
              </p>
            </div>
          )}

          {/* Prerequisites */}
          {detailedTechnique.prerequisites && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Prerequisites</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {Array.isArray(detailedTechnique.prerequisites) ? 
                  detailedTechnique.prerequisites.join(", ") : 
                  detailedTechnique.prerequisites}
              </p>
            </div>
          )}

          {/* How to Use */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">How to Use</h3>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <ol className="list-decimal list-inside space-y-1">
                {detailedTechnique.howToUse.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Tools & Commands */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Tools & Commands</h3>
            <div className="space-y-4">
              {detailedTechnique.commands.map((cmd, index) => (
                <div key={index} className="bg-muted/30 rounded-md p-3 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">{cmd.tool}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(cmd.template.replace(/\{[^}]+\}/g, (match) => {
                          const paramName = match.slice(1, -1);
                          const param = cmd.params.find(p => p.name === paramName);
                          return param?.example || match;
                        }));
                        toast({
                          title: "Copied",
                          description: "Command template copied to clipboard."
                        });
                      }}
                      className="h-7 px-2 hover:bg-primary/10"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground bg-background/50 p-2 rounded block whitespace-pre-wrap border">
                    {cmd.template.replace(/\{([^}]+)\}/g, (match, paramName) => {
                      const param = cmd.params.find(p => p.name === paramName);
                      return param?.example || match;
                    })}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cmd.params.map(p => p.name).join(", ")} parameters
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detection */}
          {detailedTechnique.detection && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Detection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {Array.isArray(detailedTechnique.detection) ? 
                  detailedTechnique.detection.join(". ") : 
                  detailedTechnique.detection}
              </p>
            </div>
          )}

          {/* Mitigation */}
          {detailedTechnique.mitigation && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Mitigation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {Array.isArray(detailedTechnique.mitigation) ? 
                  detailedTechnique.mitigation.join(". ") : 
                  detailedTechnique.mitigation}
              </p>
            </div>
          )}

          {/* Reference Links */}
          {technique.referenceLinks && technique.referenceLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">References</h3>
              <div className="space-y-2">
                {technique.referenceLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                    >
                      {link.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {link.description && (
                      <span className="text-xs text-muted-foreground">
                        — {link.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Command Generator */}
        {isCommandGenOpen && (
          <CommandGenerator
            technique={{
              ...detailedTechnique,
              phase: detailedTechnique.phases?.[0] || detailedTechnique.phase || 'Unknown'
            }}
            isOpen={isCommandGenOpen}
            onClose={() => setIsCommandGenOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};