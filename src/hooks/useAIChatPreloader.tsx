// ============= AI Chat Preloader Hook =============

import { useEffect, useRef, useState } from 'react';
import { aiChatService } from '@/services/AIChatService';
import { useAuth } from '@/hooks/useAuth';

interface PreloadedConnection {
  isWarmed: boolean;
  lastWarmedAt: number;
  connectionId: string;
}

export const useAIChatPreloader = () => {
  const { user } = useAuth();
  const [preloadedConnection, setPreloadedConnection] = useState<PreloadedConnection | null>(null);
  const warmupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isWarmingRef = useRef(false);

  // Warm up the AI service connection
  const warmupConnection = async () => {
    if (isWarmingRef.current || !user) return;
    
    isWarmingRef.current = true;
    
    try {
      console.log('🔥 Warming up AI connection...');
      
      // Only warmup if no active chat initialization is happening
      if (aiChatService.getActiveRequestCount() > 0) {
        console.log('Skipping warmup - active chat requests in progress');
        isWarmingRef.current = false;
        return;
      }
      
      // Send a minimal request to warm up the connection
      const warmupPayload = {
        message: "ping", // Minimal message for warmup
        conversationHistory: [],
        selectedModelId: "gpt-4o-mini", // Use fastest model for warmup
        requestId: `warmup-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sessionId: `warmup-session-${Date.now()}` // Add required sessionId
      };

      // Fire and forget - we don't need the response
      aiChatService.sendMessage(warmupPayload).catch(error => {
        console.log('Warmup request completed (expected):', error.message);
      });

      const connectionId = `conn-${Date.now()}`;
      setPreloadedConnection({
        isWarmed: true,
        lastWarmedAt: Date.now(),
        connectionId
      });

      console.log('✅ AI connection warmed up');
    } catch (error) {
      console.log('Warmup process completed');
    } finally {
      isWarmingRef.current = false;
    }
  };

  // Start preloading when user is available
  useEffect(() => {
    if (!user) return;

    // Initial warmup
    const initialDelay = setTimeout(() => {
      warmupConnection();
    }, 1000); // Wait 1 second after page load

    // Periodic warmup every 2 minutes to keep connections warm
    warmupIntervalRef.current = setInterval(() => {
      warmupConnection();
    }, 120000); // 2 minutes

    return () => {
      clearTimeout(initialDelay);
      if (warmupIntervalRef.current) {
        clearInterval(warmupIntervalRef.current);
      }
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (warmupIntervalRef.current) {
        clearInterval(warmupIntervalRef.current);
      }
    };
  }, []);

  // Check if connection is still warm (within 5 minutes)
  const isConnectionWarm = () => {
    if (!preloadedConnection) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - preloadedConnection.lastWarmedAt) < fiveMinutes;
  };

  // Trigger warmup on demand
  const triggerWarmup = () => {
    if (!isWarmingRef.current) {
      warmupConnection();
    }
  };

  return {
    isConnectionWarm: isConnectionWarm(),
    preloadedConnection,
    triggerWarmup
  };
};
