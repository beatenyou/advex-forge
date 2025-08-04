import { useState, useCallback, useRef } from 'react';
import { useAnalytics } from './useAnalytics';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';

interface RequestMetrics {
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  modelId: string;
  modelName?: string;
  tokensUsed?: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  retryAttempts: number;
  networkLatency?: number;
  responseSize?: number;
}

interface ChatDebugInfo {
  sessionId: string;
  messageCount: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  successRate: number;
  recentErrors: string[];
  memoryUsage?: number;
}

export const useAIChatDebugger = () => {
  const [debugMode, setDebugMode] = useState(false);
  const [requestHistory, setRequestHistory] = useState<RequestMetrics[]>([]);
  const [sessionDebugInfo, setSessionDebugInfo] = useState<ChatDebugInfo | null>(null);
  const { trackActivity, trackPerformance } = useAnalytics();
  const { trackCustomMetric } = usePerformanceMonitoring();
  
  const requestStartTimes = useRef<Map<string, number>>(new Map());

  // Start tracking a request
  const startRequestTracking = useCallback((requestId: string, modelId: string, modelName?: string) => {
    const startTime = performance.now();
    requestStartTimes.current.set(requestId, startTime);
    
    if (debugMode) {
      console.log(`🔍 [Debug] Starting request tracking:`, {
        requestId,
        modelId,
        modelName,
        timestamp: new Date().toISOString()
      });
    }
    
    // Track request start
    trackActivity('ai_request_started', `Model: ${modelName || modelId}`);
    
    return startTime;
  }, [debugMode, trackActivity]);

  // End tracking a request
  const endRequestTracking = useCallback((
    requestId: string,
    modelId: string,
    success: boolean,
    tokensUsed?: number,
    errorType?: string,
    errorMessage?: string,
    retryAttempts: number = 0
  ) => {
    const startTime = requestStartTimes.current.get(requestId);
    const endTime = performance.now();
    const duration = startTime ? endTime - startTime : 0;
    
    const metrics: RequestMetrics = {
      requestId,
      startTime: startTime || endTime,
      endTime,
      duration,
      modelId,
      tokensUsed,
      success,
      errorType,
      errorMessage,
      retryAttempts
    };

    // Update request history
    setRequestHistory(prev => [...prev.slice(-49), metrics]); // Keep last 50 requests
    
    // Track performance metrics
    trackCustomMetric(`ai_request_duration_${success ? 'success' : 'error'}`, duration);
    trackPerformance('ai_response_time', duration, 'milliseconds', 'ai-chat');
    
    if (tokensUsed) {
      trackPerformance('ai_tokens_used', tokensUsed, 'tokens', 'ai-chat');
    }
    
    if (retryAttempts > 0) {
      trackPerformance('ai_retry_attempts', retryAttempts, 'count', 'ai-chat');
    }

    if (debugMode) {
      console.log(`🔍 [Debug] Request completed:`, {
        requestId,
        duration: `${duration.toFixed(2)}ms`,
        success,
        tokensUsed,
        retryAttempts,
        errorType,
        timestamp: new Date().toISOString()
      });
    }

    // Track activity
    trackActivity(
      success ? 'ai_request_success' : 'ai_request_error',
      `Duration: ${duration.toFixed(2)}ms, Tokens: ${tokensUsed || 0}, Retries: ${retryAttempts}`
    );

    requestStartTimes.current.delete(requestId);
    return metrics;
  }, [debugMode, trackCustomMetric, trackPerformance, trackActivity]);

  // Log detailed error information
  const logError = useCallback((
    errorType: string,
    errorMessage: string,
    context: Record<string, any> = {}
  ) => {
    const errorInfo = {
      type: errorType,
      message: errorMessage,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    if (debugMode) {
      console.error(`🔍 [Debug] AI Chat Error:`, errorInfo);
    }

    trackActivity('ai_chat_error', JSON.stringify(errorInfo));
    return errorInfo;
  }, [debugMode, trackActivity]);

  // Log state transitions
  const logStateTransition = useCallback((
    from: string,
    to: string,
    context: Record<string, any> = {}
  ) => {
    if (debugMode) {
      console.log(`🔍 [Debug] State transition: ${from} → ${to}`, context);
    }
    
    trackActivity('ai_chat_state_transition', `${from} → ${to}: ${JSON.stringify(context)}`);
  }, [debugMode, trackActivity]);

  // Update session debug info
  const updateSessionDebugInfo = useCallback((
    sessionId: string,
    messageCount: number,
    totalTokensUsed: number
  ) => {
    const recentRequests = requestHistory.slice(-10);
    const successfulRequests = recentRequests.filter(r => r.success);
    const averageResponseTime = successfulRequests.length > 0
      ? successfulRequests.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulRequests.length
      : 0;
    
    const successRate = recentRequests.length > 0
      ? (successfulRequests.length / recentRequests.length) * 100
      : 100;

    const recentErrors = recentRequests
      .filter(r => !r.success && r.errorMessage)
      .map(r => r.errorMessage!)
      .slice(-5);

    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    const debugInfo: ChatDebugInfo = {
      sessionId,
      messageCount,
      totalTokensUsed,
      averageResponseTime,
      successRate,
      recentErrors,
      memoryUsage
    };

    setSessionDebugInfo(debugInfo);
    
    if (debugMode) {
      console.log(`🔍 [Debug] Session info updated:`, debugInfo);
    }

    return debugInfo;
  }, [requestHistory, debugMode]);

  // Get performance analytics
  const getPerformanceAnalytics = useCallback(() => {
    if (requestHistory.length === 0) return null;

    const last24h = requestHistory.filter(r => 
      r.startTime > Date.now() - 24 * 60 * 60 * 1000
    );

    const successfulRequests = last24h.filter(r => r.success);
    const failedRequests = last24h.filter(r => !r.success);

    const analytics = {
      totalRequests: last24h.length,
      successRate: last24h.length > 0 ? (successfulRequests.length / last24h.length) * 100 : 0,
      averageResponseTime: successfulRequests.length > 0
        ? successfulRequests.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulRequests.length
        : 0,
      totalTokensUsed: last24h.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      totalRetryAttempts: last24h.reduce((sum, r) => sum + r.retryAttempts, 0),
      commonErrors: failedRequests.reduce((acc, r) => {
        if (r.errorType) {
          acc[r.errorType] = (acc[r.errorType] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      modelUsage: last24h.reduce((acc, r) => {
        acc[r.modelId] = (acc[r.modelId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return analytics;
  }, [requestHistory]);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    
    if (newMode) {
      console.log('🔍 [Debug] AI Chat Debug Mode ENABLED');
      trackActivity('debug_mode_enabled', 'AI Chat debugging activated');
    } else {
      console.log('🔍 [Debug] AI Chat Debug Mode DISABLED');
      trackActivity('debug_mode_disabled', 'AI Chat debugging deactivated');
    }
  }, [debugMode, trackActivity]);

  // Clear debug history
  const clearDebugHistory = useCallback(() => {
    setRequestHistory([]);
    setSessionDebugInfo(null);
    requestStartTimes.current.clear();
    
    if (debugMode) {
      console.log('🔍 [Debug] Debug history cleared');
    }
    
    trackActivity('debug_history_cleared', 'AI Chat debug data cleared');
  }, [debugMode, trackActivity]);

  return {
    debugMode,
    requestHistory,
    sessionDebugInfo,
    startRequestTracking,
    endRequestTracking,
    logError,
    logStateTransition,
    updateSessionDebugInfo,
    getPerformanceAnalytics,
    toggleDebugMode,
    clearDebugHistory
  };
};