import type { ReactNode } from 'react';
import Reveal from './Reveal';

export default function Cover({
  kicker,
  title,
  subtitle,
  image,
  foot,
  titleAlign = 'center',
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string;
  foot?: string;
  nav?: string;
  notes?: string;
  titleAlign?: 'left' | 'center' | 'right';
}) {
  const marginInline =
    titleAlign === 'left' ? '0 auto 0 0' : titleAlign === 'right' ? '0 0 0 auto' : 'auto';

  return (
    <div
      className={`slide ${titleAlign === 'center' ? 'center' : ''}`}
      style={{ textAlign: titleAlign }}
    >
      {image && (
        <>
          <img className="cover-img" src={image} alt="" aria-hidden="true" />
          <div className="cover-scrim" aria-hidden="true" />
        </>
      )}
      <div className="slide-container" style={{ maxWidth: 1280, textAlign: titleAlign }}>
        <Reveal>
          {kicker && (
            <div className="kicker" style={{ marginBottom: 8, textAlign: titleAlign }}>
              {kicker}
            </div>
          )}
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="display" style={{ textAlign: titleAlign, marginInline }}>
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.16}>
            <p className="subhead" style={{ marginTop: 10, textAlign: titleAlign, marginInline }}>
              {subtitle}
            </p>
          </Reveal>
        )}
        {foot && (
          <Reveal delay={0.24} className="cover-foot">
            <div className="foot" style={{ textAlign: titleAlign }}>
              {foot}
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
