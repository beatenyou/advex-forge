import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from './useAnalytics';

interface ErrorContext {
  modelId?: string;
  sessionId?: string;
  requestId?: string;
  retryAttempt?: number;
  userMessage?: string;
}

interface ErrorInfo {
  type: string;
  message: string;
  userFriendlyMessage: string;
  actionable: boolean;
  suggestedActions?: string[];
  recoverable: boolean;
}

export const useAIChatErrorHandler = () => {
  const [lastError, setLastError] = useState<ErrorInfo | null>(null);
  const [errorHistory, setErrorHistory] = useState<ErrorInfo[]>([]);
  const { toast } = useToast();
  const { trackActivity } = useAnalytics();

  // Classify and handle different types of errors
  const classifyError = useCallback((error: any, context: ErrorContext = {}): ErrorInfo => {
    let errorInfo: ErrorInfo;

    // Network and connection errors
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      errorInfo = {
        type: 'network_error',
        message: error.message,
        userFriendlyMessage: 'Connection issue detected. Please check your internet connection.',
        actionable: true,
        suggestedActions: ['Check your internet connection', 'Try again in a moment', 'Switch to a different network if available'],
        recoverable: true
      };
    }
    // Authentication errors
    else if (error.message?.includes('auth') || error.message?.includes('unauthorized') || error.status === 401) {
      errorInfo = {
        type: 'auth_error',
        message: error.message,
        userFriendlyMessage: 'Authentication issue. Please log in again.',
        actionable: true,
        suggestedActions: ['Log out and log back in', 'Refresh the page', 'Clear browser cache'],
        recoverable: true
      };
    }
    // Model quota/limit errors
    else if (error.message?.includes('quota') || error.message?.includes('limit') || error.message?.includes('usage')) {
      errorInfo = {
        type: 'quota_error',
        message: error.message,
        userFriendlyMessage: 'AI usage limit reached. Please upgrade your plan or wait for the limit to reset.',
        actionable: true,
        suggestedActions: ['Upgrade your plan', 'Wait for the daily/monthly reset', 'Contact support for assistance'],
        recoverable: false
      };
    }
    // Model unavailable errors
    else if (error.message?.includes('model') || error.message?.includes('provider')) {
      errorInfo = {
        type: 'model_error',
        message: error.message,
        userFriendlyMessage: 'The selected AI model is temporarily unavailable.',
        actionable: true,
        suggestedActions: ['Try selecting a different AI model', 'Wait a moment and try again', 'Contact support if the issue persists'],
        recoverable: true
      };
    }
    // Timeout errors
    else if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
      errorInfo = {
        type: 'timeout_error',
        message: error.message,
        userFriendlyMessage: 'Request timed out. The AI service may be experiencing high demand.',
        actionable: true,
        suggestedActions: ['Try again with a shorter message', 'Wait a moment before retrying', 'Check your internet connection'],
        recoverable: true
      };
    }
    // Rate limiting errors
    else if (error.message?.includes('rate') || error.status === 429) {
      errorInfo = {
        type: 'rate_limit_error',
        message: error.message,
        userFriendlyMessage: 'Too many requests. Please wait a moment before trying again.',
        actionable: true,
        suggestedActions: ['Wait 30 seconds before retrying', 'Slow down your message frequency', 'Try again later'],
        recoverable: true
      };
    }
    // Server errors
    else if (error.status >= 500 || error.message?.includes('server') || error.message?.includes('internal')) {
      errorInfo = {
        type: 'server_error',
        message: error.message,
        userFriendlyMessage: 'Server error. Our team has been notified and is working to fix this.',
        actionable: true,
        suggestedActions: ['Try again in a few minutes', 'Contact support if the issue persists', 'Check our status page for updates'],
        recoverable: true
      };
    }
    // Unknown errors
    else {
      errorInfo = {
        type: 'unknown_error',
        message: error.message || 'Unknown error occurred',
        userFriendlyMessage: 'An unexpected error occurred. Please try again.',
        actionable: true,
        suggestedActions: ['Try again', 'Refresh the page', 'Contact support with details of what you were doing'],
        recoverable: true
      };
    }

    // Track the error
    trackActivity('ai_chat_error_classified', JSON.stringify({
      errorType: errorInfo.type,
      context,
      timestamp: new Date().toISOString()
    }));

    return errorInfo;
  }, [trackActivity]);

  // Handle error with user-friendly messaging
  const handleError = useCallback((error: any, context: ErrorContext = {}, showToast: boolean = true) => {
    const errorInfo = classifyError(error, context);
    
    setLastError(errorInfo);
    setErrorHistory(prev => [...prev.slice(-9), errorInfo]); // Keep last 10 errors

    if (showToast) {
      toast({
        title: "AI Chat Error",
        description: errorInfo.userFriendlyMessage,
        variant: "destructive",
      });
    }

    console.error('🚨 AI Chat Error:', {
      type: errorInfo.type,
      message: errorInfo.message,
      context,
      suggestedActions: errorInfo.suggestedActions
    });

    return errorInfo;
  }, [classifyError, toast]);

  // Get suggested recovery actions
  const getRecoveryActions = useCallback((errorType?: string) => {
    const targetError = errorType 
      ? errorHistory.find(e => e.type === errorType) || lastError
      : lastError;

    if (!targetError) return [];

    return targetError.suggestedActions || [];
  }, [errorHistory, lastError]);

  // Check if error is recoverable
  const isRecoverable = useCallback((errorType?: string) => {
    const targetError = errorType 
      ? errorHistory.find(e => e.type === errorType) || lastError
      : lastError;

    return targetError?.recoverable ?? true;
  }, [errorHistory, lastError]);

  // Get error patterns
  const getErrorPatterns = useCallback(() => {
    const errorCounts = errorHistory.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalErrors = errorHistory.length;
    const patterns = Object.entries(errorCounts).map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalErrors) * 100
    }));

    return patterns.sort((a, b) => b.count - a.count);
  }, [errorHistory]);

  // Clear error history
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
    setLastError(null);
    trackActivity('ai_chat_error_history_cleared', 'Error history cleared by user');
  }, [trackActivity]);

  // Auto-recovery logic
  const attemptAutoRecovery = useCallback(async (
    originalFunction: () => Promise<any>,
    maxAttempts: number = 3,
    delay: number = 1000
  ) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await originalFunction();
        
        if (attempt > 1) {
          toast({
            title: "Recovered",
            description: `Successfully recovered after ${attempt} attempts.`,
            variant: "default",
          });
          
          trackActivity('ai_chat_auto_recovery_success', `Recovered after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        const errorInfo = classifyError(error);
        
        if (!errorInfo.recoverable || attempt === maxAttempts) {
          handleError(error, { retryAttempt: attempt }, true);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        
        trackActivity('ai_chat_auto_recovery_attempt', `Attempt ${attempt} failed, retrying`);
      }
    }
  }, [classifyError, handleError, toast, trackActivity]);

  return {
    lastError,
    errorHistory,
    handleError,
    classifyError,
    getRecoveryActions,
    isRecoverable,
    getErrorPatterns,
    clearErrorHistory,
    attemptAutoRecovery
  };
};