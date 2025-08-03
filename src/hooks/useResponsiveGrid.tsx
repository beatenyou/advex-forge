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
  minCardWidth = 240, 
  gap = 20 
}: UseResponsiveGridOptions) => {
  const [columnCount, setColumnCount] = useState(3);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 3;
    
    // Aggressive column calculation for maximum space utilization
    const availableWidth = containerWidth - 40; // Account for container padding
    const maxPossibleColumns = Math.floor(availableWidth / minCardWidth);
    
    let columns;
    
    // Optimized breakpoints for better multi-column layout
    if (containerWidth < 400) {
      columns = 1; // Mobile: always 1 column
    } else if (containerWidth < 720) {
      columns = Math.max(2, Math.min(3, maxPossibleColumns)); // Small screens: 2-3 columns
    } else if (containerWidth < 1000) {
      columns = Math.max(3, Math.min(4, maxPossibleColumns)); // Medium screens: 3-4 columns  
    } else if (containerWidth < 1300) {
      columns = Math.max(4, Math.min(5, maxPossibleColumns)); // Large screens: 4-5 columns
    } else {
      columns = Math.max(5, Math.min(6, maxPossibleColumns)); // XL screens: 5-6 columns
    }
    
    // Force minimum columns based on available space
    columns = Math.max(Math.min(3, maxPossibleColumns), Math.min(columns, maxPossibleColumns));
    
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
      
      if (containerWidth > 100) {
        const newColumnCount = calculateColumns(containerWidth);
        
        console.log('📏 Container measurements:', {
          getBoundingClientRect: rect.width,
          offsetWidth: container.offsetWidth,
          clientWidth: container.clientWidth,
          finalWidth: containerWidth,
          calculatedColumns: newColumnCount,
          currentColumns: columnCount,
          minCardWidth,
          maxPossible: Math.floor((containerWidth - 40) / minCardWidth)
        });
        
        if (newColumnCount !== columnCount) {
          setColumnCount(newColumnCount);
        }
        
        if (!isInitialized) {
          setIsInitialized(true);
        }
      } else {
        console.warn('⚠️ Container width too small, forcing 3 columns...');
        // Force 3 columns as fallback
        if (columnCount !== 3) {
          setColumnCount(3);
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
      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      gap: `${gap}px`,
      width: '100%',
      transition: 'grid-template-columns 0.2s ease-out'
    }
  };
};