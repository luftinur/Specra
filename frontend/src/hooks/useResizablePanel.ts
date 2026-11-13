import { useState, useEffect, useCallback, useRef } from 'react';

export interface ResizablePanelOptions {
  storageKey?: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  direction?: 'left' | 'right'; // 'left' means dragging affects left edge; 'right' affects right edge
}

export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  direction = 'left',
}: ResizablePanelOptions) {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const val = Number(saved);
          if (!isNaN(val) && val >= minWidth && val <= maxWidth) {
            return val;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      setIsDragging(true);
    },
    [width]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === 'left' 
        ? e.clientX - startXRef.current 
        : startXRef.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(width));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth, direction, storageKey, width]);

  return {
    width,
    setWidth,
    isDragging,
    startResize,
  };
}
