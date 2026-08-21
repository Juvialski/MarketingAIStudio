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

export const DirectResponseTemplate: React.FC<TemplateProps> = ({
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
  const subtitle = config.subtitle || campaign.sourceData.property?.neighborhood || campaign.sourceData.targetMarket;
  const badgeText = fitBadgeText(config.customBadgeText || 'OFF-MARKET DEAL SPREAD', 26);
  const ctaText = config.customCtaText || 'REQUEST UNDERWRITING PRO FORMA';
  const contact = fitContactLine(brandKit, config.aspectRatio);
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  const spreadMetric = allMetrics.find((m) => m.id === 'spread');
  const purchaseMetric = allMetrics.find((m) => m.id === 'purchase');
  const arvMetric = allMetrics.find((m) => m.id === 'arv');

  if (isLandscape) {
    // 1200x630 Fixed Landscape Layout
    return (
      <div className="relative w-[1200px] h-[630px] bg-slate-950 text-white p-[40px] flex gap-[36px] overflow-hidden select-none font-sans box-border border-8 border-emerald-900/60">
        {/* Left Column: Photo Frame */}
        <div className="w-[460px] h-[534px] relative overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
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
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500 text-slate-950 font-black text-[11px] font-mono uppercase tracking-wider">
            {isDemo ? 'FICTIONAL DEMO' : 'VERIFIED DEAL'}
          </div>
        </div>

        {/* Right Column: Economics & CTA */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-mono text-[14px] font-black uppercase tracking-wider text-emerald-400 truncate">
              {brandKit.companyName}
            </span>
            <span
              data-badge="true"
              className="bg-emerald-950 border border-emerald-500/60 text-emerald-300 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider shrink-0"
            >
              {badgeText}
            </span>
          </div>

          {/* Headline */}
          <div className="my-auto py-2">
            <span className="text-[12px] font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-1">
              📍 {campaign.sourceData.targetMarket}
            </span>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-black tracking-tight leading-tight text-white line-clamp-2"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-slate-400 mt-1 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Spread Highlight Card */}
          {spreadMetric && (
            <div
              data-metric-card="true"
              className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border-2 border-emerald-500/80 p-3.5 flex items-center justify-between my-2"
            >
              <div>
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-bold block">
                  PROJECTED GROSS SPREAD*
                </span>
                <span className="text-[26px] font-black font-mono text-emerald-300 block mt-0.5">
                  {spreadMetric.value}
                </span>
              </div>
              <div className="text-right font-mono">
                <div className="text-[11px] text-slate-400">
                  ENTRY: <span className="text-white font-bold">{purchaseMetric?.value || 'N/A'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ARV: <span className="text-emerald-400 font-bold">{arvMetric?.value || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action CTA */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-4">
            <div data-contact="true" className="min-w-0 flex-1">
              <p className="text-[13px] font-mono font-bold text-white truncate">
                {contact.primaryContact}
              </p>
              <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                {isDemo ? '*Fictional demo spread before holding/selling costs' : '*Before financing & closing costs'}
              </p>
            </div>
            <div
              data-cta="true"
              className="bg-emerald-500 text-slate-950 text-[12px] font-black font-mono px-5 py-2.5 uppercase tracking-wider shrink-0 shadow-lg"
            >
              {ctaText} ➔
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStory) {
    // 1080x1920 Story with Safe Zones
    return (
      <div className="relative w-[1080px] h-[1920px] bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-emerald-900/60">
        {/* Top Safe Area Buffer (180px) */}
        <div className="h-[180px] px-[60px] pt-[60px] flex items-end justify-between border-b border-slate-800/80 bg-slate-950">
          <span className="font-mono text-[16px] font-black uppercase tracking-wider text-emerald-400 pb-3 truncate">
            {brandKit.companyName}
          </span>
          <span
            data-badge="true"
            className="mb-3 bg-emerald-950 border border-emerald-500/60 text-emerald-300 px-3.5 py-1.5 font-mono text-[13px] font-bold uppercase tracking-wider shrink-0"
          >
            {badgeText}
          </span>
        </div>

        {/* Story Main Content (Y: 180px to 1660px) */}
        <div className="flex-1 px-[60px] py-[30px] flex flex-col justify-between overflow-hidden">
          {/* Headline */}
          <div>
            <span className="text-[15px] font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              📍 {campaign.sourceData.targetMarket}
            </span>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-black tracking-tight leading-tight text-white line-clamp-3"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[18px] text-slate-400 mt-2 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Spread Highlight Card */}
          {spreadMetric && (
            <div
              data-metric-card="true"
              className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border-2 border-emerald-500/80 p-5 flex items-center justify-between my-2"
            >
              <div>
                <span className="text-[13px] font-mono text-emerald-400 uppercase tracking-wider font-bold block">
                  PROJECTED GROSS SPREAD*
                </span>
                <span className="text-[36px] font-black font-mono text-emerald-300 block mt-1">
                  {spreadMetric.value}
                </span>
              </div>
              <div className="text-right font-mono">
                <div className="text-[14px] text-slate-400">
                  ENTRY: <span className="text-white font-bold">{purchaseMetric?.value || 'N/A'}</span>
                </div>
                <div className="text-[14px] text-slate-400 mt-1">
                  ARV: <span className="text-emerald-400 font-bold">{arvMetric?.value || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Photo Frame */}
          <div className="relative w-full h-[520px] overflow-hidden border border-slate-800 bg-slate-900 my-2 shrink-0">
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
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500 text-slate-950 font-black text-[13px] font-mono uppercase tracking-wider">
              {isDemo ? 'FICTIONAL DEMO' : 'VERIFIED DEAL'}
            </div>
          </div>

          {/* Bottom Direct CTA */}
          <div
            data-cta="true"
            className="bg-emerald-500 text-slate-950 py-4 text-center font-black text-[18px] uppercase tracking-wider shadow-lg"
          >
            {ctaText} ➔
          </div>
        </div>

        {/* Bottom Safe Area Buffer (250px) */}
        <div className="h-[250px] px-[60px] pt-4 pb-[60px] border-t border-slate-800/80 bg-slate-950 flex flex-col justify-between">
          <div data-contact="true" className="flex items-center justify-between text-[14px] font-mono text-slate-400">
            <span>{contact.primaryContact}</span>
            {isDemo && <span className="text-emerald-400 font-bold">FICTIONAL DEMO</span>}
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
      className="relative bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-emerald-900/60"
    >
      {/* Top Urgent Bar */}
      <div className="px-[50px] pt-[40px] pb-[20px] flex items-center justify-between border-b border-slate-800 bg-slate-950 shrink-0">
        <span className="font-mono text-[16px] font-black uppercase tracking-wider text-emerald-400 truncate">
          {brandKit.companyName}
        </span>
        <span
          data-badge="true"
          className="bg-emerald-950 border border-emerald-500/60 text-emerald-300 px-3.5 py-1 font-mono text-[13px] font-bold uppercase tracking-wider shrink-0"
        >
          {badgeText}
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 px-[50px] py-[24px] flex flex-col justify-between min-h-0 overflow-hidden">
        {/* Headline */}
        <div>
          <span className="text-[12px] font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-1.5">
            📍 {campaign.sourceData.targetMarket}
          </span>
          <h1
            style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
            className="font-black tracking-tight leading-tight text-white line-clamp-2"
          >
            {headline}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-slate-400 mt-1 font-normal line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Spread Highlight Card */}
        {spreadMetric && (
          <div
            data-metric-card="true"
            className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border-2 border-emerald-500/80 p-4 flex items-center justify-between my-2 shrink-0"
          >
            <div>
              <span className="text-[12px] font-mono text-emerald-400 uppercase tracking-wider font-bold block">
                PROJECTED GROSS SPREAD*
              </span>
              <span className="text-[30px] font-black font-mono text-emerald-300 block mt-0.5">
                {spreadMetric.value}
              </span>
            </div>
            <div className="text-right font-mono">
              <div className="text-[12px] text-slate-400">
                ENTRY: <span className="text-white font-bold">{purchaseMetric?.value || 'N/A'}</span>
              </div>
              <div className="text-[12px] text-slate-400 mt-0.5">
                ARV: <span className="text-emerald-400 font-bold">{arvMetric?.value || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Photo + Mini Metrics */}
        <div className={`relative w-full ${isSq ? 'h-[320px]' : 'h-[420px]'} overflow-hidden border border-slate-800 bg-slate-900 my-2 shrink-0`}>
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
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            {displayedMetrics.map((metric) => (
              <div key={metric.id} className="bg-slate-950/90 border border-slate-700 px-3 py-1.5 flex-1 text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase truncate">{metric.label}</span>
                <span className="text-[15px] font-bold text-white font-mono truncate">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Direct CTA */}
        <div
          data-cta="true"
          className="bg-emerald-500 text-slate-950 p-3.5 text-center font-black text-[15px] uppercase tracking-wider shadow-lg shrink-0"
        >
          {ctaText} ➔
        </div>

        {/* Contact Strip & Disclaimer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
          <div data-contact="true">
            <span>{contact.primaryContact}</span>
          </div>
          <div>
            <span>{isDemo ? 'FICTIONAL DEMO' : brandKit.website}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
