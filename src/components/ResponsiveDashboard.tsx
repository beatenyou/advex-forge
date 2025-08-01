import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dashboard } from './Dashboard';

interface ResponsiveDashboardProps {
  onToggleChat?: () => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
  isChatVisible?: boolean;
  isWideScreen?: boolean;
}

export const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = (props) => {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
      {/* Mobile hamburger menu trigger - positioned at top */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50">
          {/* This will be rendered by MobileSidebar */}
        </div>
      )}
      
      <Dashboard
        {...props}
        onToggleChat={props.onToggleChat}
        onOpenChatWithPrompt={props.onOpenChatWithPrompt}
        isChatVisible={props.isChatVisible}
        isWideScreen={props.isWideScreen}
      />
    </div>
  );
};