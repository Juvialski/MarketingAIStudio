import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from './useInView';

export type CompRow = { label: string; values: (boolean | string)[] };

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
    aria-hidden="true"
  >
    <path d="M5 12.5l4.5 4.5L19 6.5" />
  </svg>
);

const Cross = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.3}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
    aria-hidden="true"
  >
    <path d="M7 7l10 10M17 7L7 17" />
  </svg>
);

export default function Comparison({
  cols,
  rows,
  highlight = 0,
}: {
  cols: string[];
  rows: CompRow[];
  highlight?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const reduce = useReducedMotion();
  const vcols = cols.length - 1;

  return (
    <div
      ref={ref}
      className="cmp mat"
      style={{ '--vcols': vcols } as CSSProperties}
    >
      <div className="cmp-row cmp-head">
        {cols.map((c, i) => (
          <div
            key={i}
            className={'cmp-cell cmp-h' + (i - 1 === highlight ? ' hl' : '')}
          >
            {c}
          </div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <motion.div
          key={ri}
          className="cmp-row"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{
            duration: 0.4,
            delay: 0.08 + ri * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="cmp-cell cmp-label">{r.label}</div>
          {r.values.map((v, vi) => (
            <div
              key={vi}
              className={'cmp-cell' + (vi === highlight ? ' hl' : '')}
            >
              {typeof v === 'boolean' ? (
                <span className={'cmp-chip ' + (v ? 'ok' : 'no')}>
                  {v ? <Check /> : <Cross />}
                </span>
              ) : (
                <span className="cmp-val">{v}</span>
              )}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}
