import React, { ReactNode, useState, useEffect } from "react";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { useLocation } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useChatContext } from '@/contexts/ChatContext';
import { ChatModeToggle } from "@/components/ChatModeToggle";
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const { restoreStateFromModeSwitch } = useChatContext();
  const [isChatVisible, setIsChatVisible] = useState(false); // Start hidden
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | undefined>();
  const isMobile = useIsMobile();

  // Check for navigation state to show chat and restore state
  useEffect(() => {
    if (location.state?.showChat) {
      setIsChatVisible(true);
      
      // If this is a mode switch, restore the chat state
      if (location.state?.preserveChat) {
        const restored = restoreStateFromModeSwitch();
        if (restored) {
          console.log('Chat state restored in split screen mode');
        }
      }
      
      // Clear the state to avoid it persisting on future navigations
      window.history.replaceState({}, document.title);
    }
  }, [location.state, restoreStateFromModeSwitch]);

  // Check screen width but don't auto-show chat
  useEffect(() => {
    const checkScreenWidth = () => {
      const width = window.innerWidth;
      setIsWideScreen(width >= 1400); // Wide screen threshold
      // Remove auto-show chat logic - let user control visibility
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  const handleCloseChat = () => {
    setIsChatVisible(false);
  };

  const handleToggleChat = () => {
    setIsChatVisible(prev => !prev);
  };

  const handleOpenChatWithPrompt = (prompt: string) => {
    setInitialChatPrompt(prompt);
    setIsChatVisible(true);
    // Clear the prompt after a short delay to allow the ChatSession to pick it up
    setTimeout(() => setInitialChatPrompt(undefined), 1000);
  };

  // Dynamic sizing based on screen width
  const getChatPanelSize = () => {
    if (isMobile) {
      return { default: 95, min: 90, max: 100 }; // Almost full screen on mobile
    }
    if (isWideScreen) {
      return { default: 30, min: 25, max: 45 }; // Smaller on very wide screens
    }
    return { default: 35, min: 25, max: 60 }; // Original size
  };

  const getMainPanelSize = () => {
    if (isMobile && isChatVisible) {
      return 5; // Minimal space on mobile when chat is open
    }
    if (isWideScreen && isChatVisible) {
      return 70; // Larger main area on wide screens
    }
    return isChatVisible ? 65 : 100;
  };

  const chatPanelConfig = getChatPanelSize();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Chat Mode Toggle - positioned dynamically based on layout */}
      <ChatModeToggle isChatSidebarVisible={isChatVisible} />
      
      {isMobile ? (
        // Mobile: Full screen layout with overlay chat
        <div className="min-h-screen h-screen bg-background relative">
          <div className="flex-shrink-0">
            <AnnouncementBanner />
          </div>
          <div className="flex-1 min-h-0">
            {React.cloneElement(children as React.ReactElement, { 
              onToggleChat: handleToggleChat, 
              onOpenChatWithPrompt: handleOpenChatWithPrompt,
              isChatVisible: isChatVisible,
              isWideScreen: isWideScreen 
            })}
          </div>
          
          {/* Mobile Chat Overlay */}
          {isChatVisible && (
            <div className="fixed inset-0 z-50 bg-background">
              <ChatSidebar onClose={handleCloseChat} initialPrompt={initialChatPrompt} />
            </div>
          )}
        </div>
      ) : (
        // Desktop/Tablet: Resizable panels
        <ResizablePanelGroup direction="horizontal" className="min-h-screen h-screen">
          <ResizablePanel 
            defaultSize={getMainPanelSize()} 
            minSize={isWideScreen ? 55 : 40} // Larger minimum on wide screens
            className="bg-background"
          >
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <div className="flex-shrink-0">
                <AnnouncementBanner />
              </div>
              <div className="flex-1 min-h-0">
                {React.cloneElement(children as React.ReactElement, { 
                  onToggleChat: handleToggleChat, 
                  onOpenChatWithPrompt: handleOpenChatWithPrompt,
                  isChatVisible: isChatVisible,
                  isWideScreen: isWideScreen 
                })}
              </div>
            </div>
          </ResizablePanel>
          
          {isChatVisible && (
            <>
              <ResizableHandle 
                withHandle 
                className="bg-border hover:bg-primary/20 transition-colors duration-200 w-1 group"
              />
              
              <ResizablePanel 
                defaultSize={chatPanelConfig.default} 
                minSize={chatPanelConfig.min} 
                maxSize={chatPanelConfig.max}
                className="bg-background h-full overflow-hidden"
                style={{ contain: 'layout', isolation: 'isolate' }}
              >
                <ChatSidebar onClose={handleCloseChat} initialPrompt={initialChatPrompt} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}
    </div>
  );
};