import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Maximize2, Grid3X3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export const ChatModeToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);

  const isFullScreenChat = location.pathname.startsWith('/chat');

  const handleToggleMode = () => {
    setIsAnimating(true);
    
    setTimeout(() => {
      if (isFullScreenChat) {
        navigate('/');
      } else {
        navigate('/chat');
      }
      setIsAnimating(false);
    }, 200);
  };

  const getIcon = () => {
    if (isFullScreenChat) {
      return <Grid3X3 className="h-5 w-5" />;
    }
    return <Maximize2 className="h-5 w-5" />;
  };

  const getTooltipText = () => {
    if (isFullScreenChat) {
      return "Switch to Dashboard";
    }
    return "Enter Full-Screen Chat";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleToggleMode}
            className={`
              fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg
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