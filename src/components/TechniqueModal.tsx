import { useState } from "react";
import { X, Copy, Star, Zap, Shield, AlertTriangle, Eye, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

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

interface TechniqueModalProps {
  technique: Technique;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (techniqueId: string) => void;
}

// Mock detailed data for the technique
const getDetailedTechnique = (technique: Technique) => ({
  ...technique,
  whenToUse: [
    "When you have a list of valid usernames but no passwords",
    "Use during initial reconnaissance phase",
    "When organization has weak password policies"
  ],
  prerequisites: [
    "List of valid usernames, common password list"
  ],
  howToUse: [
    "Extract NTLM hashes from memory or registry",
    "Use hash with authentication tools", 
    "Access remote systems"
  ],
  commands: [
    {
      tool: "Impacket",
      template: "psexec.py target.local/user@{target_ip} -hashes :{ntlm_hash}",
      params: [
        { name: "target_ip", required: true, example: "10.10.10.10" },
        { name: "ntlm_hash", required: true, example: "aad3b435b51404eeaad3b435b51404ee:hash" }
      ]
    },
    {
      tool: "crackmapexec",
      template: "crackmapexec smb {target_range} -u {username} -H {ntlm_hash}",
      params: [
        { name: "target_range", required: true, example: "10.10.10.0/24" },
        { name: "username", required: true, example: "user" },
        { name: "ntlm_hash", required: true, example: "ntlmhash" }
      ]
    },
    {
      tool: "Rubeus",
      template: "Rubeus.exe asktgt /user:{username} /rc4:{ntlm_hash} /domain:{domain}",
      params: [
        { name: "username", required: true, example: "user" },
        { name: "ntlm_hash", required: true, example: "hash" },
        { name: "domain", required: false, example: "target.local" }
      ]
    }
  ],
  detection: [
    "Unusual authentication patterns, NTLM authentication from unexpected sources"
  ],
  mitigation: [
    "Strong SPN password policy"
  ],
  mitreMapping: "T1550.002"
});

export const TechniqueModal = ({ technique, isOpen, onClose, onToggleFavorite }: TechniqueModalProps) => {
  const [selectedCommand, setSelectedCommand] = useState(0);
  const [generatedCommand, setGeneratedCommand] = useState("");
  const [commandParams, setCommandParams] = useState<Record<string, string>>({});
  
  const detailedTechnique = getDetailedTechnique(technique);

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

  const toggleStar = () => {
    onToggleFavorite(technique.id);
    toast({
      title: technique.starred ? "Removed from favorites" : "Added to favorites",
      description: `${technique.title} ${technique.starred ? "removed from" : "added to"} your favorites.`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-card border-border">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-semibold">{technique.title}</DialogTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
              {technique.id}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" 
              size="sm"
              onClick={toggleStar}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Star className={`h-4 w-4 ${technique.starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
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
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">When to Use</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedTechnique.whenToUse.join(". ")}
            </p>
          </div>

          {/* Prerequisites */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Prerequisites</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedTechnique.prerequisites.join(", ")}
            </p>
          </div>

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
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Detection</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedTechnique.detection.join(". ")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};