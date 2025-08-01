import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  provider_name?: string;
  tokens_used?: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface StreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  abortController: AbortController | null;
  currentProvider: string;
}

interface ChatContextType {
  // Session data
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  currentSession: ChatSession | null;
  setCurrentSession: (session: ChatSession | null) => void;
  
  // Streaming state
  streamingState: StreamingState;
  setStreamingState: (state: Partial<StreamingState>) => void;
  
  // Input state
  currentQuestion: string;
  setCurrentQuestion: (question: string) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
  
  // Methods
  resetChat: () => void;
  preserveStateForModeSwitch: () => void;
  restoreStateFromModeSwitch: () => boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [streamingState, setStreamingStateInternal] = useState<StreamingState>({
    isStreaming: false,
    streamingMessage: '',
    abortController: null,
    currentProvider: ''
  });

  // Temporary storage for mode switches
  const preservedStateRef = useRef<{
    messages: ChatMessage[];
    session: ChatSession | null;
    streaming: StreamingState;
    question: string;
    timestamp: number;
  } | null>(null);

  const setStreamingState = (newState: Partial<StreamingState>) => {
    setStreamingStateInternal(prev => ({ ...prev, ...newState }));
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentSession(null);
    setCurrentQuestion('');
    setIsLoading(false);
    setIsSending(false);
    setStreamingState({
      isStreaming: false,
      streamingMessage: '',
      abortController: null,
      currentProvider: ''
    });
    preservedStateRef.current = null;
  };

  const preserveStateForModeSwitch = () => {
    preservedStateRef.current = {
      messages: [...messages],
      session: currentSession,
      streaming: { ...streamingState },
      question: currentQuestion,
      timestamp: Date.now()
    };
    
    // Also store in sessionStorage as backup
    try {
      sessionStorage.setItem('chat_preserved_state', JSON.stringify({
        messages,
        session: currentSession,
        streaming: {
          ...streamingState,
          abortController: null // Can't serialize AbortController
        },
        question: currentQuestion,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to store chat state in sessionStorage:', error);
    }
  };

  const restoreStateFromModeSwitch = (): boolean => {
    // Try to restore from ref first
    if (preservedStateRef.current) {
      const state = preservedStateRef.current;
      // Only restore if it's recent (within 30 seconds)
      if (Date.now() - state.timestamp < 30000) {
        setMessages(state.messages);
        setCurrentSession(state.session);
        setCurrentQuestion(state.question);
        setStreamingState({
          ...state.streaming,
          // Don't restore abortController - create new one if needed
          abortController: state.streaming.isStreaming ? new AbortController() : null
        });
        preservedStateRef.current = null;
        return true;
      }
    }

    // Try to restore from sessionStorage as fallback
    try {
      const stored = sessionStorage.getItem('chat_preserved_state');
      if (stored) {
        const state = JSON.parse(stored);
        if (Date.now() - state.timestamp < 30000) {
          setMessages(state.messages);
          setCurrentSession(state.session);
          setCurrentQuestion(state.question);
          setStreamingState({
            ...state.streaming,
            abortController: state.streaming.isStreaming ? new AbortController() : null
          });
          sessionStorage.removeItem('chat_preserved_state');
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to restore chat state from sessionStorage:', error);
    }

    return false;
  };

  const value: ChatContextType = {
    messages,
    setMessages,
    currentSession,
    setCurrentSession,
    streamingState,
    setStreamingState,
    currentQuestion,
    setCurrentQuestion,
    isLoading,
    setIsLoading,
    isSending,
    setIsSending,
    resetChat,
    preserveStateForModeSwitch,
    restoreStateFromModeSwitch
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};