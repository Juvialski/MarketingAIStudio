import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CANONICAL_WIDTH, CANONICAL_HEIGHT } from './PresentationViewport';

type Tool =
  | 'pen'
  | 'highlighter'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'eraser';

export type Pt = { x: number; y: number }; // Canonical 1600x900 coordinates

export type Stroke = {
  tool: Tool;
  color: string;
  size: number;
  points: Pt[];
};

const TOOLS: { id: Tool; label: string; path: string }[] = [
  { id: 'pen', label: 'Pen', path: 'M4 20h4L18 10a2 2 0 0 0-3-3L5 17z' },
  {
    id: 'highlighter',
    label: 'Highlighter',
    path: 'M4 20h5l8-8-4-4-9 9zM13 7l4 4',
  },
  { id: 'line', label: 'Line', path: 'M5 19L19 5' },
  { id: 'arrow', label: 'Arrow', path: 'M6 18L18 6M18 6h-6M18 6v6' },
  { id: 'rect', label: 'Rectangle', path: 'M4 6h16v12H4z' },
  {
    id: 'ellipse',
    label: 'Ellipse',
    path: 'M12 6c4.5 0 8 2.7 8 6s-3.5 6-8 6-8-2.7-8-6 3.5-6 8-6z',
  },
  {
    id: 'eraser',
    label: 'Eraser',
    path: 'M8 18l-4-4a2 2 0 0 1 0-3l7-7a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-7 7zM7 17h11',
  },
];

const COLORS = ['var(--primary)', '#ffffff', '#ef4444', '#f5b73a', '#4aa8ff'];
const COLOR_LABELS: Record<string, string> = {
  'var(--primary)': 'Accent',
  '#ffffff': 'White',
  '#ef4444': 'Red',
  '#f5b73a': 'Amber',
  '#4aa8ff': 'Blue',
};
const SIZES = [3, 6, 11];
const SIZE_LABELS = ['Small stroke', 'Medium stroke', 'Large stroke'];

const IconUndo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ width: 17, height: 17 }}
  >
    <path d="M9 8L5 12l4 4" />
    <path d="M5 12h9a4 4 0 1 1 0 8h-3" />
  </svg>
);

const IconTrash = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ width: 17, height: 17 }}
  >
    <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
  </svg>
);

function distToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function outline(tool: Tool, pts: Pt[]): Pt[] {
  if (pts.length < 2) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  if (tool === 'rect') return [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a];
  if (tool === 'ellipse') {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const rx = Math.abs(b.x - a.x) / 2;
    const ry = Math.abs(b.y - a.y) / 2;
    return Array.from({ length: 25 }, (_, i) => ({
      x: cx + rx * Math.cos((i / 24) * 2 * Math.PI),
      y: cy + ry * Math.sin((i / 24) * 2 * Math.PI),
    }));
  }
  return pts;
}

function hits(s: Stroke, x: number, y: number, r: number) {
  const pts = outline(s.tool, s.points);
  if (pts.length === 1)
    return Math.hypot(pts[0].x - x, pts[0].y - y) < r + s.size;
  for (let i = 0; i < pts.length - 1; i++) {
    if (
      distToSeg(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <
      r + s.size / 2
    ) {
      return true;
    }
  }
  return false;
}

export interface AnnotatorProps {
  slide: number;
  store: Record<number, Stroke[]>;
  active: boolean;
}

export default function Annotator({
  slide,
  store,
  active,
}: AnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  if (!store[slide]) store[slide] = [];
  const strokes = useRef<Stroke[]>(store[slide]);
  const draft = useRef<Stroke | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;

  const resolveColor = useCallback((c: string) => {
    if (typeof document === 'undefined') return '#c85a32';
    return c.startsWith('var(')
      ? getComputedStyle(document.documentElement)
          .getPropertyValue('--primary')
          .trim() || '#c85a32'
      : c;
  }, []);

  const paint = useCallback((ctx: CanvasRenderingContext2D, s: Stroke, p: Pt[]) => {
    if (!p.length) return;
    ctx.save();
    ctx.strokeStyle = resolveColor(s.color);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.size;
    if (s.tool === 'highlighter') {
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = s.size * 3.2;
    }
    const a = p[0];
    const b = p[p.length - 1];
    ctx.beginPath();
    if (s.tool === 'pen' || s.tool === 'highlighter') {
      ctx.moveTo(a.x, a.y);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.stroke();
    } else if (s.tool === 'line' || s.tool === 'arrow') {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (s.tool === 'arrow') {
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const h = 8 + s.size * 1.8;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x - h * Math.cos(ang - 0.4),
          b.y - h * Math.sin(ang - 0.4)
        );
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x - h * Math.cos(ang + 0.4),
          b.y - h * Math.sin(ang + 0.4)
        );
        ctx.stroke();
      }
    } else if (s.tool === 'rect') {
      ctx.strokeRect(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.abs(b.x - a.x),
        Math.abs(b.y - a.y)
      );
    } else if (s.tool === 'ellipse') {
      ctx.ellipse(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        Math.abs(b.x - a.x) / 2,
        Math.abs(b.y - a.y) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();
  }, [resolveColor]);

  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    for (const s of strokes.current) paint(ctx, s, s.points);
    if (draft.current) paint(ctx, draft.current, draft.current.points);
  }, [paint]);

  const commit = useCallback(() => {
    store[slide] = strokes.current;
    redraw();
  }, [slide, store, redraw]);

  const erase = useCallback((x: number, y: number) => {
    const before = strokes.current.length;
    strokes.current = strokes.current.filter((s) => !hits(s, x, y, 16));
    if (strokes.current.length !== before) commit();
  }, [commit]);

  // Translate client coordinates into canonical 1600x900 coordinate system
  const getCanvasPt = useCallback((e: React.PointerEvent): Pt | null => {
    const cv = canvasRef.current;
    if (!cv) return null;
    const rect = cv.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const scaleX = CANONICAL_WIDTH / rect.width;
    const scaleY = CANONICAL_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(CANONICAL_WIDTH, x)),
      y: Math.max(0, Math.min(CANONICAL_HEIGHT, y)),
    };
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = CANONICAL_WIDTH * dpr;
    cv.height = CANONICAL_HEIGHT * dpr;
    redraw();

    const onUp = () => {
      const d = draft.current;
      if (!d) return;
      draft.current = null;
      strokes.current.push(d);
      commit();
    };

    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
    };
  }, [commit, redraw]);

  function down(e: React.PointerEvent) {
    const pt = getCanvasPt(e);
    if (!pt) return;

    if (toolRef.current === 'eraser') {
      erase(pt.x, pt.y);
      return;
    }
    draft.current = {
      tool: toolRef.current,
      color: colorRef.current,
      size: sizeRef.current,
      points: [pt],
    };
    redraw();
  }

  function move(e: React.PointerEvent) {
    const pt = getCanvasPt(e);
    if (!pt) return;

    if (toolRef.current === 'eraser') {
      if (e.buttons) erase(pt.x, pt.y);
      return;
    }
    const d = draft.current;
    if (!d) return;
    if (d.tool === 'pen' || d.tool === 'highlighter') {
      d.points.push(pt);
    } else {
      d.points = [d.points[0], pt];
    }
    redraw();
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="ann-canvas"
        style={{
          position: 'absolute',
          inset: 0,
          width: `${CANONICAL_WIDTH}px`,
          height: `${CANONICAL_HEIGHT}px`,
          zIndex: 45,
          pointerEvents: active ? 'auto' : 'none',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
        }}
        onPointerDown={down}
        onPointerMove={move}
      />
      {active && (
        <div
          className="ann-bar"
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 55,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(9, 14, 23, 0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.7)',
          }}
        >
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={'noir-icon-btn' + (tool === t.id ? ' on' : '')}
              data-tip={t.label}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 17, height: 17 }}
                aria-hidden="true"
              >
                <path d={t.path} />
              </svg>
            </button>
          ))}
          <span className="noir-sep" />
          {COLORS.map((c) => (
            <button
              key={c}
              className="noir-icon-btn"
              data-tip="Color"
              aria-label={(COLOR_LABELS[c] ?? 'Color') + ' pen'}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: c,
                border: color === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                padding: 0,
              }}
            />
          ))}
          <span className="noir-sep" />
          {SIZES.map((s, i) => (
            <button
              key={s}
              className={'noir-icon-btn' + (size === s ? ' on' : '')}
              data-tip="Stroke size"
              aria-label={SIZE_LABELS[i]}
              aria-pressed={size === s}
              onClick={() => setSize(s)}
            >
              <span
                style={{
                  width: s + 3,
                  height: s + 3,
                  borderRadius: 999,
                  background: 'currentColor',
                  display: 'block',
                }}
              />
            </button>
          ))}
          <span className="noir-sep" />
          <button
            className="noir-icon-btn"
            data-tip="Undo"
            aria-label="Undo"
            onClick={() => {
              strokes.current = strokes.current.slice(0, -1);
              commit();
            }}
          >
            <IconUndo />
          </button>
          <button
            className="noir-icon-btn"
            data-tip="Clear all"
            aria-label="Clear all"
            onClick={() => {
              strokes.current = [];
              commit();
            }}
          >
            <IconTrash />
          </button>
        </div>
      )}
    </>
  );
}
