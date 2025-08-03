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
  minCardWidth = 260, 
  gap = 16
}: UseResponsiveGridOptions) => {
  const [columnCount, setColumnCount] = useState(4);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 4;
    
    // Ultra-aggressive column calculation for maximum space utilization
    const availableWidth = containerWidth - 32; // Minimal padding
    const maxPossibleColumns = Math.floor(availableWidth / minCardWidth);
    
    let columns;
    
    // More aggressive breakpoints prioritizing columns over card width
    if (containerWidth < 350) {
      columns = 1; // Mobile only
    } else if (containerWidth < 600) {
      columns = Math.max(2, Math.min(3, maxPossibleColumns)); // Small: 2-3 columns
    } else if (containerWidth < 900) {
      columns = Math.max(3, Math.min(4, maxPossibleColumns)); // Medium: 3-4 columns  
    } else if (containerWidth < 1200) {
      columns = Math.max(4, Math.min(5, maxPossibleColumns)); // Large: 4-5 columns
    } else if (containerWidth < 1500) {
      columns = Math.max(5, Math.min(6, maxPossibleColumns)); // XL: 5-6 columns
    } else {
      columns = Math.max(6, Math.min(7, maxPossibleColumns)); // XXL: 6-7 columns
    }
    
    // Always use maximum possible columns, minimum 3 on medium+ screens
    columns = containerWidth < 600 ? Math.max(1, Math.min(columns, maxPossibleColumns)) : Math.max(3, Math.min(columns, maxPossibleColumns));
    
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
      
      if (containerWidth > 50) {
        const newColumnCount = calculateColumns(containerWidth);
        
        console.log('📏 Container measurements:', {
          getBoundingClientRect: rect.width,
          offsetWidth: container.offsetWidth,
          clientWidth: container.clientWidth,
          finalWidth: containerWidth,
          calculatedColumns: newColumnCount,
          currentColumns: columnCount,
          minCardWidth,
          maxPossible: Math.floor((containerWidth - 32) / minCardWidth)
        });
        
        if (newColumnCount !== columnCount) {
          setColumnCount(newColumnCount);
        }
        
        if (!isInitialized) {
          setIsInitialized(true);
        }
      } else {
        console.warn('⚠️ Container width too small, forcing 4 columns...');
        // Force 4 columns as fallback for better default
        if (columnCount !== 4) {
          setColumnCount(4);
        }
        setTimeout(() => requestAnimationFrame(updateColumns), 100);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateColumns);
    });

    resizeObserver.observe(container);
    
    // Initial calculation with multiple attempts
    updateColumns();
    requestAnimationFrame(updateColumns);
    setTimeout(updateColumns, 100);
    setTimeout(updateColumns, 300);
    
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
      gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      gap: `${gap}px`,
      width: '100%',
      minWidth: 0,
      transition: 'grid-template-columns 0.2s ease-out'
    }
  };
};