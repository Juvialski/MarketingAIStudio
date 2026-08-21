import type { ReactNode } from 'react';

const Arrow = ({ back }: { back?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 12, height: 12 }}
    aria-hidden="true"
  >
    {back ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
  </svg>
);

const Lock = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 11, height: 11 }}
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2.2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export default function BrowserFrame({
  url = 'zawmarketing.com',
  children,
}: {
  url?: string;
  children: ReactNode;
}) {
  return (
    <div className="bf mat">
      <div className="bf-bar">
        <span className="bf-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="bf-nav" style={{ display: 'inline-flex', gap: 4, opacity: 0.5 }}>
          <Arrow back />
          <Arrow />
        </span>
        <span className="bf-url">
          <Lock />
          {url}
        </span>
        <span style={{ width: 44, flexShrink: 0 }} aria-hidden="true" />
      </div>
      <div className="bf-body">{children}</div>
    </div>
  );
}
