import { useState, useEffect, useRef, useCallback } from 'react';

interface UseResponsiveCardGridOptions {
  isChatVisible?: boolean;
  isWideScreen?: boolean;
  isMobile?: boolean;
  minCardWidth?: number;
  maxColumns?: number;
}

export const useResponsiveCardGrid = (options: UseResponsiveCardGridOptions = {}) => {
  const {
    isChatVisible = false,
    isWideScreen = false,
    isMobile = false,
    minCardWidth = 280,
    maxColumns = 6
  } = options;

  const [columnCount, setColumnCount] = useState(1);
  const [cardWidth, setCardWidth] = useState('wide');
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateLayout = useCallback((containerWidth: number) => {
    if (!containerWidth) return { columns: 1, width: 'wide' };

    // Adjust available width based on chat panel
    const chatPanelWidth = isChatVisible ? (isWideScreen ? 400 : 320) : 0;
    const availableWidth = containerWidth - chatPanelWidth;

    // Calculate optimal columns based on screen size and available width
    let optimalColumns: number;
    let widthClass: string;

    if (isMobile) {
      optimalColumns = 1;
      widthClass = 'full';
    } else if (availableWidth < 640) {
      optimalColumns = 1;
      widthClass = 'full';
    } else if (availableWidth < 768) {
      optimalColumns = 2;
      widthClass = 'wide';
    } else if (availableWidth < 1024) {
      optimalColumns = Math.min(3, Math.floor(availableWidth / minCardWidth));
      widthClass = 'medium';
    } else if (availableWidth < 1280) {
      optimalColumns = Math.min(4, Math.floor(availableWidth / minCardWidth));
      widthClass = 'compact';
    } else if (availableWidth < 1536) {
      optimalColumns = Math.min(5, Math.floor(availableWidth / minCardWidth));
      widthClass = 'minimal';
    } else {
      optimalColumns = Math.min(maxColumns, Math.floor(availableWidth / minCardWidth));
      widthClass = 'minimal';
    }

    // Ensure we don't exceed maxColumns
    optimalColumns = Math.min(optimalColumns, maxColumns);
    optimalColumns = Math.max(1, optimalColumns);

    return { columns: optimalColumns, width: widthClass };
  }, [isChatVisible, isWideScreen, isMobile, minCardWidth, maxColumns]);

  const updateLayout = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const { columns, width } = calculateLayout(rect.width);
    
    setColumnCount(columns);
    setCardWidth(width);
    
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [calculateLayout, isInitialized]);

  useEffect(() => {
    const handleResize = () => updateLayout();
    
    // Initial layout calculation
    updateLayout();
    
    // Set up resize observer for container
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }

    // Fallback window resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [updateLayout]);

  // Recalculate when chat visibility changes
  useEffect(() => {
    if (isInitialized) {
      updateLayout();
    }
  }, [isChatVisible, isWideScreen, updateLayout, isInitialized]);

  const getGridClasses = () => {
    const baseClasses = "grid gap-4 w-full transition-all duration-300";
    const columnClasses = `grid-cols-${columnCount}`;
    
    // Responsive column classes for different breakpoints
    if (columnCount === 1) {
      return `${baseClasses} grid-cols-1`;
    } else if (columnCount === 2) {
      return `${baseClasses} grid-cols-1 sm:grid-cols-2`;
    } else if (columnCount === 3) {
      return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3`;
    } else if (columnCount === 4) {
      return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`;
    } else if (columnCount === 5) {
      return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`;
    } else {
      return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`;
    }
  };

  const getCardContextClasses = () => {
    switch (cardWidth) {
      case 'full':
        return 'card-context-full'; // Show all content
      case 'wide':
        return 'card-context-wide'; // Show most content
      case 'medium':
        return 'card-context-medium'; // Show essential content
      case 'compact':
        return 'card-context-compact'; // Show minimal content
      case 'minimal':
        return 'card-context-minimal'; // Show only critical content
      default:
        return 'card-context-medium';
    }
  };

  return {
    containerRef,
    columnCount,
    cardWidth,
    isInitialized,
    getGridClasses,
    getCardContextClasses
  };
};