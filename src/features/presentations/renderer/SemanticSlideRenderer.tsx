import React from 'react';
import { PresentationSlide } from '../../../types/presentation';
import { Campaign } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { resolveFactValue } from '../utils/resolveFactValues';
import Cover from '../bolt/Cover';
import Split from '../bolt/Split';
import Bento, { BentoTile } from '../bolt/Bento';
import StatGrid, { Stat } from '../bolt/StatGrid';
import BigNumber from '../bolt/BigNumber';
import Timeline from '../bolt/Timeline';
import Table from '../bolt/Table';
import Comparison from '../bolt/Comparison';
import Reveal from '../bolt/Reveal';
import Slide from '../bolt/Slide';
import { CreativeShowcaseSlide } from './CreativeShowcaseSlide';
import { VideoConceptSlide } from './VideoConceptSlide';
import { CheckCircle2, AlertCircle, ShieldAlert, Mail, Phone, Globe, Award } from 'lucide-react';

interface SemanticSlideRendererProps {
  slide: PresentationSlide;
  campaign?: Campaign;
  brandKit?: BrandKit;
}

export const SemanticSlideRenderer: React.FC<SemanticSlideRendererProps> = ({
  slide,
  campaign,
  brandKit,
}) => {
  if (slide.isHidden) return null;

  switch (slide.type) {
    case 'cover': {
      const heroImage =
        slide.imageUrl ||
        (slide.imageId && campaign?.sourceData.uploadedImages.find((img) => img.id === slide.imageId)?.url) ||
        campaign?.sourceData.uploadedImages.find((img) => img.isHero)?.url ||
        campaign?.sourceData.uploadedImages[0]?.url;

      return (
        <Cover
          kicker={slide.kicker}
          title={slide.title}
          subtitle={slide.subtitle}
          image={heroImage}
          foot={slide.foot}
          notes={slide.speakerNotes}
          nav={slide.navLabel || 'Cover'}
        />
      );
    }

    case 'executive_summary': {
      return (
        <Slide center nav={slide.navLabel || 'Executive Summary'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 16 }}>{slide.title}</h2>
            <p className="lead" style={{ marginInline: 'auto', marginBottom: 32 }}>
              {slide.summary}
            </p>
          </Reveal>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
              width: '100%',
              maxWidth: 1340,
              marginInline: 'auto',
              textAlign: 'left',
            }}
          >
            {slide.highlights.map((h, i) => (
              <div
                key={i}
                className="mat"
                style={{
                  padding: '20px 24px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <CheckCircle2 style={{ width: 22, height: 22, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 16, color: 'var(--fg)', lineHeight: 1.45 }}>
                  {h}
                </span>
              </div>
            ))}
          </div>
        </Slide>
      );
    }

    case 'property_overview': {
      const propertyImage =
        slide.imageUrl ||
        (slide.imageId && campaign?.sourceData.uploadedImages.find((img) => img.id === slide.imageId)?.url) ||
        campaign?.sourceData.uploadedImages[0]?.url;

      const tiles: BentoTile[] = [
        {
          k: 'Location & Address',
          title: `${slide.address}, ${slide.city}, ${slide.state} ${slide.zipCode || ''}`.trim(),
          body: `Asset Type: ${slide.propertyType.replace(/_/g, ' ').toUpperCase()}`,
          c: 6,
          r: 1,
        },
        {
          k: 'Configuration',
          fig: slide.bedrooms && slide.bathrooms ? `${slide.bedrooms} Bed / ${slide.bathrooms} Bath` : undefined,
          title: slide.squareFeet ? `${slide.squareFeet.toLocaleString()} SF` : undefined,
          body: slide.yearBuilt ? `Built in ${slide.yearBuilt}` : undefined,
          c: 6,
          r: 1,
        },
        ...(propertyImage
          ? [
              {
                img: propertyImage,
                k: 'Property Photo',
                c: 6,
                r: 1,
              } as BentoTile,
            ]
          : []),
        {
          k: 'Property Highlights',
          body: slide.highlights.join(' • '),
          c: propertyImage ? 6 : 12,
          r: 1,
        },
      ];

      return (
        <Bento
          kicker={slide.kicker || 'Property Snapshot'}
          title={slide.title}
          tiles={tiles}
          nav={slide.navLabel || 'Property'}
          notes={slide.speakerNotes}
        />
      );
    }

    case 'investment_thesis': {
      return (
        <Slide center nav={slide.navLabel || 'Investment Thesis'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 16 }}>{slide.title}</h2>
            <p className="lead" style={{ marginInline: 'auto', marginBottom: 36 }}>
              {slide.thesis}
            </p>
          </Reveal>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 18,
              width: '100%',
              maxWidth: 1340,
              marginInline: 'auto',
            }}
          >
            {slide.pillars.map((pillar, i) => (
              <div
                key={i}
                className="mat"
                style={{
                  padding: '24px 26px',
                  borderRadius: 'var(--radius)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="tick" />
                <span className="kicker" style={{ fontSize: 12 }}>Pillar 0{i + 1}</span>
                <p style={{ fontSize: 16, color: 'var(--fg)', lineHeight: 1.5 }}>
                  {pillar}
                </p>
              </div>
            ))}
          </div>
        </Slide>
      );
    }

    case 'stat_grid': {
      const stats: Stat[] = slide.stats
        .map((s): Stat | null => {
          let val = s.value;
          if (s.factKey && campaign) {
            const resolved = resolveFactValue(s.factKey, campaign);
            if (resolved) {
              val = resolved;
            } else {
              return null;
            }
          }
          return {
            label: s.label,
            value: val,
            caption: s.caption,
          };
        })
        .filter((s): s is Stat => s !== null);

      return (
        <StatGrid
          kicker={slide.kicker}
          title={slide.title}
          stats={stats}
          nav={slide.navLabel || 'Metrics'}
          notes={slide.speakerNotes}
        />
      );
    }

    case 'big_number': {
      let val = slide.value;
      if (slide.factKey && campaign) {
        const resolved = resolveFactValue(slide.factKey, campaign);
        if (resolved) val = resolved;
      }

      return (
        <BigNumber
          kicker={slide.kicker}
          value={val}
          caption={slide.caption}
          foot={slide.foot}
          nav={slide.navLabel || 'Key Number'}
          notes={slide.speakerNotes}
        />
      );
    }

    case 'financial_snapshot': {
      const metrics = slide.metrics
        .map((m) => {
          let val = m.value;
          if (m.factKey && campaign) {
            const resolved = resolveFactValue(m.factKey, campaign);
            if (resolved) {
              val = resolved;
            } else {
              return null;
            }
          }
          return { ...m, value: val };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      return (
        <Slide center nav={slide.navLabel || 'Financials'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 'clamp(20px, 3vh, 34px)' }}>
              {slide.title}
            </h2>
          </Reveal>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              width: '100%',
              maxWidth: 1050,
              marginInline: 'auto',
              marginBottom: 20,
            }}
          >
            {metrics.map((m, idx) => (
              <div
                key={idx}
                className="mat"
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius)',
                  textAlign: 'left',
                  border: m.highlight ? '1px solid var(--primary)' : undefined,
                  background: m.highlight ? 'rgba(200, 90, 50, 0.08)' : undefined,
                }}
              >
                <div className="tick" style={{ marginBottom: 8 }} />
                <div className="stat-value" style={{ fontSize: 'clamp(24px, 3vw, 38px)' }}>
                  {m.value}
                </div>
                <div className="stat-label" style={{ fontSize: 13, marginTop: 4 }}>
                  {m.label}
                </div>
                {m.subtext && <div className="stat-caption" style={{ marginTop: 2 }}>{m.subtext}</div>}
              </div>
            ))}
          </div>

          {slide.disclosures && slide.disclosures.length > 0 && (
            <div
              className="foot"
              style={{ maxWidth: 850, marginInline: 'auto', textAlign: 'center', opacity: 0.8 }}
            >
              {slide.disclosures.join(' ')}
            </div>
          )}
        </Slide>
      );
    }

    case 'market_context': {
      return (
        <Slide nav={slide.navLabel || 'Market Context'} notes={slide.speakerNotes}>
          <div className="slide-container" style={{ maxWidth: 1050 }}>
            <Reveal>
              {slide.kicker && <div className="kicker" style={{ marginBottom: 8 }}>{slide.kicker}</div>}
              <h2 className="headline" style={{ marginBottom: 8 }}>{slide.title}</h2>
              <div className="chip" style={{ marginBottom: 20 }}>Submarket: {slide.submarket}</div>
            </Reveal>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: slide.comps && slide.comps.length > 0 ? '1fr 1fr' : '1fr',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="kicker">Market Dynamics & Drivers</span>
                {slide.insights.map((ins, i) => (
                  <div key={i} className="mat" style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: 'clamp(13px, 1.3vw, 15px)', color: 'var(--fg)', lineHeight: 1.4 }}>
                      {ins}
                    </p>
                  </div>
                ))}
              </div>

              {slide.comps && slide.comps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="kicker">Recent Submarket Comparables</span>
                  <Table
                    columns={['Address', 'Sale Price', 'Notes']}
                    rows={slide.comps.map((c) => [c.address, c.price, c.notes || '—'])}
                  />
                </div>
              )}
            </div>
          </div>
        </Slide>
      );
    }

    case 'timeline': {
      return (
        <Slide center nav={slide.navLabel || 'Timeline'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 'clamp(24px, 3.5vh, 40px)' }}>
              {slide.title}
            </h2>
          </Reveal>
          <Timeline items={slide.items} />
        </Slide>
      );
    }

    case 'gallery': {
      if (slide.layout === 'split' && slide.items[0]) {
        const item = slide.items[0];
        return (
          <Split
            kicker={slide.kicker || 'Property Gallery'}
            title={slide.title}
            body={item.caption || item.title}
            media={<img src={item.imageUrl} alt={item.title || 'Property view'} />}
            nav={slide.navLabel || 'Gallery'}
            notes={slide.speakerNotes}
          />
        );
      }

      const tiles: BentoTile[] = slide.items.map((it) => ({
        img: it.imageUrl,
        k: it.title,
        body: it.caption,
        c: it.span || 4,
        r: 1,
      }));

      return (
        <Bento
          kicker={slide.kicker || 'Property Gallery'}
          title={slide.title}
          tiles={tiles}
          nav={slide.navLabel || 'Gallery'}
          notes={slide.speakerNotes}
        />
      );
    }

    case 'target_audience': {
      return (
        <Slide center nav={slide.navLabel || 'Target Audience'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 10 }}>{slide.title}</h2>
            <div className="chip" style={{ marginBottom: 16 }}>{slide.audienceName}</div>
            <p className="lead" style={{ marginInline: 'auto', marginBottom: 24, fontSize: 'clamp(14px, 1.4vw, 18px)' }}>
              {slide.description}
            </p>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              width: '100%',
              maxWidth: 960,
              marginInline: 'auto',
              textAlign: 'left',
            }}
          >
            <div className="mat" style={{ padding: '20px 22px', borderRadius: 'var(--radius)' }}>
              <span className="kicker" style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle style={{ width: 14, height: 14 }} /> Pain Points Addressed
              </span>
              <ul style={{ margin: '12px 0 0 0', paddingLeft: 18, fontSize: 13.5, color: 'var(--fg-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slide.painPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="mat" style={{ padding: '20px 22px', borderRadius: 'var(--radius)' }}>
              <span className="kicker" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Core Motivations
              </span>
              <ul style={{ margin: '12px 0 0 0', paddingLeft: 18, fontSize: 13.5, color: 'var(--fg-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slide.motivations.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </Slide>
      );
    }

    case 'marketing_strategy': {
      return (
        <Slide center nav={slide.navLabel || 'Marketing Strategy'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 12 }}>{slide.title}</h2>
            <p className="lead" style={{ marginInline: 'auto', marginBottom: 24, fontSize: 'clamp(15px, 1.5vw, 20px)' }}>
              "{slide.coreAngle}"
            </p>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
              width: '100%',
              maxWidth: 960,
              marginInline: 'auto',
              textAlign: 'left',
              marginBottom: 20,
            }}
          >
            {slide.hooks.map((h, i) => (
              <div key={i} className="mat" style={{ padding: '16px 18px', borderRadius: 'var(--radius-sm)' }}>
                <span className="kicker" style={{ fontSize: 10 }}>Core Hook {i + 1}</span>
                <p style={{ fontSize: 14, color: 'var(--fg)', marginTop: 4 }}>{h}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {slide.platforms.map((p, i) => (
              <span key={i} className="chip" style={{ textTransform: 'capitalize' }}>
                {p.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </Slide>
      );
    }

    case 'creative_showcase': {
      return (
        <CreativeShowcaseSlide
          slide={slide}
          campaign={campaign}
          brandKit={brandKit}
        />
      );
    }

    case 'video_concept': {
      return <VideoConceptSlide slide={slide} />;
    }

    case 'comparison': {
      return (
        <Slide center nav={slide.navLabel || 'Comparison'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 24 }}>{slide.title}</h2>
          </Reveal>
          <div style={{ width: '100%', maxWidth: 1280, marginInline: 'auto' }}>
            <Comparison
              cols={['Metric / Feature', slide.headers[0], slide.headers[1]]}
              rows={slide.rows.map((r) => ({ label: r.label, values: [r.current, r.projected] }))}
              highlight={1}
            />
          </div>
        </Slide>
      );
    }

    case 'table': {
      return (
        <Slide center nav={slide.navLabel || 'Data'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 24 }}>{slide.title}</h2>
          </Reveal>
          <Table
            columns={slide.columns}
            rows={slide.rows}
            caption={slide.caption}
            highlightCol={slide.highlightCol}
            highlightRow={slide.highlightRow}
          />
        </Slide>
      );
    }

    case 'risk_disclaimer': {
      return (
        <Slide center nav={slide.navLabel || 'Disclosures'} notes={slide.speakerNotes}>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#f5b73a', marginBottom: 14 }}>
              <ShieldAlert style={{ width: 28, height: 28 }} />
              <span className="kicker" style={{ color: '#f5b73a', fontSize: 14 }}>Legal & Underwriting Disclosures</span>
            </div>
            <h2 className="headline" style={{ marginInline: 'auto', marginBottom: 24, fontSize: 38 }}>{slide.title}</h2>
          </Reveal>

          <div
            className="mat"
            style={{
              padding: '36px 42px',
              borderRadius: 'var(--radius)',
              width: '100%',
              maxWidth: 1340,
              marginInline: 'auto',
              textAlign: 'left',
              background: 'rgba(245, 183, 58, 0.05)',
              borderColor: 'rgba(245, 183, 58, 0.25)',
            }}
          >
            <p style={{ fontSize: 17.5, color: 'var(--fg)', lineHeight: 1.65 }}>
              {slide.disclaimerText}
            </p>

            {slide.additionalCaveats && slide.additionalCaveats.length > 0 && (
              <ul style={{ margin: '18px 0 0 0', paddingLeft: 22, fontSize: 15, color: 'var(--fg-muted)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {slide.additionalCaveats.map((c, idx) => (
                  <li key={idx} style={{ lineHeight: 1.5 }}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </Slide>
      );
    }

    case 'next_steps': {
      return (
        <Slide center nav={slide.navLabel || 'Next Steps'} notes={slide.speakerNotes}>
          <Reveal>
            {slide.kicker && <div className="kicker" style={{ marginBottom: 10 }}>{slide.kicker}</div>}
            <h1 className="display" style={{ marginInline: 'auto', marginBottom: 16 }}>{slide.title}</h1>
            <p className="lead" style={{ marginInline: 'auto', marginBottom: 36 }}>
              {slide.ctaText}
            </p>
          </Reveal>

          <div
            className="mat"
            style={{
              padding: '28px 44px',
              borderRadius: 'var(--radius)',
              display: 'inline-flex',
              flexDirection: 'column',
              gap: 14,
              textAlign: 'center',
              minWidth: 600,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--fg)' }}>
              {slide.contactInfo.company}
            </div>
            {slide.contactInfo.name && (
              <div style={{ fontSize: 16, color: 'var(--fg-muted)' }}>
                Presented by: {slide.contactInfo.name}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                marginTop: 8,
                fontSize: 14,
                color: 'var(--primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {slide.contactInfo.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Mail style={{ width: 15, height: 15 }} /> {slide.contactInfo.email}
                </span>
              )}
              {slide.contactInfo.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Phone style={{ width: 15, height: 15 }} /> {slide.contactInfo.phone}
                </span>
              )}
              {slide.contactInfo.website && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Globe style={{ width: 15, height: 15 }} /> {slide.contactInfo.website}
                </span>
              )}
            </div>

            {slide.contactInfo.licenseNumber && (
              <div className="foot" style={{ marginTop: 8, opacity: 0.75 }}>
                <Award style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
                {slide.contactInfo.licenseNumber}
              </div>
            )}
          </div>
        </Slide>
      );
    }

    default:
      return null;
  }
};
