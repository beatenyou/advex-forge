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
  commands?: Array<{
    tool: string;
    command: string;
    description: string;
  }>;
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
  // Use the technique's command templates if available
  if (technique.commands && technique.commands.length > 0) {
    return technique.commands.map(cmd => ({
      tool: cmd.tool,
      template: cmd.command,
      description: cmd.description,
      params: extractParameters(cmd.command)
    }));
  }
  
  // Fallback to default templates if no commands are defined
  return [
    {
      tool: "Default Tool",
      template: "tool_command <target> <username> <password>",
      description: "Default command template - please add command templates to this technique",
      params: ["target", "username", "password"]
    }
  ];
};

// Helper function to extract parameters from command template
const extractParameters = (command: string): string[] => {
  const paramMatches = command.match(/<([^>]+)>/g) || [];
  return paramMatches.map(param => param.slice(1, -1)); // Remove < and >
};

export const CommandGenerator = ({ technique, isOpen, onClose }: CommandGeneratorProps) => {
  const [parameters, setParameters] = useState<{[key: string]: string}>({
    target: "10.10.10.10",
    domain: "target.local",
    username: "user",
    password: "password",
    output_file: "output.txt",
    dc_ip: "10.10.10.10"
  });
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

  const updateParameter = (key: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generateCommand = (template: string) => {
    let command = template;
    // Replace all parameters in the command
    Object.entries(parameters).forEach(([key, value]) => {
      const regex = new RegExp(`<${key}>`, 'g');
      command = command.replace(regex, value);
    });
    return command;
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

  // Get all unique parameters from all templates
  const allParameters = Array.from(new Set(
    commandTemplates.flatMap(template => extractParameters(template.template))
  ));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-card border-border">
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
              Fill in the parameters below to generate custom commands:
            </p>
          </div>

          {/* Dynamic Input Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allParameters.map((param) => (
              <div key={param} className="space-y-2">
                <Label htmlFor={`param-${param}`} className="text-sm font-medium capitalize">
                  {param.replace(/_/g, ' ')}
                </Label>
                <Input
                  id={`param-${param}`}
                  value={parameters[param] || ''}
                  onChange={(e) => updateParameter(param, e.target.value)}
                  className="bg-muted/30 border-border/50"
                  placeholder={`Enter ${param.replace(/_/g, ' ')}`}
                />
              </div>
            ))}
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
              Generate All Commands
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
