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
    
    // Calculate how many columns can fit based on card width + gap
    const cardWithGap = minCardWidth + gap;
    const maxPossibleColumns = Math.floor(containerWidth / cardWithGap) || 1;
    
    // Define breakpoints based on chat visibility
    if (isChatVisible) {
      // More conservative when chat is open (2 columns max usually)
      if (containerWidth < 700) return 1;      // Mobile/small tablet
      if (containerWidth < 1100) return Math.min(2, maxPossibleColumns);     // Tablet/small desktop
      return Math.min(2, maxPossibleColumns);  // Large desktop (usually 2 columns when chat open)
    } else {
      // More aggressive when chat is closed (can go up to 5 columns)
      if (containerWidth < 700) return 1;      // Mobile
      if (containerWidth < 1100) return Math.min(2, maxPossibleColumns);     // Tablet
      if (containerWidth < 1500) return Math.min(3, maxPossibleColumns);     // Desktop
      if (containerWidth < 1900) return Math.min(4, maxPossibleColumns);     // Wide
      return Math.min(5, maxPossibleColumns);  // Ultra-wide
    }
  }, [isChatVisible, minCardWidth, gap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      const containerWidth = container.offsetWidth;
      const newColumnCount = calculateColumns(containerWidth);
      setColumnCount(newColumnCount);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateColumns();
    });

    resizeObserver.observe(container);
    
    // Initial calculation with a small delay to ensure proper rendering
    setTimeout(updateColumns, 0);

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