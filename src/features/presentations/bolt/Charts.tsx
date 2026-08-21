import { useId, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from './useInView';
import { useDeck } from './DeckContext';

export function BarChart({
  data,
  height = 180,
  showValues = true,
}: {
  data: { label: string; value: number }[];
  height?: number;
  showValues?: boolean;
}) {
  const { isStatic } = useDeck();
  const reduce = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const animate = !isStatic && !reduce;
  const max = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className="ch ch-bars" ref={ref} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="ch-col">
          {showValues && (
            <motion.div
              className="ch-val"
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.05 }}
            >
              {d.value.toLocaleString('en-US')}
            </motion.div>
          )}
          <div className="ch-bar-track">
            <motion.span
              className="ch-bar"
              initial={animate ? { height: 0 } : false}
              animate={{ height: inView ? `${(d.value / max) * 100}%` : 0 }}
              transition={{
                duration: 0.6,
                delay: i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </div>
          <div className="ch-x">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  points,
  height = 180,
}: {
  points: number[];
  height?: number;
}) {
  const { isStatic } = useDeck();
  const reduce = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const gid = useId();
  const animate = !isStatic && !reduce;
  const w = 300;
  const h = 120;

  if (points.length < 2) {
    return <div ref={ref} style={{ height }} />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => [
    (i / (points.length - 1)) * w,
    h - ((p - min) / span) * (h - 10) - 5,
  ]);
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div ref={ref} style={{ width: '100%', maxWidth: 640, marginInline: 'auto', position: 'relative' }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={w}
            y1={5 + (h - 10) * f}
            y2={5 + (h - 10) * f}
            stroke="var(--hair-2)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <motion.path
          d={area}
          fill={`url(#${gid})`}
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </div>
  );
}

export function DonutChart({
  value,
  label,
  size = 150,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const { isStatic } = useDeck();
  const reduce = useReducedMotion();
  const { ref, inView } = useInView<SVGSVGElement>(0.3);
  const [shown, setShown] = useState(isStatic ? value : 0);
  const r = 50;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (isStatic || !inView) return;
    if (reduce) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 1000;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isStatic, inView, value, reduce]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg ref={ref} viewBox="0 0 130 130" style={{ width: size, height: size }}>
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="var(--hair)"
          strokeWidth={10}
        />
        <motion.circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          transform="rotate(-90 65 65)"
          initial={isStatic || reduce ? false : { strokeDashoffset: circ }}
          animate={{
            strokeDashoffset: inView ? circ * (1 - value / 100) : circ,
          }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />
        <text
          x="65"
          y="65"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--fg)"
          fontFamily="var(--font-head)"
          fontWeight="700"
          fontSize="22"
        >
          {Math.round(shown)}%
        </text>
      </svg>
      {label && <div className="foot">{label}</div>}
    </div>
  );
}
