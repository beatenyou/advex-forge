import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, Maximize2, Minimize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";
import { UserModelSelector } from "@/components/UserModelSelector";
import { CompactUsageDisplay } from "@/components/CompactUsageDisplay";
import { useAIUsage } from "@/hooks/useAIUsage";

interface FullScreenChatLayoutProps {
  children: ReactNode;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const FullScreenChatLayout = ({ 
  children, 
  isMinimized = false,
  onToggleMinimize 
}: FullScreenChatLayoutProps) => {
  const navigate = useNavigate();
  const { canUseAI, currentUsage, quotaLimit, planName } = useAIUsage();

  const handleBackToMain = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToMain}
              className="flex items-center gap-2 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">RT AI Chat</h1>
                <AIStatusIndicator key="fullscreen-status" size="sm" showLabel />
              </div>
            </div>
          </div>

          {/* Center section - Model and Usage */}
          <div className="flex items-center gap-4 flex-1 justify-center max-w-lg">
            <UserModelSelector compact />
            <div className="hidden md:block">
              <CompactUsageDisplay
                currentUsage={currentUsage}
                quotaLimit={quotaLimit}
                planName={planName}
                canUseAI={canUseAI}
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {onToggleMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMinimize}
                className="hover:bg-primary/10"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};