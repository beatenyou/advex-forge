import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Maximize2, PanelRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useChatContext } from "@/contexts/ChatContext";

interface ChatModeToggleProps {
  isChatSidebarVisible?: boolean;
}

export const ChatModeToggle = ({ isChatSidebarVisible = false }: ChatModeToggleProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const { preserveStateForModeSwitch, currentSession } = useChatContext();

  const isFullScreenChat = location.pathname.startsWith('/chat');

  const handleToggleMode = () => {
    setIsAnimating(true);
    
    // Preserve chat state before switching modes
    preserveStateForModeSwitch();
    
    setTimeout(() => {
      if (isFullScreenChat) {
        // Navigate to split-screen mode (dashboard with chat visible)
        navigate('/', { state: { showChat: true, preserveChat: true } });
      } else {
        // Navigate to fullscreen with current session if available
        const targetPath = currentSession ? `/chat/${currentSession.id}` : '/chat';
        navigate(targetPath, { state: { preserveChat: true } });
      }
      setIsAnimating(false);
    }, 200);
  };

  const getIcon = () => {
    if (isFullScreenChat) {
      return <PanelRight className="w-3.5 h-3.5" />;
    }
    return <Maximize2 className="w-3.5 h-3.5" />;
  };

  const getTooltipText = () => {
    if (isFullScreenChat) {
      return "Switch to Split Screen";
    }
    return "Enter Full-Screen Chat";
  };

  const getPositionClasses = () => {
    // In full-screen chat mode, position on the right
    if (isFullScreenChat) {
      return "top-6 right-6";
    }
    // In split-screen mode with chat sidebar visible, position on the left
    if (isChatSidebarVisible) {
      return "top-6 left-6";
    }
    // Default position when no chat sidebar
    return "top-6 right-6";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleToggleMode}
            variant="ghost"
            className={`
              fixed ${getPositionClasses()} z-50 h-7 w-7 rounded-md p-0
              hover:bg-muted/50 transition-colors duration-200
              ${isAnimating ? 'opacity-70' : ''}
            `}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="mr-2">
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};