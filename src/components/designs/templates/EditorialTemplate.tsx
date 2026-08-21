import React from 'react';
import { Campaign, GraphicDesignConfig } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { getAvailableMetrics } from '../../../utils/formatters';
import { fitHeadline, fitBadgeText, fitContactLine } from '../../../utils/typographyFitting';

interface TemplateProps {
  campaign: Campaign;
  config: GraphicDesignConfig;
  brandKit: BrandKit;
  heroImageUrl: string;
}

export const EditorialTemplate: React.FC<TemplateProps> = ({
  campaign,
  config,
  brandKit,
  heroImageUrl,
}) => {
  const allMetrics = getAvailableMetrics(campaign);
  const activeMetrics = allMetrics.filter((m) => config.activeMetricIds.includes(m.id));
  const isLandscape = config.aspectRatio === 'landscape';
  const isStory = config.aspectRatio === 'story';
  const isPortrait = config.aspectRatio === 'portrait';

  const maxMetrics = isLandscape ? 3 : isStory ? 3 : isPortrait ? 4 : 4;
  const displayedMetrics = activeMetrics.length > 0 ? activeMetrics.slice(0, maxMetrics) : allMetrics.slice(0, maxMetrics);

  const rawHeadline = config.headline || campaign.sourceData.title;
  const { text: headline, fontSizePx: headlineSize } = fitHeadline(rawHeadline, config.aspectRatio);
  const subtitle = config.subtitle || campaign.sourceData.property?.neighborhood || campaign.sourceData.targetMarket;
  const badgeText = fitBadgeText(config.customBadgeText || 'EXCLUSIVE OPPORTUNITY', 26);
  const ctaText = config.customCtaText || brandKit.preferredCta;
  const contact = fitContactLine(brandKit, config.aspectRatio);
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  if (isLandscape) {
    // 1200x630 Fixed Landscape Layout
    return (
      <div className="relative w-[1200px] h-[630px] bg-[#fdfbf7] text-[#1a1918] p-[40px] flex gap-[36px] overflow-hidden select-none font-sans box-border border-8 border-[#e8e5de]">
        {/* Left Column: Photo Frame with Floating Metric */}
        <div className="w-[460px] h-[534px] relative overflow-hidden border border-[#e8e5de] shadow-sm bg-slate-100 shrink-0">
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-white/95 text-[11px] font-mono text-slate-800 uppercase tracking-widest shadow-sm">
            {isDemo ? 'FICTIONAL DEMO' : 'FEATURED ASSET'}
          </div>
        </div>

        {/* Right Column: Editorial Text & Badges */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e8e5de] pb-3">
            <div className="font-serif font-bold text-[18px] text-slate-900 tracking-tight truncate">
              {brandKit.companyName.toUpperCase()}
            </div>
            <div
              data-badge="true"
              className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#78736b] bg-[#e8e5de]/60 border border-[#e8e5de] shrink-0"
            >
              {badgeText}
            </div>
          </div>

          {/* Title Area */}
          <div className="my-auto py-2">
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-[#c85a32] mb-1 font-mono">
              ● {campaign.sourceData.targetMarket}
            </p>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-serif font-bold text-[#1a1918] tracking-tight line-clamp-2"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-[#78736b] mt-1 font-light line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Metric Chips */}
          <div className="grid grid-cols-3 gap-2.5 my-2">
            {displayedMetrics.map((metric) => (
              <div
                key={metric.id}
                data-metric-card="true"
                className="bg-white border border-[#e8e5de] p-2.5 shadow-sm flex flex-col justify-between"
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium truncate">
                  {metric.label}
                </span>
                <span className="text-[18px] font-bold text-slate-900 font-mono mt-0.5 truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[10px] text-slate-500 truncate mt-0.5">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="pt-3 border-t border-[#e8e5de] flex items-center justify-between gap-4">
            <div data-contact="true" className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900 truncate uppercase tracking-wider">
                {ctaText}
              </p>
              <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                {contact.primaryContact}
              </p>
            </div>
            <div
              data-cta="true"
              className="bg-slate-900 text-white text-[12px] font-semibold px-4 py-2 uppercase tracking-wider shrink-0 shadow-sm"
            >
              INQUIRE
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStory) {
    // 1080x1920 Story with Safe Zones
    return (
      <div className="relative w-[1080px] h-[1920px] bg-[#fdfbf7] text-[#1a1918] flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-[#e8e5de]">
        {/* Top Safe Area Buffer (180px) */}
        <div className="h-[180px] px-[60px] pt-[60px] flex items-end justify-between border-b border-[#e8e5de]/80 bg-[#fdfbf7]/95">
          <div className="font-serif font-bold text-[22px] text-slate-900 tracking-tight pb-3 truncate">
            {brandKit.companyName.toUpperCase()}
          </div>
          <div
            data-badge="true"
            className="mb-3 px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-widest text-[#78736b] bg-[#e8e5de]/60 border border-[#e8e5de] shrink-0"
          >
            {badgeText}
          </div>
        </div>

        {/* Story Main Content (Y: 180px to 1660px) */}
        <div className="flex-1 px-[60px] py-[30px] flex flex-col justify-between overflow-hidden">
          {/* Title Area */}
          <div>
            <p className="text-[15px] uppercase tracking-[0.2em] font-medium text-[#c85a32] mb-2 font-mono">
              ● {campaign.sourceData.targetMarket}
            </p>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-serif font-bold text-[#1a1918] tracking-tight line-clamp-3"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[18px] text-[#78736b] mt-2 font-light line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Hero Photo Block */}
          <div className="relative w-full h-[580px] overflow-hidden border border-[#e8e5de] shadow-sm bg-slate-100 my-4 shrink-0">
            <img
              src={heroImageUrl}
              alt={headline}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `center ${config.imageCropY}%`,
                transform: `scale(${config.imageZoom})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
            <div className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-white/95 text-[13px] font-mono text-slate-800 uppercase tracking-widest shadow-sm">
              {isDemo ? 'FICTIONAL DEMO' : 'FEATURED ASSET'}
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-3 my-2">
            {displayedMetrics.map((metric) => (
              <div
                key={metric.id}
                data-metric-card="true"
                className="bg-white border border-[#e8e5de] p-4 shadow-sm flex flex-col justify-between"
              >
                <span className="text-[12px] uppercase tracking-wider text-slate-500 font-medium truncate">
                  {metric.label}
                </span>
                <span className="text-[26px] font-bold text-slate-900 font-mono mt-1 truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[12px] text-slate-500 truncate mt-0.5">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div
            data-cta="true"
            className="bg-slate-900 text-white text-center py-4 text-[18px] font-semibold uppercase tracking-wider shadow-lg"
          >
            {ctaText} ➔
          </div>
        </div>

        {/* Bottom Safe Area Buffer (250px) */}
        <div className="h-[250px] px-[60px] pt-4 pb-[60px] border-t border-[#e8e5de] bg-[#fdfbf7]/95 flex flex-col justify-between">
          <div data-contact="true" className="flex items-center justify-between text-[14px] font-mono text-slate-600">
            <span>{contact.primaryContact}</span>
            {isDemo && <span className="text-[#c85a32] font-bold">FICTIONAL DEMO</span>}
          </div>
          {config.showDisclaimer && (
            <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
              {brandKit.requiredDisclaimer}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Square (1080x1080) & Portrait (1080x1350)
  const isSq = config.aspectRatio === 'square';
  const widthPx = 1080;
  const heightPx = isSq ? 1080 : 1350;

  return (
    <div
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
      className="relative bg-[#fdfbf7] text-[#1a1918] flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-[#e8e5de]"
    >
      {/* Top Header Bar */}
      <div className="px-[50px] pt-[40px] pb-[20px] flex items-center justify-between border-b border-[#e8e5de] bg-[#fdfbf7]/95 shrink-0">
        <div className="font-serif font-bold text-[20px] text-slate-900 tracking-tight truncate">
          {brandKit.companyName.toUpperCase()}
        </div>
        <div
          data-badge="true"
          className="px-3.5 py-1 text-[13px] font-semibold uppercase tracking-widest text-[#78736b] bg-[#e8e5de]/60 border border-[#e8e5de] shrink-0"
        >
          {badgeText}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-[50px] py-[24px] flex flex-col justify-between min-h-0 overflow-hidden">
        {/* Title and Subtitle */}
        <div>
          <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-[#c85a32] mb-1 font-mono">
            ● {campaign.sourceData.targetMarket}
          </p>
          <h1
            style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
            className="font-serif font-bold text-[#1a1918] tracking-tight line-clamp-2"
          >
            {headline}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-[#78736b] mt-1 font-light line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Hero Image Block */}
        <div className={`relative w-full ${isSq ? 'h-[360px]' : 'h-[460px]'} overflow-hidden border border-[#e8e5de] shadow-sm bg-slate-100 my-3 shrink-0`}>
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/95 text-[11px] font-mono text-slate-800 uppercase tracking-widest shadow-sm">
            {isDemo ? 'FICTIONAL DEMO' : 'FEATURED ASSET'}
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-4 gap-2.5 my-1">
          {displayedMetrics.map((metric) => (
            <div
              key={metric.id}
              data-metric-card="true"
              className="bg-white border border-[#e8e5de] p-3 shadow-sm flex flex-col justify-between"
            >
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium truncate">
                {metric.label}
              </span>
              <span className="text-[20px] font-bold text-slate-900 font-mono mt-0.5 truncate">
                {metric.value}
              </span>
              {metric.subtext && (
                <span className="text-[11px] text-slate-500 truncate mt-0.5">
                  {metric.subtext}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Call to Action and Contact Footer */}
        <div className="pt-3 border-t border-[#e8e5de] flex items-center justify-between gap-4 shrink-0">
          <div data-contact="true" className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate uppercase tracking-wider">
              {ctaText}
            </p>
            <p className="text-[12px] text-slate-500 truncate font-mono mt-0.5">
              {contact.primaryContact} {contact.secondaryContact ? `• ${contact.secondaryContact}` : ''}
            </p>
          </div>
          <div
            data-cta="true"
            className="bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 uppercase tracking-wider shrink-0 shadow-sm"
          >
            INQUIRE
          </div>
        </div>

        {/* Legal Disclaimer */}
        {config.showDisclaimer && (
          <p className="text-[10px] text-slate-400 mt-2 line-clamp-1 shrink-0">
            {isDemo ? 'FICTIONAL DEMO. ' : ''}{brandKit.requiredDisclaimer}
          </p>
        )}
      </div>
    </div>
  );
};
