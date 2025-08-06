import { useEffect } from 'react';
import { useAnalytics } from './useAnalytics';

export function usePerformanceMonitoring() {
  const { trackPerformance } = useAnalytics();

  useEffect(() => {
    let hasTracked = false;
    
    // Track page load performance (only once)
    const trackPageLoadMetrics = () => {
      if (hasTracked || !('performance' in window)) return;
      
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        hasTracked = true;
        
        // Batch all metrics into a single call
        const metrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          domLoadTime: navigation.domContentLoadedEventEnd - navigation.fetchStart
        };
        
        // Only track if metrics are reasonable (not 0 or negative)
        if (metrics.pageLoadTime > 0 && metrics.pageLoadTime < 60000) {
          trackPerformance('page_load_time', metrics.pageLoadTime, 'milliseconds', 'frontend');
        }
        
        if (metrics.domLoadTime > 0 && metrics.domLoadTime < 60000) {
          trackPerformance('dom_load_time', metrics.domLoadTime, 'milliseconds', 'frontend');
        }
      }
    };

    // Track performance metrics after page is fully loaded (with delay to prevent duplicates)
    if (document.readyState === 'complete') {
      setTimeout(trackPageLoadMetrics, 500);
    } else {
      window.addEventListener('load', () => {
        setTimeout(trackPageLoadMetrics, 500);
      });
    }

    // Disable memory tracking to reduce overhead
    // const trackMemoryUsage = () => {
    //   if ('memory' in performance) {
    //     const memory = (performance as any).memory;
    //     trackPerformance('memory_used', memory.usedJSHeapSize, 'bytes', 'frontend');
    //     trackPerformance('memory_total', memory.totalJSHeapSize, 'bytes', 'frontend');
    //   }
    // };

    // // Track memory usage every 30 seconds
    // const memoryInterval = setInterval(trackMemoryUsage, 30000);

    return () => {
      // clearInterval(memoryInterval);
    };
  }, [trackPerformance]);

  // Function to track custom performance metrics
  const trackCustomMetric = (name: string, startTime: number, endTime?: number) => {
    const end = endTime || performance.now();
    const duration = end - startTime;
    trackPerformance(name, duration, 'milliseconds', 'frontend');
  };

  return {
    trackCustomMetric,
  };
}