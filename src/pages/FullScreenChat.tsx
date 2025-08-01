import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { FullScreenChatLayout } from "@/components/layouts/FullScreenChatLayout";
import { ChatSession } from "@/components/ChatSession";
import { ChatModeToggle } from "@/components/ChatModeToggle";
import { useChatContext } from "@/contexts/ChatContext";

export default function FullScreenChat() {
  const { sessionId } = useParams();
  const location = useLocation();
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

  const handleClearChat = async () => {
    if ((window as any).__clearChatFunction) {
      await (window as any).__clearChatFunction();
    }
  };

  return (
    <>
      <FullScreenChatLayout>
        <div className="h-full">
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