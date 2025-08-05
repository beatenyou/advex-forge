// ============= Full Screen Chat Interface =============

import { ChatContainer } from '../ChatContainer';

interface FullScreenChatProps {
  sessionId?: string;
  initialPrompt?: string;
  onSessionChange?: (sessionId: string) => void;
  onClear?: () => void;
}

export const FullScreenChat = ({
  sessionId,
  initialPrompt,
  onSessionChange,
  onClear
}: FullScreenChatProps) => {
  return (
    <div className="h-full w-full max-w-4xl mx-auto">
      <ChatContainer
        sessionId={sessionId}
        initialPrompt={initialPrompt}
        onSessionChange={onSessionChange}
        onClear={onClear}
        showHeader={true}
        className="h-full"
      />
    </div>
  );
};