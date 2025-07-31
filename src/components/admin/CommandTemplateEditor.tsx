import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Copy, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CommandTemplate {
  tool: string;
  command: string;
  description: string;
}

interface CommandTemplateEditorProps {
  commands: CommandTemplate[];
  onChange: (commands: CommandTemplate[]) => void;
}

export function CommandTemplateEditor({ commands, onChange }: CommandTemplateEditorProps) {
  const [newCommand, setNewCommand] = useState<CommandTemplate>({
    tool: '',
    command: '',
    description: ''
  });
  const { toast } = useToast();

  const extractParameters = (command: string): string[] => {
    const matches = command.match(/<[^>]+>/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const addCommand = () => {
    if (!newCommand.tool || !newCommand.command || !newCommand.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields for the command template.",
        variant: "destructive"
      });
      return;
    }

    onChange([...commands, { ...newCommand }]);
    setNewCommand({ tool: '', command: '', description: '' });
    toast({
      title: "Command Added",
      description: "Command template has been added successfully."
    });
  };

  const removeCommand = (index: number) => {
    const updated = commands.filter((_, i) => i !== index);
    onChange(updated);
    toast({
      title: "Command Removed",
      description: "Command template has been removed."
    });
  };

  const updateCommand = (index: number, field: keyof CommandTemplate, value: string) => {
    const updated = commands.map((cmd, i) => 
      i === index ? { ...cmd, [field]: value } : cmd
    );
    onChange(updated);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: "Copied",
      description: "Command copied to clipboard."
    });
  };

  const testCommand = (command: CommandTemplate) => {
    const parameters = extractParameters(command.command);
    let testCommand = command.command;
    
    // Replace parameters with example values
    parameters.forEach(param => {
      const placeholder = `<${param}>`;
      let exampleValue = '';
      
      if (param.toLowerCase().includes('target') || param.toLowerCase().includes('host')) {
        exampleValue = '192.168.1.100';
      } else if (param.toLowerCase().includes('url')) {
        exampleValue = 'https://example.com';
      } else if (param.toLowerCase().includes('user')) {
        exampleValue = 'admin';
      } else if (param.toLowerCase().includes('pass')) {
        exampleValue = 'password123';
      } else if (param.toLowerCase().includes('port')) {
        exampleValue = '80';
      } else {
        exampleValue = 'example_value';
      }
      
      testCommand = testCommand.replace(placeholder, exampleValue);
    });

    copyCommand(testCommand);
    toast({
      title: "Test Command Generated",
      description: "Generated command with example values copied to clipboard."
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Command Templates</Label>
        <Badge variant="secondary">{commands.length} commands</Badge>
      </div>

      {/* Existing Commands */}
      {commands.map((command, index) => {
        const parameters = extractParameters(command.command);
        
        return (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{command.tool}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testCommand(command)}
                    className="h-8 w-8 p-0"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCommand(command.command)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCommand(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor={`tool-${index}`} className="text-xs">Tool</Label>
                <Input
                  id={`tool-${index}`}
                  value={command.tool}
                  onChange={(e) => updateCommand(index, 'tool', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor={`command-${index}`} className="text-xs">Command Template</Label>
                <Textarea
                  id={`command-${index}`}
                  value={command.command}
                  onChange={(e) => updateCommand(index, 'command', e.target.value)}
                  className="mt-1 font-mono text-sm"
                  rows={2}
                />
                {parameters.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {parameters.map((param, paramIndex) => (
                      <Badge key={paramIndex} variant="outline" className="text-xs">
                        {param}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor={`description-${index}`} className="text-xs">Description</Label>
                <Input
                  id={`description-${index}`}
                  value={command.description}
                  onChange={(e) => updateCommand(index, 'description', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add New Command */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add New Command Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="new-tool" className="text-xs">Tool</Label>
            <Input
              id="new-tool"
              value={newCommand.tool}
              onChange={(e) => setNewCommand({ ...newCommand, tool: e.target.value })}
              placeholder="e.g., SQLMap, Nmap, Hydra"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="new-command" className="text-xs">Command Template</Label>
            <Textarea
              id="new-command"
              value={newCommand.command}
              onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value })}
              placeholder="e.g., sqlmap -u <url> --dbs --batch"
              className="mt-1 font-mono text-sm"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use &lt;parameter&gt; syntax for variables. Example: &lt;target&gt;, &lt;username&gt;, &lt;password&gt;
            </p>
          </div>
          
          <div>
            <Label htmlFor="new-description" className="text-xs">Description</Label>
            <Input
              id="new-description"
              value={newCommand.description}
              onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
              placeholder="e.g., Enumerate databases on target"
              className="mt-1"
            />
          </div>
          
          <Button onClick={addCommand} className="w-full" size="sm">
            <Plus className="h-3 w-3 mr-1" />
            Add Command Template
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p><strong>Tip:</strong> Use parameter syntax like &lt;target&gt;, &lt;username&gt;, &lt;password&gt; for dynamic values.</p>
        <p>The command generator will automatically detect and provide input fields for these parameters.</p>
      </div>
    </div>
  );
}
