import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface CollapsibleMessageProps {
  content: string;
  messageId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: (messageId: string, collapsed: boolean) => void;
  threshold?: {
    characters: number;
    lines: number;
  };
}

export const CollapsibleMessage = ({
  content,
  messageId,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  threshold = { characters: 500, lines: 8 }
}: CollapsibleMessageProps) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  
  const shouldBeCollapsible = useMemo(() => {
    const characterCount = content.length;
    const lineCount = content.split('\n').length;
    
    // Check for code blocks (which tend to be lengthy)
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    const hasCodeBlocks = codeBlockCount > 0;
    
    // Check for lists (which can be lengthy)
    const listItems = (content.match(/^[\s]*[-\*\+]\s/gm) || []).length;
    const hasLongList = listItems > 5;
    
    return (
      characterCount > threshold.characters ||
      lineCount > threshold.lines ||
      hasCodeBlocks ||
      hasLongList
    );
  }, [content, threshold]);

  const previewContent = useMemo(() => {
    if (!shouldBeCollapsible) return content;
    
    const lines = content.split('\n');
    const previewLines = lines.slice(0, 3);
    
    // If we're cutting off in the middle of a code block, include the closing ```
    let preview = previewLines.join('\n');
    const openCodeBlocks = (preview.match(/```/g) || []).length;
    if (openCodeBlocks % 2 === 1) {
      preview += '\n```';
    }
    
    return preview;
  }, [content, shouldBeCollapsible]);

  const hiddenLinesCount = useMemo(() => {
    if (!shouldBeCollapsible) return 0;
    return content.split('\n').length - 3;
  }, [content, shouldBeCollapsible]);

  const handleToggle = () => {
    const newCollapsedState = !isCollapsed;
    
    if (onToggleCollapse) {
      onToggleCollapse(messageId, newCollapsedState);
    } else {
      setInternalCollapsed(newCollapsedState);
    }
  };

  // If message doesn't need to be collapsible, render normally
  if (!shouldBeCollapsible) {
    return <MarkdownRenderer content={content} />;
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => handleToggle()}>
      <div className="space-y-2">
        <MarkdownRenderer content={isCollapsed ? previewContent : content} />
        
        {isCollapsed && (
          <div className="relative">
            <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
          </div>
        )}
        
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Show {hiddenLinesCount} more lines</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Show less</span>
                </>
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          {/* Content is handled by the MarkdownRenderer above */}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};