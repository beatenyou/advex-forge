// ============= Sidebar Chat Interface =============

import { ChatContainer } from '../ChatContainer';

interface SidebarChatProps {
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
  onClear?: () => void;
}

export const SidebarChat = ({
  sessionId,
  initialPrompt,
  onSessionChange,
  onClear
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
      />
    </div>
  );
};