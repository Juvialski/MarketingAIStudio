import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const FictionalDemoBanner: React.FC = () => {
  return (
    <div
      className="fictional-demo-badge"
      aria-label="Demo notice"
      style={{
        position: 'absolute',
        top: 16,
        left: 20,
        zIndex: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <AlertTriangle className="w-3 h-3 text-red-400" />
      <span>Fictional Demo Fixture</span>
    </div>
  );
};
