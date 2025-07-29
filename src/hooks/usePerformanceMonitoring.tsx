import { useEffect } from 'react';
import { useAnalytics } from './useAnalytics';

export function usePerformanceMonitoring() {
  const { trackPerformance } = useAnalytics();

  useEffect(() => {
    // Track page load performance
    const trackPageLoadMetrics = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // Page load time
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          trackPerformance('page_load_time', pageLoadTime, 'milliseconds', 'frontend');
          
          // DOM content loaded time
          const domLoadTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          trackPerformance('dom_load_time', domLoadTime, 'milliseconds', 'frontend');
          
          // First paint time
          const firstPaint = performance.getEntriesByName('first-paint')[0];
          if (firstPaint) {
            trackPerformance('first_paint', firstPaint.startTime, 'milliseconds', 'frontend');
          }
          
          // First contentful paint
          const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];
          if (firstContentfulPaint) {
            trackPerformance('first_contentful_paint', firstContentfulPaint.startTime, 'milliseconds', 'frontend');
          }
        }
      }
    };

    // Track performance metrics after page is fully loaded
    if (document.readyState === 'complete') {
      setTimeout(trackPageLoadMetrics, 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(trackPageLoadMetrics, 100);
      });
    }

    // Track memory usage (if available)
    const trackMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        trackPerformance('memory_used', memory.usedJSHeapSize, 'bytes', 'frontend');
        trackPerformance('memory_total', memory.totalJSHeapSize, 'bytes', 'frontend');
      }
    };

    // Track memory usage every 30 seconds
    const memoryInterval = setInterval(trackMemoryUsage, 30000);

    return () => {
      clearInterval(memoryInterval);
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