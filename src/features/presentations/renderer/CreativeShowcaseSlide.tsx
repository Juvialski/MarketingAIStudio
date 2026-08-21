import React from 'react';
import { Campaign } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { DesignRenderer } from '../../../components/designs/DesignRenderer';
import Reveal from '../bolt/Reveal';
import { CreativeShowcaseSlide as CreativeShowcaseSlideType } from '../../../types/presentation';
import { Layers } from 'lucide-react';

interface CreativeShowcaseSlideProps {
  slide: CreativeShowcaseSlideType;
  campaign?: Campaign;
  brandKit?: BrandKit;
}

const FORMAT_ASPECT_RATIOS: Record<string, string> = {
  square: '1 / 1',
  portrait: '4 / 5',
  story: '9 / 16',
  landscape: '1200 / 628',
};

const FORMAT_LABELS: Record<string, string> = {
  square: '1:1 Social Square',
  portrait: '4:5 Feed Portrait',
  story: '9:16 Story / Reel',
  landscape: '1.91:1 Banner / Web',
};

export const CreativeShowcaseSlide: React.FC<CreativeShowcaseSlideProps> = ({
  slide,
  campaign,
  brandKit,
}) => {
  const formats = slide.previewFormats || ['square', 'portrait', 'story', 'landscape'];

  return (
    <div className="slide center">
      <div className="slide-container" style={{ maxWidth: 1340 }}>
        <Reveal>
          {slide.kicker && (
            <div className="kicker" style={{ marginBottom: 8, textAlign: 'center' }}>
              {slide.kicker}
            </div>
          )}
          <h2
            className="headline"
            style={{ textAlign: 'center', marginInline: 'auto', marginBottom: 8, fontSize: 38 }}
          >
            {slide.title}
          </h2>
          <p
            className="lead"
            style={{
              textAlign: 'center',
              marginInline: 'auto',
              marginBottom: 20,
              fontSize: 17,
              maxWidth: 860,
            }}
          >
            {slide.subtitle || 'Deterministic social graphics and flyers generated in tandem with this investment memorandum.'}
          </p>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {formats.map((fmt) => {
            const aspect = FORMAT_ASPECT_RATIOS[fmt] || '1 / 1';
            return (
              <div
                key={fmt}
                className="mat"
                style={{
                  padding: '10px 8px 8px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--hair-2)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 'clamp(140px, 20vh, 190px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: 4,
                  }}
                >
                  {campaign && brandKit ? (
                    <div
                      style={{
                        height: '100%',
                        aspectRatio: aspect,
                        maxWidth: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DesignRenderer
                        campaign={campaign}
                        aspectRatio={fmt}
                        brandKit={brandKit}
                        className="w-full h-full shadow-md"
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '80%',
                        height: '80%',
                        borderRadius: 6,
                        border: '1px dashed var(--hair)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      {fmt.toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Layers style={{ width: 11, height: 11, color: 'var(--primary)' }} />
                  <span className="kicker" style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
                    {FORMAT_LABELS[fmt] || fmt}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
