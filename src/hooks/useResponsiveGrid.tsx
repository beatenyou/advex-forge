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
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback((containerWidth: number) => {
    if (containerWidth === 0) return 1;
    
    // Calculate how many columns can fit based on card width + gap
    const cardWithGap = minCardWidth + gap;
    const maxPossibleColumns = Math.floor(containerWidth / cardWithGap) || 1;
    
    console.log('🔄 Grid calculation:', {
      containerWidth,
      cardWithGap,
      maxPossibleColumns,
      isChatVisible,
      calculatedColumns: 'calculating...'
    });
    
    // Mobile-first breakpoints
    if (containerWidth < 480) {
      return 1; // Mobile: always 1 column
    }
    
    if (containerWidth < 768) {
      return Math.min(2, maxPossibleColumns); // Small tablet: max 2 columns
    }
    
    let columns;
    // Define breakpoints based on chat visibility for larger screens
    if (isChatVisible) {
      // More conservative when chat is open
      if (containerWidth < 900) columns = Math.min(2, maxPossibleColumns);
      else if (containerWidth < 1200) columns = Math.min(3, maxPossibleColumns);
      else if (containerWidth < 1600) columns = Math.min(4, maxPossibleColumns);
      else columns = Math.min(4, maxPossibleColumns); // Max 4 when chat open
    } else {
      // More aggressive when chat is closed - better utilization of screen space
      if (containerWidth < 900) columns = Math.min(2, maxPossibleColumns);
      else if (containerWidth < 1200) columns = Math.min(3, maxPossibleColumns);
      else if (containerWidth < 1600) columns = Math.min(4, maxPossibleColumns);
      else if (containerWidth < 1900) columns = Math.min(5, maxPossibleColumns);
      else if (containerWidth < 2400) columns = Math.min(6, maxPossibleColumns);
      else columns = Math.min(7, maxPossibleColumns); // Max 7 for ultra-wide
    }
    
    console.log('✅ Grid calculated:', {
      containerWidth,
      isChatVisible,
      finalColumns: columns
    });
    
    return columns;
  }, [isChatVisible, minCardWidth, gap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumns = () => {
      // Try multiple methods to get accurate width
      const containerWidth = Math.max(
        container.offsetWidth,
        container.clientWidth,
        container.scrollWidth
      );
      
      if (containerWidth > 0) {
        const newColumnCount = calculateColumns(containerWidth);
        console.log('📏 Container measurements:', {
          offsetWidth: container.offsetWidth,
          clientWidth: container.clientWidth,
          scrollWidth: container.scrollWidth,
          finalWidth: containerWidth,
          calculatedColumns: newColumnCount
        });
        
        setColumnCount(newColumnCount);
        setIsInitialized(true);
      } else {
        console.warn('⚠️ Container width is 0, retrying...');
        // Retry after a short delay if width is 0
        setTimeout(updateColumns, 100);
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        console.log('📐 ResizeObserver triggered:', {
          contentRect: entry.contentRect,
          borderBoxSize: entry.borderBoxSize?.[0],
          isChatVisible
        });
      }
      updateColumns();
    });

    resizeObserver.observe(container);
    
    // Initial calculation with aggressive retries to ensure proper rendering
    updateColumns();
    setTimeout(updateColumns, 0);
    setTimeout(updateColumns, 50);
    setTimeout(updateColumns, 200);
    setTimeout(updateColumns, 500);
    
    // Also listen for window resize as backup
    const handleWindowResize = () => {
      setTimeout(updateColumns, 100);
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [calculateColumns, isChatVisible]);

  return {
    containerRef,
    columnCount,
    isInitialized,
    gridStyle: {
      display: 'grid !important' as const,
      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      gap: `${gap}px`,
      transition: 'grid-template-columns 0.3s ease-out',
      width: '100%',
      minHeight: 'min-content',
      // Ensure grid is applied even when not initialized
      ...(!isInitialized && { 
        gridTemplateColumns: 'repeat(2, 1fr)' // Fallback to 2 columns
      })
    }
  };
};