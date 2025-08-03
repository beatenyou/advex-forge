import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Node } from '@xyflow/react';
import { MessageSquare, ExternalLink, Shield, Target, Wrench } from 'lucide-react';

interface Technique {
  id: string;
  title: string;
  description: string;
  phase: string;
  category: string;
  tags: string[];
  how_to_use?: string[];
  when_to_use?: string[];
  tools?: string[];
  mitigation?: string[];
  detection?: string[];
  commands?: any[];
}

interface TechniqueDetailsPanelProps {
  selectedNode: Node | null;
}

export const TechniqueDetailsPanel: React.FC<TechniqueDetailsPanelProps> = ({ selectedNode }) => {
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Technique Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a technique node to view details</p>
          </div>
        </CardContent>
      </div>
    );
  }

  const technique = selectedNode.data.technique as Technique | undefined;

  if (!technique) {
    return (
      <div className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Node Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">{String(selectedNode.data.label)}</h3>
              <p className="text-sm text-muted-foreground">
                Node ID: {selectedNode.id}
              </p>
            </div>
          </div>
        </CardContent>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Technique Details</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-6 pb-4">
            {/* Header */}
            <div>
              <h3 className="font-semibold text-lg mb-2">{technique.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {technique.description}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{technique.phase}</Badge>
                <Badge variant="secondary">{technique.category}</Badge>
                {technique.tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* How to Use */}
            {technique.how_to_use && technique.how_to_use.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4" />
                  <h4 className="font-medium">How to Use</h4>
                </div>
                <ul className="space-y-2">
                  {technique.how_to_use.map((step, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary font-medium">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* When to Use */}
            {technique.when_to_use && technique.when_to_use.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" />
                  <h4 className="font-medium">When to Use</h4>
                </div>
                <ul className="space-y-1">
                  {technique.when_to_use.map((scenario, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {scenario}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tools */}
            {technique.tools && technique.tools.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4" />
                  <h4 className="font-medium">Tools</h4>
                </div>
                <div className="flex flex-wrap gap-1">
                  {technique.tools.map(tool => (
                    <Badge key={tool} variant="outline" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Commands */}
            {technique.commands && technique.commands.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4" />
                  <h4 className="font-medium">Commands</h4>
                </div>
                <div className="space-y-2">
                  {technique.commands.map((cmd: any, index) => (
                    <div key={index} className="bg-muted p-3 rounded text-sm font-mono">
                      {typeof cmd === 'string' ? cmd : cmd.command || cmd.text || JSON.stringify(cmd)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mitigation */}
            {technique.mitigation && technique.mitigation.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4" />
                  <h4 className="font-medium">Mitigation</h4>
                </div>
                <ul className="space-y-1">
                  {technique.mitigation.map((mitigation, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {mitigation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detection */}
            {technique.detection && technique.detection.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ExternalLink className="w-4 h-4" />
                  <h4 className="font-medium">Detection</h4>
                </div>
                <ul className="space-y-1">
                  {technique.detection.map((detection, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {detection}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Chat Integration */}
            <div className="pt-4">
              <Button className="w-full" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask AI about this technique
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </div>
  );
};