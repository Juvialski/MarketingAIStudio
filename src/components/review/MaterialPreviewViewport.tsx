import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  ReactNode,
} from 'react';
import { OutputAspectRatio } from '../../types/campaign';
import { FORMAT_DIMENSIONS } from '../../types/designs';

export interface NativeDimensions {
  width: number;
  height: number;
}

/**
 * Returns canonical native rendering dimensions for each supported creative aspect ratio.
 */
export function getNativeDimensions(aspectRatio: OutputAspectRatio): NativeDimensions {
  const isA4 = aspectRatio === 'flyer_a4';
  const isLetter = aspectRatio === 'flyer_letter';
  const dim = FORMAT_DIMENSIONS[aspectRatio];
  const width = isLetter ? 1275 : isA4 ? 1240 : dim ? dim.width : 1080;
  const height = isLetter ? 1650 : isA4 ? 1754 : dim ? dim.height : 1080;
  return { width, height };
}

/**
 * Calculates uniform scale factor so the entire creative fits within host bounds without clipping or distortion.
 */
export function calculateMaterialFitScale(
  availableWidth: number,
  availableHeight: number,
  nativeWidth: number,
  nativeHeight: number,
  padding: number = 0
): number {
  const usableWidth = Math.max(0, availableWidth - padding * 2);
  const usableHeight = Math.max(0, availableHeight - padding * 2);
  if (usableWidth <= 0 || usableHeight <= 0 || nativeWidth <= 0 || nativeHeight <= 0) {
    return 1;
  }
  return Math.min(usableWidth / nativeWidth, usableHeight / nativeHeight);
}

export const MIN_ZOOM = 0.25; // 25%
export const MAX_ZOOM = 3.0; // 300%
export const ZOOM_STEP = 0.15; // 15% increment

export interface MaterialPreviewViewportProps {
  aspectRatio: OutputAspectRatio;
  nativeWidth?: number;
  nativeHeight?: number;
  zoomScale?: number;
  isFit?: boolean;
  onScaleChange?: (currentScale: number, isFit: boolean) => void;
  padding?: number;
  children: (metrics: {
    scale: number;
    fitScale: number;
    isFit: boolean;
    nativeWidth: number;
    nativeHeight: number;
    scaledWidth: number;
    scaledHeight: number;
  }) => ReactNode;
  className?: string;
  enablePanning?: boolean;
  enableWheelZoom?: boolean;
  enableKeyboardShortcuts?: boolean;
  onClose?: () => void;
  onPrevMaterial?: () => void;
  onNextMaterial?: () => void;
}

export const MaterialPreviewViewport: React.FC<MaterialPreviewViewportProps> = ({
  aspectRatio,
  nativeWidth: customNativeWidth,
  nativeHeight: customNativeHeight,
  zoomScale: controlledZoomScale,
  isFit: controlledIsFit,
  onScaleChange,
  padding = 16,
  children,
  className = '',
  enablePanning = true,
  enableWheelZoom = true,
  enableKeyboardShortcuts = true,
  onClose,
  onPrevMaterial,
  onNextMaterial,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);

  const nativeDims = getNativeDimensions(aspectRatio);
  const nativeWidth = customNativeWidth || nativeDims.width;
  const nativeHeight = customNativeHeight || nativeDims.height;

  // Viewport host bounds
  const [hostDimensions, setHostDimensions] = useState({ width: 0, height: 0 });
  const [internalIsFit, setInternalIsFit] = useState(true);
  const [internalScale, setInternalScale] = useState(1);

  // Drag-to-pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const isFit = controlledIsFit !== undefined ? controlledIsFit : internalIsFit;
  const fitScale = calculateMaterialFitScale(
    hostDimensions.width,
    hostDimensions.height,
    nativeWidth,
    nativeHeight,
    padding
  );

  const activeScale = isFit
    ? fitScale
    : controlledZoomScale !== undefined
    ? controlledZoomScale
    : internalScale;

  const scaledWidth = Math.round(nativeWidth * activeScale);
  const scaledHeight = Math.round(nativeHeight * activeScale);

  // Measure host container dimensions
  const updateHostDimensions = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (width > 0 && height > 0) {
      setHostDimensions((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    }
  }, []);

  useLayoutEffect(() => {
    updateHostDimensions();
    const el = hostRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateHostDimensions();
      });
      ro.observe(el);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [updateHostDimensions]);

  // Notify parent on scale or fit changes
  useEffect(() => {
    if (onScaleChange) {
      onScaleChange(activeScale, isFit);
    }
  }, [activeScale, isFit, onScaleChange]);

  // Reset internal scale when format changes
  useEffect(() => {
    setInternalIsFit(true);
  }, [aspectRatio]);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused inside input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setInternalIsFit(false);
        setInternalScale((prev) => Math.min(MAX_ZOOM, (isFit ? fitScale : prev) + ZOOM_STEP));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setInternalIsFit(false);
        setInternalScale((prev) => Math.max(MIN_ZOOM, (isFit ? fitScale : prev) - ZOOM_STEP));
      } else if (e.key === '0') {
        e.preventDefault();
        setInternalIsFit(true);
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      } else if (e.key === 'ArrowLeft') {
        if (onPrevMaterial) {
          e.preventDefault();
          onPrevMaterial();
        }
      } else if (e.key === 'ArrowRight') {
        if (onNextMaterial) {
          e.preventDefault();
          onNextMaterial();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, isFit, fitScale, onClose, onPrevMaterial, onNextMaterial]);

  // Mouse wheel zoom (Ctrl/Cmd + Wheel)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enableWheelZoom) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        setInternalIsFit(false);
        setInternalScale((prev) => {
          const current = isFit ? fitScale : prev;
          return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
        });
      }
    },
    [enableWheelZoom, isFit, fitScale]
  );

  // Drag-to-pan handlers
  const canPan = enablePanning && hostRef.current && (scaledWidth > hostDimensions.width || scaledHeight > hostDimensions.height);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canPan || e.button !== 0) return;
    // Don't pan if clicking an interactive button
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('button') || target.closest('input') || target.closest('a'))) {
      return;
    }

    if (hostRef.current) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: hostRef.current.scrollLeft,
        scrollTop: hostRef.current.scrollTop,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !hostRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    hostRef.current.scrollLeft = panStart.scrollLeft - dx;
    hostRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  return (
    <div
      ref={hostRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`material-preview-viewport w-full h-full min-h-0 min-w-0 overflow-auto select-none flex ${
        canPan ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      } ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
      tabIndex={0}
      role="region"
      aria-label="Creative Preview Canvas"
    >
      <div
        className="material-preview-stage m-auto flex items-center justify-center p-4"
        style={{
          minWidth: '100%',
          minHeight: '100%',
          width: 'max-content',
          height: 'max-content',
        }}
      >
        <div
          className="material-preview-canvas-box relative shadow-2xl transition-transform duration-75 ease-out rounded-lg overflow-hidden"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            aspectRatio: `${nativeWidth} / ${nativeHeight}`,
            flexShrink: 0,
          }}
        >
          {children({
            scale: activeScale,
            fitScale,
            isFit,
            nativeWidth,
            nativeHeight,
            scaledWidth,
            scaledHeight,
          })}
        </div>
      </div>
    </div>
  );
};
