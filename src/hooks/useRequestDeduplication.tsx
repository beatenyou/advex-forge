// ============= Request Deduplication Hook =============

import { useRef, useCallback } from 'react';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

export const useRequestDeduplication = () => {
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());

  const deduplicatedRequest = useCallback(async (
    key: string,
    requestFn: () => Promise<any>,
    ttl: number = 5000
  ): Promise<any> => {
    const now = Date.now();
    const existing = pendingRequests.current.get(key);

    if (existing && (now - existing.timestamp) < ttl) {
      return existing.promise;
    }

    const promise = requestFn();
    pendingRequests.current.set(key, { promise, timestamp: now });

    promise.finally(() => {
      pendingRequests.current.delete(key);
    });

    return promise;
  }, []);

  const clearPendingRequests = useCallback(() => {
    pendingRequests.current.clear();
  }, []);

  return {
    deduplicatedRequest,
    clearPendingRequests
  };
};