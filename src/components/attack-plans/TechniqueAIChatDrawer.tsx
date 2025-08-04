import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChatSession } from '@/components/ChatSession';
import { MessageSquare, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useUserModelAccess } from '@/hooks/useUserModelAccess';
import { useChatContext } from '@/contexts/ChatContext';

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

interface TechniqueAIChatDrawerProps {
  technique: Technique | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TechniqueAIChatDrawer: React.FC<TechniqueAIChatDrawerProps> = ({
  technique,
  open,
  onOpenChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Get model access and chat context for validation
  const { selectedModel, selectedModelId, loading: modelsLoading } = useUserModelAccess();
  const { currentSession } = useChatContext();

  // Generate context-aware initial prompt when technique is selected
  useEffect(() => {
    if (technique && open) {
      setIsInitializing(true);
      const prompt = generateTechniquePrompt(technique);
      setInitialPrompt(prompt);
      // Don't reset session to null - let ChatSession manage it properly
      // This ensures the same battle-tested session management as sidebar/fullscreen
      
      // Wait for models to load before allowing chat
      const checkReadiness = () => {
        if (!modelsLoading && selectedModelId) {
          console.log('✅ TechniqueAIChatDrawer ready:', { selectedModelId, hasModel: !!selectedModel });
          setIsInitializing(false);
        }
      };
      
      // Check immediately and set up a retry mechanism
      checkReadiness();
      const readinessInterval = setInterval(() => {
        checkReadiness();
        if (!modelsLoading && selectedModelId) {
          clearInterval(readinessInterval);
        }
      }, 100);
      
      // Cleanup
      return () => clearInterval(readinessInterval);
    }
  }, [technique, open, modelsLoading, selectedModelId, selectedModel]);

  const generateTechniquePrompt = (tech: Technique): string => {
    const context = `I'm working with the following attack technique and need assistance:

**Technique**: ${tech.title}
**Phase**: ${tech.phase}
**Category**: ${tech.category}
**Description**: ${tech.description}

${tech.tags && tech.tags.length > 0 ? `**Tags**: ${tech.tags.join(', ')}\n` : ''}
${tech.tools && tech.tools.length > 0 ? `**Tools**: ${tech.tools.join(', ')}\n` : ''}
${tech.how_to_use && tech.how_to_use.length > 0 ? `**How to Use**:\n${tech.how_to_use.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n` : ''}
${tech.when_to_use && tech.when_to_use.length > 0 ? `**When to Use**:\n${tech.when_to_use.map(scenario => `• ${scenario}`).join('\n')}\n` : ''}
${tech.mitigation && tech.mitigation.length > 0 ? `**Mitigation**:\n${tech.mitigation.map(m => `• ${m}`).join('\n')}\n` : ''}
${tech.detection && tech.detection.length > 0 ? `**Detection**:\n${tech.detection.map(d => `• ${d}`).join('\n')}\n` : ''}

Please help me understand this technique better. I'm looking for insights about implementation, defense strategies, or practical applications.`;

    return context;
  };

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId);
  };

  if (!technique) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className={cn(
          "h-auto max-h-[80vh] min-h-[400px] transition-all duration-300",
          isExpanded ? "h-[60vh]" : "h-[40vh]"
        )}
      >
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div className="flex flex-col items-start">
                <DrawerTitle className="text-lg font-semibold">
                  AI Assistant - {technique.title}
                </DrawerTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {technique.phase}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {technique.category}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
              
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 min-h-0 p-0">
          {(isInitializing || modelsLoading || !selectedModelId) ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Initializing AI Chat</p>
                  <p className="text-xs text-muted-foreground">
                    {modelsLoading ? "Loading AI models..." : 
                     !selectedModelId ? "Waiting for model selection..." : 
                     "Preparing chat session..."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ChatSession
              sessionId={sessionId}
              initialPrompt={initialPrompt}
              onSessionChange={handleSessionChange}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};