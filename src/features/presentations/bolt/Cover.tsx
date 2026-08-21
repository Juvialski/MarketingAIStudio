import type { ReactNode } from 'react';
import Reveal from './Reveal';

export default function Cover({
  kicker,
  title,
  subtitle,
  image,
  foot,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string;
  foot?: string;
  nav?: string;
  notes?: string;
}) {
  return (
    <div className="slide center">
      {image && (
        <>
          <img className="cover-img" src={image} alt="" aria-hidden="true" />
          <div className="cover-scrim" aria-hidden="true" />
        </>
      )}
      <div className="slide-container" style={{ maxWidth: 1280 }}>
        <Reveal>
          {kicker && (
            <div className="kicker" style={{ marginBottom: 8 }}>
              {kicker}
            </div>
          )}
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="display">{title}</h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.16}>
            <p className="subhead" style={{ marginTop: 10 }}>
              {subtitle}
            </p>
          </Reveal>
        )}
        {foot && (
          <Reveal delay={0.24} className="cover-foot">
            <div className="foot">{foot}</div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
