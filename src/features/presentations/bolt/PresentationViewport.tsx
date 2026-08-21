import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  type ReactNode,
} from 'react';

export const CANONICAL_WIDTH = 1600;
export const CANONICAL_HEIGHT = 900;
export const CANONICAL_ASPECT_RATIO = CANONICAL_WIDTH / CANONICAL_HEIGHT; // 16:9 = 1.777...

export interface PresentationViewportContextValue {
  scale: number;
  logicalWidth: number;
  logicalHeight: number;
  hostWidth: number;
  hostHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  offsetX: number;
  offsetY: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  hostRef: React.RefObject<HTMLDivElement>;
  getCanonicalCoordinates: (clientX: number, clientY: number) => { x: number; y: number } | null;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const PresentationViewportContext = createContext<PresentationViewportContextValue>({
  scale: 1,
  logicalWidth: CANONICAL_WIDTH,
  logicalHeight: CANONICAL_HEIGHT,
  hostWidth: CANONICAL_WIDTH,
  hostHeight: CANONICAL_HEIGHT,
  scaledWidth: CANONICAL_WIDTH,
  scaledHeight: CANONICAL_HEIGHT,
  offsetX: 0,
  offsetY: 0,
  canvasRef: { current: null },
  hostRef: { current: null },
  getCanonicalCoordinates: () => null,
  toggleFullscreen: () => {},
  isFullscreen: false,
});

export const usePresentationViewport = () => useContext(PresentationViewportContext);

/**
 * Calculates uniform scale factor to fit canonical 1600x900 canvas into host bounds.
 */
export function calculatePresentationScale(
  hostWidth: number,
  hostHeight: number,
  canonicalWidth: number = CANONICAL_WIDTH,
  canonicalHeight: number = CANONICAL_HEIGHT
): number {
  if (hostWidth <= 0 || hostHeight <= 0) return 1;
  return Math.min(hostWidth / canonicalWidth, hostHeight / canonicalHeight);
}

export interface PresentationViewportProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  backgroundColor?: string;
}

export const PresentationViewport: React.FC<PresentationViewportProps> = ({
  children,
  className = '',
  style,
  backgroundColor = '#000000',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState({
    hostWidth: CANONICAL_WIDTH,
    hostHeight: CANONICAL_HEIGHT,
    scale: 1,
    scaledWidth: CANONICAL_WIDTH,
    scaledHeight: CANONICAL_HEIGHT,
    offsetX: 0,
    offsetY: 0,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateDimensions = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;

    const hostWidth = el.clientWidth || window.innerWidth || CANONICAL_WIDTH;
    const hostHeight = el.clientHeight || window.innerHeight || CANONICAL_HEIGHT;

    const scale = calculatePresentationScale(hostWidth, hostHeight, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    const scaledWidth = CANONICAL_WIDTH * scale;
    const scaledHeight = CANONICAL_HEIGHT * scale;
    const offsetX = Math.max(0, (hostWidth - scaledWidth) / 2);
    const offsetY = Math.max(0, (hostHeight - scaledHeight) / 2);

    setMetrics({
      hostWidth,
      hostHeight,
      scale,
      scaledWidth,
      scaledHeight,
      offsetX,
      offsetY,
    });
  }, []);

  useLayoutEffect(() => {
    updateDimensions();
    const el = hostRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateDimensions();
      });
      ro.observe(el);
    }

    const handleWindowResize = () => {
      updateDimensions();
    };

    window.addEventListener('resize', handleWindowResize);

    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement &&
        (document.fullscreenElement === el || el.contains(document.fullscreenElement))
      );
      setIsFullscreen(isFs);
      updateDimensions();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [updateDimensions]);

  const toggleFullscreen = useCallback(() => {
    const el = hostRef.current;
    if (!el || typeof document === 'undefined') return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {
        // Fallback if container requestFullscreen fails
        document.documentElement.requestFullscreen?.().catch(() => {});
      });
    }
  }, []);

  const getCanonicalCoordinates = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return null;

      const rect = canvasEl.getBoundingClientRect();
      const currentScale = metrics.scale || 1;

      const x = (clientX - rect.left) / currentScale;
      const y = (clientY - rect.top) / currentScale;

      return {
        x: Math.max(0, Math.min(CANONICAL_WIDTH, x)),
        y: Math.max(0, Math.min(CANONICAL_HEIGHT, y)),
      };
    },
    [metrics.scale]
  );

  const contextValue: PresentationViewportContextValue = {
    scale: metrics.scale,
    logicalWidth: CANONICAL_WIDTH,
    logicalHeight: CANONICAL_HEIGHT,
    hostWidth: metrics.hostWidth,
    hostHeight: metrics.hostHeight,
    scaledWidth: metrics.scaledWidth,
    scaledHeight: metrics.scaledHeight,
    offsetX: metrics.offsetX,
    offsetY: metrics.offsetY,
    canvasRef,
    hostRef,
    getCanonicalCoordinates,
    toggleFullscreen,
    isFullscreen,
  };

  return (
    <PresentationViewportContext.Provider value={contextValue}>
      <div
        ref={hostRef}
        className={`presentation-viewport-host ${className}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor,
          ...style,
        }}
      >
        <div
          ref={canvasRef}
          className="presentation-viewport-canvas"
          style={{
            width: `${CANONICAL_WIDTH}px`,
            height: `${CANONICAL_HEIGHT}px`,
            transform: `scale(${metrics.scale})`,
            transformOrigin: 'center center',
            position: 'relative',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </PresentationViewportContext.Provider>
  );
};
