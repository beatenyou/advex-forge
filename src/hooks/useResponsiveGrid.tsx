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
  const [columnCount, setColumnCount] = useState(2);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 2;
    
    // Simple, efficient calculation based purely on available space
    const effectiveCardWidth = minCardWidth + gap;
    const maxPossibleColumns = Math.floor(containerWidth / effectiveCardWidth);
    
    let columns;
    
    // Simplified responsive breakpoints
    if (containerWidth < 640) {
      columns = 1; // Mobile: 1 column
    } else if (containerWidth < 968) {
      columns = Math.min(3, maxPossibleColumns); // Small tablet: max 3 columns
    } else {
      // Desktop: Use available space efficiently, cap at 8 columns
      columns = Math.min(8, Math.max(3, maxPossibleColumns));
    }
    
    console.log('🔄 Grid calculation:', {
      containerWidth,
      effectiveCardWidth,
      maxPossibleColumns,
      finalColumns: columns
    });
    
    return columns;
  }, [minCardWidth, gap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      // Get the most accurate container width
      const containerWidth = container.getBoundingClientRect().width || container.offsetWidth;
      
      if (containerWidth > 0) {
        const newColumnCount = calculateColumns(containerWidth);
        
        console.log('📏 Container measurements:', {
          getBoundingClientRect: container.getBoundingClientRect().width,
          offsetWidth: container.offsetWidth,
          finalWidth: containerWidth,
          calculatedColumns: newColumnCount
        });
        
        setColumnCount(newColumnCount);
        setIsInitialized(true);
      } else {
        // Retry after DOM updates
        requestAnimationFrame(updateColumns);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateColumns);
    });

    resizeObserver.observe(container);
    
    // Initial calculation
    updateColumns();
    requestAnimationFrame(updateColumns);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateColumns]);

  return {
    containerRef,
    columnCount,
    isInitialized,
    gridStyle: {
      display: 'grid',
      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      gap: `${gap}px`,
      width: '100%',
      transition: 'grid-template-columns 0.2s ease-out'
    }
  };
};