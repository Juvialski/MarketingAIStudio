import type { ReactNode } from 'react';
import Reveal from './Reveal';

export default function BigNumber({
  kicker,
  value,
  caption,
  foot,
  titleAlign = 'center',
  bodyAlign = 'center',
}: {
  kicker?: string;
  value: ReactNode;
  caption?: ReactNode;
  foot?: string;
  nav?: string;
  notes?: string;
  titleAlign?: 'left' | 'center' | 'right';
  bodyAlign?: 'left' | 'center' | 'right' | 'justify';
}) {
  const tMargin =
    titleAlign === 'left' ? '0 auto 0 0' : titleAlign === 'right' ? '0 0 0 auto' : 'auto';
  const bMargin =
    bodyAlign === 'left' ? '0 auto 0 0' : bodyAlign === 'right' ? '0 0 0 auto' : 'auto';

  return (
    <div
      className={`slide ${titleAlign === 'center' ? 'center' : ''}`}
      style={{ textAlign: titleAlign }}
    >
      <Reveal>
        {kicker && (
          <div className="kicker" style={{ marginBottom: 16, textAlign: titleAlign }}>
            {kicker}
          </div>
        )}
      </Reveal>
      <Reveal delay={0.08}>
        <div className="figure" style={{ textAlign: titleAlign, marginInline: tMargin }}>
          {value}
        </div>
      </Reveal>
      {caption && (
        <Reveal delay={0.16}>
          <p className="subhead" style={{ marginTop: 12, textAlign: bodyAlign, marginInline: bMargin }}>
            {caption}
          </p>
        </Reveal>
      )}
      {foot && (
        <Reveal delay={0.24}>
          <div className="foot" style={{ marginTop: 'clamp(14px,2.5vh,24px)', textAlign: titleAlign }}>
            {foot}
          </div>
        </Reveal>
      )}
    </div>
  );
}
