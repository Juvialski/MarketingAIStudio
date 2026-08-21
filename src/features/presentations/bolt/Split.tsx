import type { ReactNode } from 'react';
import Reveal from './Reveal';

export default function Split({
  kicker,
  title,
  body,
  media,
  flip,
}: {
  kicker?: string;
  title: ReactNode;
  body?: ReactNode;
  media: ReactNode;
  flip?: boolean;
  nav?: string;
  notes?: string;
}) {
  return (
    <div className="slide full">
      <div className={'split' + (flip ? ' flip' : '')}>
        <div className="split-body">
          {kicker && (
            <Reveal>
              <div className="kicker">{kicker}</div>
            </Reveal>
          )}
          <Reveal delay={0.08}>
            <h2 className="headline">{title}</h2>
          </Reveal>
          {body && (
            <Reveal delay={0.16}>
              <div className="lead">{body}</div>
            </Reveal>
          )}
        </div>
        <div className="split-media">{media}</div>
      </div>
    </div>
  );
}
