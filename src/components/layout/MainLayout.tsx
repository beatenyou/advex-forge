import React, { ReactNode, useState } from "react";
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

  const handleCloseChat = () => {
    setIsChatVisible(false);
  };

  const handleOpenChat = () => {
    setIsChatVisible(true);
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        {isChatVisible && (
          <>
            <ResizablePanel 
              defaultSize={35} 
              minSize={25} 
              maxSize={60}
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
          defaultSize={isChatVisible ? 65 : 100} 
          minSize={40}
          className="bg-background"
        >
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {React.cloneElement(children as React.ReactElement, { 
              onOpenChat: handleOpenChat, 
              isChatVisible: isChatVisible 
            })}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};