import type { ReactNode } from 'react';
import Reveal from './Reveal';

export default function Split({
  kicker,
  title,
  body,
  media,
  flip,
  titleAlign = 'left',
  bodyAlign = 'left',
}: {
  kicker?: string;
  title: ReactNode;
  body?: ReactNode;
  media: ReactNode;
  flip?: boolean;
  nav?: string;
  notes?: string;
  titleAlign?: 'left' | 'center' | 'right';
  bodyAlign?: 'left' | 'center' | 'right' | 'justify';
}) {
  return (
    <div className="slide full">
      <div className={'split' + (flip ? ' flip' : '')}>
        <div className="split-body" style={{ textAlign: titleAlign }}>
          {kicker && (
            <Reveal>
              <div className="kicker" style={{ textAlign: titleAlign }}>{kicker}</div>
            </Reveal>
          )}
          <Reveal delay={0.08}>
            <h2 className="headline" style={{ textAlign: titleAlign }}>{title}</h2>
          </Reveal>
          {body && (
            <Reveal delay={0.16}>
              <div className="lead" style={{ textAlign: bodyAlign }}>{body}</div>
            </Reveal>
          )}
        </div>
        <div className="split-media">{media}</div>
      </div>
    </div>
  );
}
