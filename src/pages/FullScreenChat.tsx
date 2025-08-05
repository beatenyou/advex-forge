import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FullScreenChatLayout } from "@/components/layouts/FullScreenChatLayout";
import { FullScreenChat as FullScreenChatInterface } from "@/components/chat/interfaces/FullScreenChat";
import { ChatModeToggle } from "@/components/ChatModeToggle";
import { useChatContext } from "@/contexts/ChatContext";

export default function FullScreenChat() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { restoreStateFromModeSwitch } = useChatContext();

  // Handle state restoration and URL synchronization
  useEffect(() => {
    console.log('🖼️ FullScreenChat: Component mounted', { 
      sessionId, 
      locationState: location.state 
    });
    
    if (location.state?.preserveChat) {
      const restored = restoreStateFromModeSwitch();
      if (restored) {
        console.log('✅ FullScreenChat: Chat state restored');
      }
    }
  }, [location.state, restoreStateFromModeSwitch]);

  // Update URL when session changes
  const handleSessionChange = (newSessionId: string) => {
    console.log('🖼️ FullScreenChat: Session changing', { from: sessionId, to: newSessionId });
    
    if (newSessionId !== sessionId) {
      navigate(`/chat/${newSessionId}`, { replace: true });
    }
  };

  const handleClearChat = async () => {
    if ((window as any).__clearChatFunction) {
      await (window as any).__clearChatFunction();
    }
  };

  return (
    <>
      <FullScreenChatLayout>
        <div className="h-full">
          <FullScreenChatInterface
            sessionId={sessionId}
            onSessionChange={handleSessionChange}
            onClear={handleClearChat}
          />
        </div>
      </FullScreenChatLayout>
      
      <ChatModeToggle isChatSidebarVisible={false} />
    </>
  );
}