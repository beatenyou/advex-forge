import { useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CompactUsageDisplay } from "@/components/CompactUsageDisplay";
import { UserModelSelector } from "@/components/UserModelSelector";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatHeaderRowProps {
  currentUsage: number;
  quotaLimit: number;
  planName: string;
  canUseAI: boolean;
}

export function ChatHeaderRow({ 
  currentUsage, 
  quotaLimit, 
  planName, 
  canUseAI 
}: ChatHeaderRowProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="border-t border-border bg-muted/30 px-3 py-2">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="flex items-center justify-between">
          {/* Always visible: Plan badge and essential info */}
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="text-xs font-medium">
              {planName}
            </Badge>
            
            {/* Mobile: Show collapsed usage info */}
            <div className="flex items-center gap-2 sm:hidden">
              <div className="text-xs text-muted-foreground">
                {currentUsage}/{quotaLimit}
              </div>
              {!canUseAI && (
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
          </div>

          {/* Desktop: Full row layout */}
          <div className="hidden sm:flex items-center gap-3">
            <CompactUsageDisplay 
              currentUsage={currentUsage}
              quotaLimit={quotaLimit}
              planName={planName}
              canUseAI={canUseAI}
              className="flex"
            />
            <div className="h-4 w-px bg-border" />
            <UserModelSelector compact />
          </div>

          {/* Mobile: Collapsible trigger and overflow menu */}
          <div className="flex items-center gap-2 sm:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Usage</h4>
                    <CompactUsageDisplay 
                      currentUsage={currentUsage}
                      quotaLimit={quotaLimit}
                      planName={planName}
                      canUseAI={canUseAI}
                      className="flex"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Model</h4>
                    <UserModelSelector />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Mobile: Collapsible content */}
        <CollapsibleContent className="sm:hidden">
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Usage</span>
              <CompactUsageDisplay 
                currentUsage={currentUsage}
                quotaLimit={quotaLimit}
                planName={planName}
                canUseAI={canUseAI}
                className="flex"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Model</span>
              <UserModelSelector compact />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}