// ============= Sidebar Chat Interface =============

import { ChatContainer } from '../ChatContainer';

interface SidebarChatProps {
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
  onClear?: () => void;
  isChatActive?: boolean;
}

export const SidebarChat = ({
  sessionId,
  initialPrompt,
  onSessionChange,
  onClear,
  isChatActive = false
}: SidebarChatProps) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ChatContainer
        sessionId={sessionId}
        initialPrompt={initialPrompt}
        onSessionChange={onSessionChange}
        onClear={onClear}
        showHeader={false} // Sidebar has its own header
        className="h-full"
        isChatActive={isChatActive}
      />
    </div>
  );
};