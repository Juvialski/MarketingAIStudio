import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from './useInView';

export type TimelineItem = { time: string; title: string; body?: ReactNode };

export default function Timeline({ items }: { items: TimelineItem[] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const reduce = useReducedMotion();

  return (
    <div className="tl" ref={ref}>
      <div className="tl-line">
        <motion.span
          className="tl-line-fill"
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: inView ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="tl-items">
        {items.map((it, i) => (
          <motion.div
            key={i}
            className="tl-item"
            initial={reduce ? false : { opacity: 0, x: -12 }}
            animate={inView ? { opacity: 1, x: 0 } : undefined}
            transition={{
              delay: 0.12 + i * 0.1,
              duration: reduce ? 0 : 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span className="tl-dot" />
            <div className="tl-content">
              <span className="chip tl-time">{it.time}</span>
              <h3>{it.title}</h3>
              {it.body && <p>{it.body}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
