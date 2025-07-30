import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Zap } from "lucide-react";
import { EnhancedUsageDisplay } from "@/components/EnhancedUsageDisplay";
import { CompactUsageDisplay } from "@/components/CompactUsageDisplay";
import { useAIUsage } from "@/hooks/useAIUsage";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EnhancedUsageToggleProps {
  className?: string;
  defaultExpanded?: boolean;
  showCompactWhenCollapsed?: boolean;
}

export const EnhancedUsageToggle = ({ 
  className = "", 
  defaultExpanded = false,
  showCompactWhenCollapsed = true 
}: EnhancedUsageToggleProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { canUseAI, currentUsage, quotaLimit, planName } = useAIUsage();

  return (
    <div className={`space-y-2 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          {showCompactWhenCollapsed && !isExpanded && (
            <div className="flex-1 mr-2">
              <CompactUsageDisplay
                currentUsage={currentUsage}
                quotaLimit={quotaLimit}
                planName={planName}
                canUseAI={canUseAI}
              />
            </div>
          )}
          
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Zap className="h-3 w-3" />
              <span>{isExpanded ? 'Hide Details' : 'AI Usage'}</span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pt-2">
            <EnhancedUsageDisplay
              currentUsage={currentUsage}
              quotaLimit={quotaLimit}
              planName={planName}
              canUseAI={canUseAI}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};