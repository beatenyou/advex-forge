import { useState, useEffect, useRef, useCallback } from 'react';

interface UseResponsiveGridOptions {
  isChatVisible: boolean;
  minCardWidth?: number;
  gap?: number;
}

export const useResponsiveGrid = ({ 
  isChatVisible, 
  minCardWidth = 320, 
  gap = 32 
}: UseResponsiveGridOptions) => {
  const [columnCount, setColumnCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 1;
    
    // Calculate how many columns can fit
    const availableWidth = containerWidth - gap;
    const columnWidth = minCardWidth + gap;
    const maxColumns = Math.floor(availableWidth / columnWidth) || 1;
    
    // Define breakpoints based on chat visibility
    if (isChatVisible) {
      // More conservative when chat is open
      if (containerWidth < 768) return 1;      // Mobile
      if (containerWidth < 1200) return 2;     // Tablet
      if (containerWidth < 1600) return 2;     // Desktop
      return Math.min(3, maxColumns);          // Large desktop (max 3)
    } else {
      // More aggressive when chat is closed
      if (containerWidth < 640) return 1;      // Mobile
      if (containerWidth < 1024) return 2;     // Tablet
      if (containerWidth < 1400) return 3;     // Desktop
      if (containerWidth < 1800) return 4;     // Wide
      return Math.min(5, maxColumns);          // Ultra-wide (max 5)
    }
  }, [isChatVisible, minCardWidth, gap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const newColumnCount = calculateColumns(containerWidth);
        setColumnCount(newColumnCount);
      }
    });

    resizeObserver.observe(container);

    // Initial calculation
    const initialWidth = container.offsetWidth;
    setColumnCount(calculateColumns(initialWidth));

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateColumns]);

  return {
    containerRef,
    columnCount,
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      gap: `${gap}px`,
      transition: 'grid-template-columns 0.3s ease-out'
    }
  };
};