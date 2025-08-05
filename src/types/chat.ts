// ============= Chat Type Definitions =============

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  session_id: string;
  tokens_used?: number;
  provider_name?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface AIRequestPayload {
  message: string;
  sessionId: string;
  selectedModelId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  conversationId?: string;
  requestId?: string;
  timestamp?: string;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  message?: string;
  error?: string;
  provider_used?: string;
  tokens_used?: number;
  request_id?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatContextType {
  state: ChatState;
  actions: {
    sendMessage: (message: string) => Promise<void>;
    loadSession: (sessionId: string) => Promise<void>;
    createNewSession: () => Promise<void>;
    clearSession: () => Promise<void>;
    copyMessage: (content: string, messageId: string) => Promise<void>;
  };
}

export interface ScrollState {
  isUserScrolledUp: boolean;
  shouldAutoScroll: boolean;
  showScrollToBottomButton: boolean;
}

export interface ChatConfig {
  autoCollapseThreshold: {
    length: number;
    lines: number;
    codeBlocks: number;
    listItems: number;
  };
  scrollBehavior: {
    autoScrollThreshold: number;
    nearBottomThreshold: number;
  };
}