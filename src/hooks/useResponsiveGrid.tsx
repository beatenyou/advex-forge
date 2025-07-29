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
    
    console.log('Column calculation:', {
      containerWidth,
      cardWithGap,
      maxPossibleColumns,
      isChatVisible
    });
    
    // Define breakpoints based on chat visibility
    if (isChatVisible) {
      // More conservative when chat is open
      if (containerWidth < 700) return 1;
      if (containerWidth < 1100) return Math.min(2, maxPossibleColumns);
      if (containerWidth < 1600) return Math.min(3, maxPossibleColumns);
      return Math.min(3, maxPossibleColumns); // Max 3 when chat open
    } else {
      // More aggressive when chat is closed
      if (containerWidth < 700) return 1;
      if (containerWidth < 1100) return Math.min(2, maxPossibleColumns);
      if (containerWidth < 1500) return Math.min(3, maxPossibleColumns);
      if (containerWidth < 1900) return Math.min(4, maxPossibleColumns);
      if (containerWidth < 2400) return Math.min(5, maxPossibleColumns);
      return Math.min(6, maxPossibleColumns); // Max 6 for ultra-wide
    }
  }, [isChatVisible, minCardWidth, gap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      const containerWidth = container.offsetWidth;
      const newColumnCount = calculateColumns(containerWidth);
      console.log('Setting column count:', newColumnCount);
      setColumnCount(newColumnCount);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateColumns();
    });

    resizeObserver.observe(container);
    
    // Initial calculation with multiple attempts to ensure proper rendering
    updateColumns();
    setTimeout(updateColumns, 50);
    setTimeout(updateColumns, 200);

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
      transition: 'grid-template-columns 0.3s ease-out',
      width: '100%'
    }
  };
};