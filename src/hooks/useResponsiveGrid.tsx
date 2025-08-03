import { useState, useEffect, useRef, useCallback } from 'react';

interface UseResponsiveGridOptions {
  isChatVisible: boolean;
  isWideScreen?: boolean;
  sidebarVisible?: boolean;
  minCardWidth?: number;
  gap?: number;
}

export const useResponsiveGrid = ({ 
  isChatVisible, 
  isWideScreen = false,
  sidebarVisible = true,
  minCardWidth = 320, 
  gap = 32 
}: UseResponsiveGridOptions) => {
  const [columnCount, setColumnCount] = useState(2);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 1;
    
    // Calculate effective card width including gap
    const effectiveCardWidth = minCardWidth + gap;
    const maxPossibleColumns = Math.floor(containerWidth / effectiveCardWidth);
    
    let columns;
    
    // Enhanced responsive breakpoints with layout context
    if (containerWidth < 640) {
      columns = 1; // Mobile: always 1 column
    } else if (containerWidth < 900) {
      columns = Math.min(2, maxPossibleColumns); // Small screens: max 2 columns
    } else if (containerWidth < 1200) {
      columns = Math.min(3, maxPossibleColumns); // Medium screens: max 3 columns  
    } else if (containerWidth < 1600) {
      columns = Math.min(4, maxPossibleColumns); // Large screens: max 4 columns
    } else {
      columns = Math.min(6, maxPossibleColumns); // XL screens: max 6 columns
    }
    
    // Ensure minimum of 1 column
    columns = Math.max(1, columns);
    
    console.log('🔄 Grid calculation:', {
      containerWidth,
      effectiveCardWidth,
      maxPossibleColumns,
      finalColumns: columns,
      isChatVisible,
      isWideScreen,
      sidebarVisible
    });
    
    return columns;
  }, [minCardWidth, gap, isChatVisible, isWideScreen, sidebarVisible]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      // Multiple methods to get container width for better reliability
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width || container.offsetWidth || container.clientWidth;
      
      if (containerWidth > 0) {
        const newColumnCount = calculateColumns(containerWidth);
        
        console.log('📏 Container measurements:', {
          getBoundingClientRect: rect.width,
          offsetWidth: container.offsetWidth,
          clientWidth: container.clientWidth,
          finalWidth: containerWidth,
          calculatedColumns: newColumnCount,
          currentColumns: columnCount
        });
        
        if (newColumnCount !== columnCount) {
          setColumnCount(newColumnCount);
        }
        
        if (!isInitialized) {
          setIsInitialized(true);
        }
      } else {
        console.warn('⚠️ Container width is 0, retrying...');
        // Retry after DOM updates with longer delay
        setTimeout(() => requestAnimationFrame(updateColumns), 50);
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