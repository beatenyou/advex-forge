import React, { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIStatusIndicator } from "@/components/AIStatusIndicator";

interface FullScreenChatLayoutProps {
  children: ReactNode;
}

export const FullScreenChatLayout = ({ 
  children
}: FullScreenChatLayoutProps) => {
  const navigate = useNavigate();
  const [statusKey, setStatusKey] = useState(0);

  // Listen for model changes to force status indicator refresh
  useEffect(() => {
    const handleModelChange = () => {
      console.log('🔄 FullScreenChatLayout: Model changed, refreshing status indicator');
      setStatusKey(prev => prev + 1);
    };

    const handleForceRefresh = () => {
      console.log('🔥 FullScreenChatLayout: Force refresh triggered');
      setStatusKey(prev => prev + 1);
    };

    window.addEventListener('modelChanged', handleModelChange);
    window.addEventListener('forceStatusRefresh', handleForceRefresh);

    return () => {
      window.removeEventListener('modelChanged', handleModelChange);
      window.removeEventListener('forceStatusRefresh', handleForceRefresh);
    };
  }, []);

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
                <AIStatusIndicator key={`fullscreen-status-${statusKey}`} size="sm" showLabel />
              </div>
            </div>
          </div>

          {/* Center section - Empty space for balance */}
          <div className="flex-1"></div>

          {/* Right section */}
          <div className="flex items-center gap-2">
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