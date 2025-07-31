import { useEffect } from 'react';

interface UseHistoryShortcutsProps {
  onOpenHistory?: () => void;
  onNewChat?: () => void;
}

export const useHistoryShortcuts = ({ onOpenHistory, onNewChat }: UseHistoryShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+H or Cmd+H to open history
      if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        onOpenHistory?.();
      }
      
      // Ctrl+N or Cmd+N to start new chat
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        onNewChat?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenHistory, onNewChat]);
};