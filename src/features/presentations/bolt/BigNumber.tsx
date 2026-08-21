import type { ReactNode } from 'react';
import Reveal from './Reveal';

export default function BigNumber({
  kicker,
  value,
  caption,
  foot,
}: {
  kicker?: string;
  value: ReactNode;
  caption?: ReactNode;
  foot?: string;
  nav?: string;
  notes?: string;
}) {
  return (
    <div className="slide center">
      <Reveal>
        {kicker && (
          <div className="kicker" style={{ marginBottom: 16 }}>
            {kicker}
          </div>
        )}
      </Reveal>
      <Reveal delay={0.08}>
        <div className="figure">{value}</div>
      </Reveal>
      {caption && (
        <Reveal delay={0.16}>
          <p className="subhead" style={{ marginTop: 12 }}>
            {caption}
          </p>
        </Reveal>
      )}
      {foot && (
        <Reveal delay={0.24}>
          <div className="foot" style={{ marginTop: 'clamp(14px,2.5vh,24px)' }}>
            {foot}
          </div>
        </Reveal>
      )}
    </div>
  );
}
