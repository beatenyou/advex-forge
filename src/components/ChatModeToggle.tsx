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
      return <PanelRight className="h-5 w-5" />;
    }
    return <Maximize2 className="h-5 w-5" />;
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
            className={`
              fixed ${getPositionClasses()} z-50 h-14 w-14 rounded-full shadow-lg
              bg-primary hover:bg-primary/90 text-primary-foreground
              hover:scale-110 transition-all duration-300 ease-out
              hover:shadow-glow border-2 border-primary/20
              ${isAnimating ? 'scale-95' : ''}
            `}
            size="sm"
          >
            <div className={`transition-transform duration-200 ${isAnimating ? 'rotate-180' : ''}`}>
              {getIcon()}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="mr-2">
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};