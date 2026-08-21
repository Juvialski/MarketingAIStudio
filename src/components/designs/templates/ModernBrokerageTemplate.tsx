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

export const ModernBrokerageTemplate: React.FC<TemplateProps> = ({
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

  const maxMetrics = isLandscape ? 3 : isStory ? 3 : isPortrait ? 3 : 3;
  const displayedMetrics = activeMetrics.length > 0 ? activeMetrics.slice(0, maxMetrics) : allMetrics.slice(0, maxMetrics);

  const rawHeadline = config.headline || campaign.sourceData.title;
  const { text: headline, fontSizePx: headlineSize } = fitHeadline(rawHeadline, config.aspectRatio);
  const subtitle = config.subtitle || campaign.sourceData.targetMarket;
  const badgeText = fitBadgeText(config.customBadgeText || 'JUST UNDERWRITTEN', 26);
  const ctaText = config.customCtaText || brandKit.preferredCta;
  const contact = fitContactLine(brandKit, config.aspectRatio);
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  if (isLandscape) {
    // 1200x630 Fixed Landscape Layout
    return (
      <div className="relative w-[1200px] h-[630px] bg-zinc-950 text-white p-[40px] flex gap-[36px] overflow-hidden select-none font-sans box-border border-8 border-zinc-900">
        {/* Background photo on left */}
        <div className="w-[460px] h-[534px] relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shrink-0">
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500 text-zinc-950 font-bold text-[11px] uppercase tracking-wider rounded-md">
            {isDemo ? 'FICTIONAL DEMO' : 'FEATURED LISTING'}
          </div>
        </div>

        {/* Right Column Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="font-extrabold text-[16px] text-white tracking-tight truncate">
              {brandKit.companyName}
            </span>
            <span
              data-badge="true"
              className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 shrink-0"
            >
              {badgeText}
            </span>
          </div>

          {/* Title Block */}
          <div className="my-auto py-2">
            <div className="text-[12px] font-semibold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span>●</span> {campaign.sourceData.targetMarket}
            </div>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-black tracking-tight leading-tight text-white line-clamp-2"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-zinc-300 mt-1 font-medium line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Metric Pills */}
          <div className="grid grid-cols-3 gap-2.5 my-2">
            {displayedMetrics.map((metric) => (
              <div
                key={metric.id}
                data-metric-card="true"
                className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 flex flex-col justify-between"
              >
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold truncate">
                  {metric.label}
                </span>
                <span className="text-[18px] font-extrabold text-white font-mono mt-0.5 truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* CTA Footer */}
          <div className="border-t border-zinc-800 pt-3 flex items-center justify-between gap-4">
            <div data-contact="true" className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-zinc-200 truncate">
                {ctaText}
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {contact.primaryContact}
              </p>
            </div>
            <div
              data-cta="true"
              className="bg-white text-zinc-950 font-bold text-[12px] px-4 py-2 rounded-md uppercase tracking-wider shrink-0 shadow-md"
            >
              VIEW DETAILS
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStory) {
    // 1080x1920 Story with Safe Zones
    return (
      <div className="relative w-[1080px] h-[1920px] bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-zinc-900">
        {/* Top Safe Area Buffer (180px) */}
        <div className="h-[180px] px-[60px] pt-[60px] flex items-end justify-between border-b border-zinc-800/80 bg-zinc-950">
          <span className="font-extrabold text-[20px] text-white tracking-tight pb-3 truncate">
            {brandKit.companyName}
          </span>
          <span
            data-badge="true"
            className="mb-3 px-3.5 py-1.5 rounded-full text-[13px] font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 shadow-md shrink-0"
          >
            {badgeText}
          </span>
        </div>

        {/* Story Main Content (Y: 180px to 1660px) */}
        <div className="flex-1 px-[60px] py-[30px] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-emerald-400 uppercase tracking-widest mb-2">
              <span>●</span> {campaign.sourceData.targetMarket}
            </div>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-black tracking-tight text-white leading-tight line-clamp-3"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[18px] text-zinc-300 font-medium mt-2 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Photo Frame */}
          <div className="relative w-full h-[580px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 my-4 shrink-0">
            <img
              src={heroImageUrl}
              alt={headline}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `center ${config.imageCropY}%`,
                transform: `scale(${config.imageZoom})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-emerald-500 text-zinc-950 font-bold text-[13px] uppercase tracking-wider rounded-md">
              {isDemo ? 'FICTIONAL DEMO' : 'FEATURED ASSET'}
            </div>
          </div>

          {/* Metric Pills */}
          <div className="grid grid-cols-3 gap-3 my-2">
            {displayedMetrics.map((metric) => (
              <div
                key={metric.id}
                data-metric-card="true"
                className="bg-zinc-900/95 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between"
              >
                <span className="text-[12px] uppercase tracking-wider text-zinc-400 font-semibold truncate">
                  {metric.label}
                </span>
                <span className="text-[26px] font-extrabold text-white font-mono mt-1 truncate">
                  {metric.value}
                </span>
                {metric.subtext && (
                  <span className="text-[12px] text-zinc-400 truncate mt-0.5">
                    {metric.subtext}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* CTA Banner */}
          <div
            data-cta="true"
            className="bg-white text-zinc-950 font-black text-center py-4 text-[18px] rounded-xl uppercase tracking-wider shadow-lg"
          >
            {ctaText} ➔
          </div>
        </div>

        {/* Bottom Safe Area Buffer (250px) */}
        <div className="h-[250px] px-[60px] pt-4 pb-[60px] border-t border-zinc-800/80 bg-zinc-950 flex flex-col justify-between">
          <div data-contact="true" className="flex items-center justify-between text-[14px] font-mono text-zinc-400">
            <span>{contact.primaryContact}</span>
            {isDemo && <span className="text-emerald-400 font-bold">FICTIONAL DEMO</span>}
          </div>
          {config.showDisclaimer && (
            <p className="text-[11px] text-zinc-500 leading-tight line-clamp-2">
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
      className="relative bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-zinc-900"
    >
      {/* Top Header */}
      <div className="px-[50px] pt-[40px] pb-[20px] flex items-center justify-between border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="font-extrabold text-[18px] text-white tracking-tight truncate">
          {brandKit.companyName}
        </span>
        <span
          data-badge="true"
          className="px-3.5 py-1 rounded-full text-[13px] font-bold uppercase tracking-wider bg-emerald-500 text-zinc-950 shadow-md shrink-0"
        >
          {badgeText}
        </span>
      </div>

      {/* Center Content */}
      <div className="flex-1 px-[50px] py-[24px] flex flex-col justify-between min-h-0 overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">
            <span>●</span> {campaign.sourceData.targetMarket}
          </div>
          <h1
            style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
            className="font-black tracking-tight text-white leading-tight line-clamp-2"
          >
            {headline}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-zinc-300 font-medium mt-1 line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Photo Block */}
        <div className={`relative w-full ${isSq ? 'h-[360px]' : 'h-[460px]'} rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 my-3 shrink-0`}>
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-emerald-500 text-zinc-950 font-bold text-[11px] uppercase tracking-wider rounded-md">
            {isDemo ? 'FICTIONAL DEMO' : 'FEATURED ASSET'}
          </div>
        </div>

        {/* Metric Pills */}
        <div className="grid grid-cols-3 gap-2.5 my-1">
          {displayedMetrics.map((metric) => (
            <div
              key={metric.id}
              data-metric-card="true"
              className="bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 flex flex-col justify-between"
            >
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold truncate">
                {metric.label}
              </span>
              <span className="text-[20px] font-extrabold text-white font-mono mt-0.5 truncate">
                {metric.value}
              </span>
              {metric.subtext && (
                <span className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {metric.subtext}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* CTA Bar */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div data-contact="true" className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-zinc-200 truncate">
              {ctaText}
            </p>
            <p className="text-[12px] text-zinc-400 truncate mt-0.5 font-mono">
              {contact.primaryContact} {contact.secondaryContact ? `• ${contact.secondaryContact}` : ''}
            </p>
          </div>
          <div
            data-cta="true"
            className="bg-white text-zinc-950 font-bold text-[13px] px-5 py-2.5 rounded-md uppercase tracking-wider shrink-0 shadow-md"
          >
            VIEW DETAILS
          </div>
        </div>

        {/* Disclaimer */}
        {config.showDisclaimer && (
          <p className="text-[10px] text-zinc-500 mt-2 line-clamp-1 shrink-0">
            {isDemo ? 'FICTIONAL DEMO. ' : ''}{brandKit.requiredDisclaimer}
          </p>
        )}
      </div>
    </div>
  );
};
