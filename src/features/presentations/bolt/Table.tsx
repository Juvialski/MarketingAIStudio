import React from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from './useInView';

export type TableColumn =
  | string
  | { label: string; align?: 'left' | 'right' | 'center' };
export type TableCell = string | number | ReactNode;

export default function Table({
  columns,
  rows,
  highlightCol,
  highlightRow,
  caption,
}: {
  columns: TableColumn[];
  rows: TableCell[][];
  highlightCol?: number;
  highlightRow?: number;
  caption?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const reduce = useReducedMotion();

  const align = (c: TableColumn) =>
    typeof c === 'string' ? undefined : c.align;
  const alignStyle = (i: number): React.CSSProperties => {
    const a = align(columns[i]);
    return a ? { textAlign: a } : {};
  };

  return (
    <div ref={ref}>
      <div className="dtable mat">
        <table>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={i === highlightCol ? 'hl-col' : undefined}
                  style={alignStyle(i)}
                >
                  {typeof c === 'string' ? c : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <motion.tr
                key={ri}
                className={ri === highlightRow ? 'hl-row' : undefined}
                initial={reduce ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : undefined}
                transition={{
                  duration: 0.35,
                  delay: 0.06 + ri * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {r.map((cell, ci) => (
                  <td
                    key={ci}
                    className={ci === highlightCol ? 'hl-col' : undefined}
                    style={alignStyle(ci)}
                  >
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <div
          className="foot"
          style={{ maxWidth: 900, marginInline: 'auto', marginTop: 10, textAlign: 'right' }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
