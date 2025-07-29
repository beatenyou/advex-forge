import React, { ReactNode, useState, useEffect } from "react";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { ChatSidebar } from "./ChatSidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Check screen width and adjust layout accordingly
  useEffect(() => {
    const checkScreenWidth = () => {
      const width = window.innerWidth;
      setIsWideScreen(width >= 1400); // Wide screen threshold
      
      // Auto-show chat on wide screens, but respect user preference on smaller screens
      if (width >= 1400) {
        setIsChatVisible(true);
      }
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  const handleCloseChat = () => {
    setIsChatVisible(false);
  };

  const handleOpenChat = () => {
    setIsChatVisible(true);
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
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        {isChatVisible && (
          <>
            <ResizablePanel 
              defaultSize={chatPanelConfig.default} 
              minSize={chatPanelConfig.min} 
              maxSize={chatPanelConfig.max}
              className="bg-background"
            >
              <ChatSidebar onClose={handleCloseChat} />
            </ResizablePanel>
            
            <ResizableHandle 
              withHandle 
              className="bg-border hover:bg-primary/20 transition-colors duration-200 w-1 group"
            />
          </>
        )}
        
        <ResizablePanel 
          defaultSize={getMainPanelSize()} 
          minSize={isWideScreen ? 55 : 40} // Larger minimum on wide screens
          className="bg-background"
        >
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {React.cloneElement(children as React.ReactElement, { 
              onOpenChat: handleOpenChat, 
              isChatVisible: isChatVisible,
              isWideScreen: isWideScreen 
            })}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};