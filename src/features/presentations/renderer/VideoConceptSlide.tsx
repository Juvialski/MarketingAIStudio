import React from 'react';
import Reveal from '../bolt/Reveal';
import { VideoConceptSlide as VideoConceptSlideType } from '../../../types/presentation';
import { Film, Volume2, Video } from 'lucide-react';

interface VideoConceptSlideProps {
  slide: VideoConceptSlideType;
}

export const VideoConceptSlide: React.FC<VideoConceptSlideProps> = ({ slide }) => {
  return (
    <div className="slide">
      <div className="slide-container" style={{ maxWidth: 1100 }}>
        <Reveal>
          {slide.kicker && (
            <div className="kicker" style={{ marginBottom: 8, textAlign: 'center' }}>
              {slide.kicker}
            </div>
          )}
          <h2
            className="headline"
            style={{ textAlign: 'center', marginInline: 'auto', marginBottom: 6 }}
          >
            {slide.title}
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 'clamp(18px, 2.5vh, 28px)',
            }}
          >
            <span className="chip">
              <Film style={{ width: 12, height: 12 }} />
              9:16 Vertical Reel
            </span>
            <span className="chip">
              ~{slide.durationSeconds}s Duration
            </span>
          </div>
        </Reveal>

        {/* Hook statement */}
        <Reveal delay={0.08}>
          <div
            className="mat"
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 16,
              background: 'rgba(200, 90, 50, 0.08)',
              borderColor: 'rgba(200, 90, 50, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Video style={{ width: 18, height: 18, color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <span className="kicker" style={{ fontSize: 10, display: 'block' }}>Opening Hook (0:00 - 0:03)</span>
              <span style={{ fontSize: 'clamp(13px, 1.3vw, 15px)', fontWeight: 600, color: 'var(--fg)' }}>
                "{slide.hook}"
              </span>
            </div>
          </div>
        </Reveal>

        {/* Scene progression grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            width: '100%',
            marginBottom: 16,
          }}
        >
          {slide.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="mat"
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="chip" style={{ fontSize: 9.5, padding: '2px 8px' }}>
                  Scene {idx + 1}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-faint)' }}>
                  {scene.timeframe}
                </span>
              </div>

              <div>
                <span className="kicker" style={{ fontSize: 9.5 }}>Visual</span>
                <p style={{ fontSize: 12.5, color: 'var(--fg)', lineHeight: 1.35 }}>
                  {scene.visualDirection}
                </p>
              </div>

              <div>
                <span className="kicker" style={{ fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Volume2 style={{ width: 10, height: 10 }} /> Audio
                </span>
                <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic', lineHeight: 1.35 }}>
                  "{scene.spokenAudio}"
                </p>
              </div>

              {scene.onScreenText && (
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--primary)',
                  }}
                >
                  Text: [{scene.onScreenText}]
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Reveal delay={0.16}>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-faint)' }}>
            <strong>Call to Action:</strong> {slide.cta}
          </div>
        </Reveal>
      </div>
    </div>
  );
};
