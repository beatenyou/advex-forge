import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { FullScreenChatLayout } from "@/components/layouts/FullScreenChatLayout";
import { ChatSession } from "@/components/ChatSession";
import { ChatModeToggle } from "@/components/ChatModeToggle";
import { useChatContext } from "@/contexts/ChatContext";

export default function FullScreenChat() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);
  const { restoreStateFromModeSwitch } = useChatContext();

  // Handle state restoration on navigation
  useEffect(() => {
    if (location.state?.preserveChat) {
      const restored = restoreStateFromModeSwitch();
      if (restored) {
        console.log('Chat state restored in full screen mode');
      }
    }
  }, [location.state, restoreStateFromModeSwitch]);

  const handleToggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  const handleClearChat = async () => {
    if ((window as any).__clearChatFunction) {
      await (window as any).__clearChatFunction();
    }
  };

  return (
    <>
      <FullScreenChatLayout 
        isMinimized={isMinimized}
        onToggleMinimize={handleToggleMinimize}
      >
        <div className={`h-full transition-all duration-300 ${
          isMinimized ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}>
          <ChatSession 
            onClear={handleClearChat} 
            sessionId={sessionId}
          />
        </div>
      </FullScreenChatLayout>
      
      <ChatModeToggle />
    </>
  );
}