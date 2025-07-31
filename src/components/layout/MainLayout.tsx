import React, { ReactNode, useState, useEffect } from "react";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { useLocation } from "react-router-dom";
import { ChatSidebar } from "./ChatSidebar";
import AnnouncementBanner from "@/components/AnnouncementBanner";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const [isChatVisible, setIsChatVisible] = useState(false); // Start hidden
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Check for navigation state to show chat
  useEffect(() => {
    if (location.state?.showChat) {
      setIsChatVisible(true);
      // Clear the state to avoid it persisting on future navigations
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  // Dynamic sizing based on screen width
  const getChatPanelSize = () => {
    if (isWideScreen) {
      return { default: 30, min: 25, max: 45 }; // Smaller on very wide screens
    }
    return { default: 35, min: 25, max: 60 }; // Original size
  };

  const getMainPanelSize = () => {
    if (isWideScreen && isChatVisible) {
      return 70; // Larger main area on wide screens
    }
    return isChatVisible ? 65 : 100;
  };

  const chatPanelConfig = getChatPanelSize();

  return (
    <div className="min-h-screen w-full bg-background">
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
              <ChatSidebar onClose={handleCloseChat} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};