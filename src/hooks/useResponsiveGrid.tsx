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
  minCardWidth = 280, 
  gap = 24 
}: UseResponsiveGridOptions) => {
  const [columnCount, setColumnCount] = useState(2);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 1;
    
    // More aggressive column calculation for better space utilization
    const availableWidth = containerWidth - (gap * 2); // Account for container padding
    const maxPossibleColumns = Math.floor(availableWidth / minCardWidth);
    
    let columns;
    
    // Optimized responsive breakpoints for better multi-column layout
    if (containerWidth < 480) {
      columns = 1; // Mobile: always 1 column
    } else if (containerWidth < 800) {
      columns = Math.min(2, maxPossibleColumns); // Small tablets: max 2 columns
    } else if (containerWidth < 1100) {
      columns = Math.min(3, maxPossibleColumns); // Medium screens: max 3 columns  
    } else if (containerWidth < 1400) {
      columns = Math.min(4, maxPossibleColumns); // Large screens: max 4 columns
    } else {
      columns = Math.min(5, maxPossibleColumns); // XL screens: max 5 columns
    }
    
    // Ensure minimum of 1 column and prefer more columns when possible
    columns = Math.max(1, Math.min(columns, maxPossibleColumns));
    
    console.log('🔄 Grid calculation:', {
      containerWidth,
      availableWidth,
      minCardWidth,
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
      // Multiple methods to get container width with enhanced reliability
      const rect = container.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(container);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const containerWidth = (rect.width || container.offsetWidth || container.clientWidth) - paddingLeft - paddingRight;
      
      if (containerWidth > 200) {
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