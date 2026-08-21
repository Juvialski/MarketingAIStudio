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

export const InstitutionalTemplate: React.FC<TemplateProps> = ({
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
  const badgeText = fitBadgeText(config.customBadgeText || 'INVESTMENT MEMO', 26);
  const ctaText = config.customCtaText || brandKit.preferredCta;
  const contact = fitContactLine(brandKit, config.aspectRatio);
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  if (isLandscape) {
    // 1200x630 Fixed Landscape Layout (Horizontal Split)
    return (
      <div className="relative w-[1200px] h-[630px] bg-[#0a1128] text-slate-100 p-[40px] flex gap-[36px] overflow-hidden select-none font-sans box-border border-8 border-slate-900">
        {/* Left Column: Photo Frame */}
        <div className="w-[460px] h-[534px] relative overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/80 text-[11px] font-mono text-slate-300 uppercase tracking-widest">
            {isDemo ? 'FICTIONAL DEMO ASSET' : 'CONFIDENTIAL ASSET FILE'}
          </div>
        </div>

        {/* Right Column: Information & Metrics */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 shrink-0" />
              <span className="font-mono text-[14px] font-bold uppercase tracking-widest text-slate-200 truncate">
                {brandKit.companyName}
              </span>
            </div>
            <span
              data-badge="true"
              className="px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/80 shrink-0"
            >
              {badgeText}
            </span>
          </div>

          {/* Title Area */}
          <div className="my-auto py-2">
            <div className="text-[12px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-2">
              <span className="text-amber-400">●</span> {campaign.sourceData.targetMarket}
            </div>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-extrabold tracking-tight text-white line-clamp-2"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-slate-400 mt-1 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-2.5 my-2">
            {displayedMetrics.map((metric) => (
              <div
                key={metric.id}
                data-metric-card="true"
                className={`p-2.5 border flex flex-col justify-between ${
                  metric.highlight
                    ? 'bg-amber-950/30 border-amber-600/60 text-amber-200'
                    : 'bg-slate-900/90 border-slate-800 text-slate-100'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 truncate">
                  {metric.label}
                </span>
                <span className="text-[18px] font-bold font-mono tracking-tight text-white mt-0.5 truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-4">
            <div data-contact="true" className="min-w-0 flex-1">
              <p className="text-[13px] font-mono font-medium text-amber-400 truncate">
                {ctaText}
              </p>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                {contact.primaryContact}
              </p>
            </div>
            <div
              data-cta="true"
              className="bg-amber-500 text-slate-950 text-[12px] font-bold font-mono px-4 py-2 uppercase tracking-wider shrink-0"
            >
              ACQUIRE BRIEF
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStory) {
    // 1080x1920 Story with Safe Zones (Top 180px / Bottom 250px)
    return (
      <div className="relative w-[1080px] h-[1920px] bg-[#0a1128] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-slate-900">
        {/* Top Safe Area Buffer (180px) */}
        <div className="h-[180px] px-[60px] pt-[60px] flex items-end justify-between border-b border-slate-800/80 bg-[#0f172a]/95">
          <div className="flex items-center gap-3 pb-3">
            <div className="w-3.5 h-3.5 bg-amber-500 shrink-0" />
            <span className="font-mono text-[16px] font-bold uppercase tracking-widest text-slate-200 truncate">
              {brandKit.companyName}
            </span>
          </div>
          <span
            data-badge="true"
            className="mb-3 px-3 py-1.5 text-[13px] font-mono uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/80 shrink-0"
          >
            {badgeText}
          </span>
        </div>

        {/* Story Main Content (Y: 180px to 1660px) */}
        <div className="flex-1 px-[60px] py-[30px] flex flex-col justify-between overflow-hidden">
          {/* Market & Hook */}
          <div>
            <div className="text-[15px] font-mono uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-2">
              <span>●</span> {campaign.sourceData.targetMarket}
            </div>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-extrabold tracking-tight text-white line-clamp-3"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[18px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Photo Frame */}
          <div className="relative w-full h-[580px] overflow-hidden border border-slate-700 bg-slate-950 my-4 shrink-0">
            <img
              src={heroImageUrl}
              alt={headline}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `center ${config.imageCropY}%`,
                transform: `scale(${config.imageZoom})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/80 text-[13px] font-mono text-slate-300 uppercase tracking-wider">
              {isDemo ? 'FICTIONAL DEMO ASSET' : 'CONFIDENTIAL ASSET FILE'}
            </div>
          </div>

          {/* Metric Cards (3 large cards) */}
          <div className="grid grid-cols-3 gap-3 my-2">
            {displayedMetrics.map((metric) => (
              <div
                key={metric.id}
                data-metric-card="true"
                className={`p-4 border flex flex-col justify-between ${
                  metric.highlight
                    ? 'bg-amber-950/30 border-amber-600/60 text-amber-200'
                    : 'bg-slate-900/90 border-slate-800 text-slate-100'
                }`}
              >
                <span className="text-[12px] font-mono uppercase tracking-wider text-slate-400 truncate">
                  {metric.label}
                </span>
                <span className="text-[26px] font-bold font-mono tracking-tight text-white mt-1 truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[12px] text-slate-400 truncate mt-0.5">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Call to Action Bar */}
          <div
            data-cta="true"
            className="bg-amber-500 text-slate-950 text-center py-4 text-[18px] font-bold font-mono uppercase tracking-wider shadow-lg"
          >
            {ctaText} ➔
          </div>
        </div>

        {/* Bottom Safe Area Buffer (250px) */}
        <div className="h-[250px] px-[60px] pt-4 pb-[60px] border-t border-slate-800/80 bg-[#0f172a]/95 flex flex-col justify-between">
          <div data-contact="true" className="flex items-center justify-between text-[14px] font-mono text-slate-400">
            <span>{contact.primaryContact}</span>
            {isDemo && <span className="text-amber-400 font-bold">FICTIONAL DEMO</span>}
          </div>
          {config.showDisclaimer && (
            <p className="text-[11px] font-mono text-slate-500 leading-tight line-clamp-2">
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
      className="relative bg-[#0a1128] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-slate-900"
    >
      {/* Top Header */}
      <div className="px-[50px] pt-[40px] pb-[20px] flex items-center justify-between border-b border-slate-800 bg-[#0f172a]/95 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-amber-500 shrink-0" />
          <span className="font-mono text-[16px] font-bold uppercase tracking-widest text-slate-200 truncate">
            {brandKit.companyName}
          </span>
        </div>
        <span
          data-badge="true"
          className="px-3.5 py-1 text-[13px] font-mono uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/80 shrink-0"
        >
          {badgeText}
        </span>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 px-[50px] py-[24px] flex flex-col justify-between min-h-0 overflow-hidden">
        {/* Title Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-mono uppercase tracking-widest text-slate-400">
              LOCATION:
            </span>
            <span className="text-[12px] font-mono uppercase text-slate-200 bg-slate-800/80 px-2.5 py-0.5">
              {campaign.sourceData.targetMarket}
            </span>
          </div>
          <h1
            style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
            className="font-extrabold tracking-tight text-white line-clamp-2"
          >
            {headline}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-slate-400 mt-1.5 font-normal line-clamp-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Photography Frame */}
        <div className={`relative w-full ${isSq ? 'h-[360px]' : 'h-[460px]'} overflow-hidden border border-slate-700 bg-slate-950 my-3 shrink-0`}>
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 px-2.5 py-0.5 bg-black/80 text-[11px] font-mono text-slate-300 uppercase tracking-wider">
            {isDemo ? 'FICTIONAL DEMO ASSET' : 'CONFIDENTIAL ASSET FILE'}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2.5 my-1">
          {displayedMetrics.map((metric) => (
            <div
              key={metric.id}
              data-metric-card="true"
              className={`p-3 border flex flex-col justify-between ${
                metric.highlight
                  ? 'bg-amber-950/30 border-amber-600/60 text-amber-200'
                  : 'bg-slate-900/90 border-slate-800 text-slate-100'
              }`}
            >
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 truncate">
                {metric.label}
              </span>
              <span className="text-[20px] font-bold font-mono tracking-tight text-white mt-0.5 truncate">
                {metric.value}
              </span>
              {metric.subtext && (
                <span className="text-[11px] text-slate-400 truncate mt-0.5">
                  {metric.subtext}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer with Institutional CTA */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div data-contact="true" className="flex-1 min-w-0">
            <p className="text-[14px] font-mono font-medium text-amber-400 truncate">
              {ctaText}
            </p>
            <p className="text-[12px] font-mono text-slate-400 truncate mt-0.5">
              {contact.primaryContact} {contact.secondaryContact ? `• ${contact.secondaryContact}` : ''}
            </p>
          </div>
          <div
            data-cta="true"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[13px] font-bold font-mono px-5 py-2.5 uppercase tracking-wider shrink-0"
          >
            ACQUIRE BRIEF
          </div>
        </div>

        {/* Disclaimer */}
        {config.showDisclaimer && (
          <p className="text-[10px] font-mono text-slate-500 mt-2 line-clamp-1 shrink-0">
            {isDemo ? 'FICTIONAL DEMO. ' : ''}{brandKit.requiredDisclaimer}
          </p>
        )}
      </div>
    </div>
  );
};
