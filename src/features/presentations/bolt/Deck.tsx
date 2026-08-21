import React, {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { DeckCtx } from './DeckContext';
import Annotator, { type Stroke } from './Annotator';
import { PresentationViewport, CANONICAL_WIDTH, CANONICAL_HEIGHT } from './PresentationViewport';
import {
  IconSidebar,
  IconGrid,
  IconLeft,
  IconRight,
  IconPencil,
  IconExpand,
  IconShrink,
  IconPresent,
  IconClose,
} from './icons';

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function Thumb({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.15);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth || 240;
      setScale(width / CANONICAL_WIDTH);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className="noir-thumb-frame"
      ref={frameRef}
      style={{
        aspectRatio: '16 / 9',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#090e17',
      }}
    >
      <DeckCtx.Provider value={{ clicks: 9999, isStatic: true }}>
        <div
          className="noir-thumb-scale"
          style={{
            width: `${CANONICAL_WIDTH}px`,
            height: `${CANONICAL_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      </DeckCtx.Provider>
    </div>
  );
}

export interface DeckRef {
  toggleFullscreen: () => void;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  isFullscreen: () => boolean;
  getHostElement: () => HTMLDivElement | null;
}

export interface DeckProps {
  children: ReactNode;
  campaignId?: string;
  className?: string;
  style?: React.CSSProperties;
  onNotesChange?: (slideIndex: number, notes: string) => void;
  readOnly?: boolean;
}

const Deck = forwardRef<DeckRef, DeckProps>(function Deck(
  {
    children,
    campaignId = 'default',
    className = '',
    style,
    onNotesChange,
    readOnly = false,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slides = useMemo(
    () => Children.toArray(children) as ReactElement[],
    [children]
  );
  const total = slides.length;

  const isPresenter = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('presenter');
  }, []);

  const [slide, setSlide] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const h = parseInt(window.location.hash.slice(1), 10);
    return h >= 1 && h <= total ? h - 1 : 0;
  });
  const [clicks, setClicks] = useState(0);
  const [curMax, setCurMax] = useState(0);
  const [railOpen, setRailOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fs, setFs] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [nearDock, setNearDock] = useState(false);
  const [cursorIdle, setCursorIdle] = useState(false);

  const notesStorageKey = `zaw:deck:${campaignId}:notes`;

  const [noteOverrides, setNoteOverrides] = useState<Record<number, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(notesStorageKey) || '{}');
    } catch {
      return {};
    }
  });

  const maxMap = useRef<Record<number, number>>({});
  const annStore = useRef<Record<number, Stroke[]>>({});
  const slideRef = useRef(slide);
  slideRef.current = slide;

  const registerMax = useCallback((at: number) => {
    const m = maxMap.current;
    m[slideRef.current] = Math.max(m[slideRef.current] || 0, at);
    setCurMax((c) => Math.max(c, at));
  }, []);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(total - 1, i));
      setSlide(n);
      setClicks(0);
      setCurMax(maxMap.current[n] || 0);
    },
    [total]
  );

  const next = useCallback(() => {
    if (clicks < curMax) {
      setClicks(clicks + 1);
      return;
    }
    if (slide < total - 1) {
      const n = slide + 1;
      setSlide(n);
      setClicks(0);
      setCurMax(maxMap.current[n] || 0);
    }
  }, [clicks, curMax, slide, total]);

  const prev = useCallback(() => {
    if (clicks > 0) {
      setClicks(clicks - 1);
      return;
    }
    if (slide > 0) {
      const n = slide - 1;
      const m = maxMap.current[n] || 0;
      setSlide(n);
      setClicks(m);
      setCurMax(m);
    }
  }, [clicks, slide]);

  const toggleFs = useCallback(() => {
    const el = containerRef.current;
    if (!el || typeof document === 'undefined') return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      toggleFullscreen: toggleFs,
      requestFullscreen: async () => {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen?.();
        }
      },
      exitFullscreen: async () => {
        if (document.fullscreenElement) {
          await document.exitFullscreen?.();
        }
      },
      isFullscreen: () =>
        Boolean(
          document.fullscreenElement &&
            (document.fullscreenElement === containerRef.current ||
              containerRef.current?.contains(document.fullscreenElement))
        ),
      getHostElement: () => containerRef.current,
    }),
    [toggleFs]
  );

  const toggleRail = useCallback(() => {
    setRailOpen((v) => !v);
    setGridOpen(false);
  }, []);

  const toggleGrid = useCallback(() => {
    setGridOpen((v) => !v);
    setRailOpen(false);
  }, []);

  const setNote = useCallback(
    (text: string) => {
      if (readOnly) return;
      setNoteOverrides((prevNotes) => {
        const nextO = { ...prevNotes, [slideRef.current]: text };
        try {
          localStorage.setItem(notesStorageKey, JSON.stringify(nextO));
        } catch {
          /* ignore */
        }
        return nextO;
      });
      onNotesChange?.(slideRef.current, text);
    },
    [readOnly, notesStorageKey, onNotesChange]
  );

  const openPresenter = useCallback(() => {
    if (isPresenter || typeof window === 'undefined') return;
    const url =
      window.location.pathname +
      '?presenter=1&campaign=' +
      encodeURIComponent(campaignId) +
      window.location.hash;
    window.open(url, `zaw-presenter-${campaignId}`);
  }, [isPresenter, campaignId]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'TEXTAREA' ||
          t.tagName === 'INPUT' ||
          t.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          go(0);
          break;
        case 'End':
          e.preventDefault();
          go(total - 1);
          break;
        case 's':
        case 'S':
          toggleRail();
          break;
        case 'g':
          case 'G':
          toggleGrid();
          break;
        case 'f':
        case 'F':
          toggleFs();
          break;
        case 'a':
        case 'A':
          if (!readOnly) setDrawing((v) => !v);
          break;
        case 'p':
        case 'P':
          if (!readOnly) openPresenter();
          break;
        case 'h':
        case 'H':
          setUiHidden((v) => !v);
          break;
        case 'Escape':
          setRailOpen(false);
          setGridOpen(false);
          setDrawing(false);
          setUiHidden(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, go, total, toggleRail, toggleGrid, toggleFs, openPresenter, readOnly]);

  // Touch Swipe Support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
  };

  // URL hash sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const want = String(slide + 1);
    if (window.location.hash.slice(1) !== want) {
      history.replaceState(null, '', '#' + want);
    }
  }, [slide]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHash = () => {
      const h = parseInt(window.location.hash.slice(1), 10);
      if (h >= 1 && h <= total && h - 1 !== slide) go(h - 1);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [slide, total, go]);

  // Cross-tab sync via namespaced BroadcastChannel
  const chan = useRef<BroadcastChannel | null>(null);
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (readOnly || typeof BroadcastChannel === 'undefined') return;
    const channelName = `zaw-deck-sync:${campaignId}`;
    const c = new BroadcastChannel(channelName);
    chan.current = c;
    c.onmessage = (e) => {
      if (e.data?.type === 'state') {
        applyingRemote.current = true;
        setSlide(e.data.slide);
        setClicks(e.data.clicks);
      }
    };
    return () => c.close();
  }, [campaignId, readOnly]);

  useEffect(() => {
    if (readOnly || applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    chan.current?.postMessage({ type: 'state', slide, clicks });
  }, [slide, clicks, readOnly]);

  // Fullscreen tracking & idle auto-hide
  useEffect(() => {
    const h = () => {
      const isContainerFs = Boolean(
        document.fullscreenElement &&
        (document.fullscreenElement === containerRef.current ||
          containerRef.current?.contains(document.fullscreenElement))
      );
      setFs(isContainerFs);
    };
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => {
    if (!isPresenter) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [isPresenter]);

  useEffect(() => {
    let t = 0;
    const onMove = (e: MouseEvent) => {
      setCursorIdle(false);
      setNearDock(e.clientY > window.innerHeight - 140);
      clearTimeout(t);
      t = window.setTimeout(() => setCursorIdle(true), 2500);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  const liveCtx = useMemo(
    () => ({ clicks, isStatic: false, registerMax }),
    [clicks, registerMax]
  );
  const hasPrev = slide > 0 || clicks > 0;
  const hasNext = slide < total - 1 || clicks < curMax;
  const notes = (slides[slide]?.props as { notes?: string } | undefined)?.notes;
  const noteText = noteOverrides[slide] ?? notes ?? '';
  const nextSlide = slides[slide + 1];
  const hideUI = uiHidden || (fs && !nearDock);
  const cursorHidden = fs && cursorIdle && !drawing;
  const showAnnotator = !readOnly && (drawing || (annStore.current[slide]?.length ?? 0) > 0);

  const navCluster = (
    <>
      <button
        className="noir-icon-btn"
        data-tip="Previous"
        aria-label="Previous slide"
        disabled={!hasPrev}
        onClick={prev}
      >
        <IconLeft />
      </button>
      <div className="noir-counter" aria-live="polite">
        <span className="noir-counter-now">{slide + 1}</span>
        <span className="noir-counter-tot">/ {total}</span>
      </div>
      <button
        className="noir-icon-btn"
        data-tip="Next"
        aria-label="Next slide"
        disabled={!hasNext}
        onClick={next}
      >
        <IconRight />
      </button>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={containerRef}
        className={`zaw-deck${cursorHidden ? ' nocursor' : ''}${className ? ' ' + className : ''}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Presentation Viewport with Canonical 1600x900 Scale & Letterboxing */}
        <PresentationViewport>
          <DeckCtx.Provider value={liveCtx}>
            <div className="slide-stage" key={slide}>
              {slides[slide]}
            </div>
          </DeckCtx.Provider>

          {showAnnotator && (
            <Annotator
              key={slide}
              slide={slide}
              store={annStore.current}
              active={drawing}
            />
          )}
        </PresentationViewport>

        {/* Thumbnail Sidebar */}
        <aside
          className={'noir-rail' + (railOpen ? ' open' : '')}
          aria-label="Slide thumbnail sidebar"
        >
          <div className="noir-rail-head">
            <span className="noir-rail-title">Slides</span>
            <button
              className="noir-icon-btn"
              data-tip="Close"
              aria-label="Close slide sidebar"
              onClick={() => setRailOpen(false)}
            >
              <IconClose />
            </button>
          </div>
          <div className="noir-rail-list">
            {railOpen &&
              slides.map((s, i) => (
                <button
                  key={i}
                  className={'noir-thumb' + (i === slide ? ' active' : '')}
                  onClick={() => {
                    go(i);
                    setRailOpen(false);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                >
                  <span className="noir-thumb-no">{i + 1}</span>
                  <Thumb>{s}</Thumb>
                </button>
              ))}
          </div>
        </aside>

        {/* Slide Overview Grid */}
        {gridOpen && (
          <div className="noir-grid" role="dialog" aria-modal="true" aria-label="All slides overview">
            <div className="noir-grid-head">
              <span className="noir-rail-title">All Slides ({total})</span>
              <button
                className="noir-icon-btn"
                data-tip="Close"
                aria-label="Close grid overview"
                onClick={() => setGridOpen(false)}
              >
                <IconClose />
              </button>
            </div>
            <div className="noir-grid-list">
              {slides.map((s, i) => (
                <button
                  key={i}
                  className={'noir-thumb' + (i === slide ? ' active' : '')}
                  onClick={() => {
                    go(i);
                    setGridOpen(false);
                  }}
                  aria-label={`Jump to slide ${i + 1}`}
                >
                  <span className="noir-thumb-no">{i + 1}</span>
                  <Thumb>{s}</Thumb>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Presenter Window */}
        {!readOnly && isPresenter && (
          <div className="noir-presenter" role="region" aria-label="Presenter control window">
            <div className="noir-presenter-row">
              <span className="noir-presenter-label">
                Presenter Mode · {slide + 1} / {total}
              </span>
              <span className="noir-presenter-timer">{fmt(elapsed)}</span>
            </div>
            {nextSlide && (
              <div className="noir-presenter-next">
                <Thumb>{nextSlide}</Thumb>
              </div>
            )}
            <textarea
              className="noir-presenter-notes"
              value={noteText}
              spellCheck={false}
              placeholder="Type speaker notes here..."
              onChange={(e) => setNote(e.target.value)}
              aria-label="Speaker notes"
            />
            <div className="noir-presenter-hint">
              Speaker notes persist on this campaign.
            </div>
          </div>
        )}

        {/* Dock Controls */}
        <nav
          className={'noir-dock' + (hideUI ? ' hidden' : '')}
          aria-label="Presentation toolbar"
        >
          <div className="noir-bar noir-nav-bar">{navCluster}</div>
          <div className="noir-bar">
            <button
              className={'noir-icon-btn' + (railOpen ? ' on' : '')}
              data-tip="Sidebar (S)"
              aria-label="Slide thumbnail sidebar"
              aria-pressed={railOpen}
              onClick={toggleRail}
            >
              <IconSidebar />
            </button>
            <button
              className={'noir-icon-btn' + (gridOpen ? ' on' : '')}
              data-tip="Grid view (G)"
              aria-label="All slides grid view"
              aria-pressed={gridOpen}
              onClick={toggleGrid}
            >
              <IconGrid />
            </button>
            <span className="noir-sep" />
            <div className="noir-nav-inline">{navCluster}</div>
            <span className="noir-sep" />
            {!readOnly && (
              <button
                className={'noir-icon-btn' + (drawing ? ' on' : '')}
                data-tip="Annotate (A)"
                aria-label="Canvas drawing tool"
                aria-pressed={drawing}
                onClick={() => setDrawing((v) => !v)}
              >
                <IconPencil />
              </button>
            )}
            <button
              className="noir-icon-btn"
              data-tip={fs ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={fs ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleFs}
            >
              {fs ? <IconShrink /> : <IconExpand />}
            </button>
            {!readOnly && (
              <button
                className="noir-icon-btn"
                data-tip="Presenter — new tab (P)"
                aria-label="Open presenter view in new tab"
                onClick={openPresenter}
              >
                <IconPresent />
              </button>
            )}
          </div>
        </nav>
      </div>
    </MotionConfig>
  );
});

export default Deck;
