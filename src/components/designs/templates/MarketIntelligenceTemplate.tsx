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

export const MarketIntelligenceTemplate: React.FC<TemplateProps> = ({
  campaign,
  config,
  brandKit,
  heroImageUrl,
}) => {
  const allMetrics = getAvailableMetrics(campaign);
  const isLandscape = config.aspectRatio === 'landscape';
  const isStory = config.aspectRatio === 'story';

  const rawHeadline = config.headline || campaign.sourceData.title;
  const { text: headline, fontSizePx: headlineSize } = fitHeadline(rawHeadline, config.aspectRatio);
  const subtitle = config.subtitle || campaign.sourceData.targetMarket;
  const badgeText = fitBadgeText(config.customBadgeText || 'MARKET INTELLIGENCE REPORT', 26);
  const contact = fitContactLine(brandKit, config.aspectRatio);
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  const takeawayText =
    campaign.strategy?.coreAngle ||
    campaign.sourceData.property?.investmentThesis ||
    'Submarket fundamentals support disciplined value-add acquisitions with documented spread.';

  if (isLandscape) {
    // 1200x630 Fixed Landscape Layout
    return (
      <div className="relative w-[1200px] h-[630px] bg-[#0b132b] text-slate-100 p-[40px] flex gap-[36px] overflow-hidden select-none font-sans box-border border-8 border-slate-800">
        {/* Left Column: Photo Frame */}
        <div className="w-[460px] h-[534px] relative overflow-hidden border border-slate-800 bg-slate-900/60 shrink-0">
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b132b] via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-cyan-950/90 text-cyan-300 border border-cyan-700 text-[11px] font-mono uppercase tracking-widest">
            {isDemo ? 'FICTIONAL DEMO' : 'SUBMARKET INTEL'}
          </div>
        </div>

        {/* Right Column: Intel & Metrics */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-[14px] font-semibold text-slate-300 tracking-wider truncate">
                {brandKit.companyName.toUpperCase()} • RESEARCH
              </span>
            </div>
            <span
              data-badge="true"
              className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3 py-1 border border-cyan-800 shrink-0"
            >
              {badgeText}
            </span>
          </div>

          {/* Title Area */}
          <div className="my-auto py-2">
            <div className="text-[12px] font-mono text-cyan-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span>●</span> SUBMARKET ANALYSIS // {campaign.sourceData.targetMarket}
            </div>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-bold text-white tracking-tight leading-tight line-clamp-2"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-slate-400 mt-1 font-mono line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Takeaway Card */}
          <div className="p-3 bg-[#1c2541]/60 border border-slate-800 my-2">
            <span className="text-[10px] font-mono uppercase text-cyan-300 block mb-1">
              KEY INVESTMENT TAKEAWAY
            </span>
            <p className="text-[13px] text-slate-300 leading-relaxed font-sans line-clamp-2">
              {takeawayText}
            </p>
          </div>

          {/* Metrics & Footer */}
          <div className="grid grid-cols-2 gap-2.5 my-1">
            {allMetrics.slice(0, 2).map((m) => (
              <div key={m.id} data-metric-card="true" className="p-2.5 bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 block uppercase truncate">{m.label}</span>
                <span className="text-[18px] font-bold font-mono text-cyan-300 truncate mt-0.5">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span data-contact="true">{contact.primaryContact}</span>
            <span className="text-cyan-400 font-semibold">{isDemo ? 'FICTIONAL DEMO' : brandKit.phone}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isStory) {
    // 1080x1920 Story with Safe Zones
    return (
      <div className="relative w-[1080px] h-[1920px] bg-[#0b132b] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-slate-800">
        {/* Top Safe Area Buffer (180px) */}
        <div className="h-[180px] px-[60px] pt-[60px] flex items-end justify-between border-b border-slate-800/80 bg-[#0b132b]">
          <div className="flex items-center gap-2 pb-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="font-mono text-[16px] font-semibold text-slate-300 tracking-wider truncate">
              {brandKit.companyName.toUpperCase()}
            </span>
          </div>
          <span
            data-badge="true"
            className="mb-3 text-[13px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3.5 py-1.5 border border-cyan-800 shrink-0"
          >
            {badgeText}
          </span>
        </div>

        {/* Main Content (Y: 180px to 1660px) */}
        <div className="flex-1 px-[60px] py-[30px] flex flex-col justify-between overflow-hidden">
          <div>
            <div className="text-[15px] font-mono text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span>●</span> {campaign.sourceData.targetMarket}
            </div>
            <h1
              style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
              className="font-bold text-white tracking-tight leading-tight line-clamp-3"
            >
              {headline}
            </h1>
            {subtitle && (
              <p className="text-[18px] text-slate-400 mt-2 font-mono line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Photo Frame */}
          <div className="relative w-full h-[520px] overflow-hidden border border-slate-800 bg-slate-900/60 my-3 shrink-0">
            <img
              src={heroImageUrl}
              alt={headline}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `center ${config.imageCropY}%`,
                transform: `scale(${config.imageZoom})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b132b] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-cyan-950/90 text-cyan-300 border border-cyan-700 text-[13px] font-mono uppercase tracking-wider">
              {isDemo ? 'FICTIONAL DEMO' : 'SUBMARKET INTEL'}
            </div>
          </div>

          {/* Takeaway Card */}
          <div className="p-5 bg-[#1c2541]/70 border border-slate-800 my-2">
            <span className="text-[12px] font-mono uppercase text-cyan-300 block mb-1.5">
              KEY INVESTMENT TAKEAWAY
            </span>
            <p className="text-[16px] text-slate-300 leading-relaxed font-sans line-clamp-3">
              {takeawayText}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 my-2">
            {allMetrics.slice(0, 2).map((m) => (
              <div key={m.id} data-metric-card="true" className="p-4 bg-slate-900 border border-slate-800">
                <span className="text-[12px] font-mono text-slate-400 block uppercase truncate">{m.label}</span>
                <span className="text-[26px] font-bold font-mono text-cyan-300 truncate mt-1">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Safe Area Buffer (250px) */}
        <div className="h-[250px] px-[60px] pt-4 pb-[60px] border-t border-slate-800/80 bg-[#0b132b] flex flex-col justify-between">
          <div data-contact="true" className="flex items-center justify-between text-[14px] font-mono text-slate-400">
            <span>{contact.primaryContact}</span>
            <span className="text-cyan-400 font-bold">{isDemo ? 'FICTIONAL DEMO' : brandKit.phone}</span>
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
      className="relative bg-[#0b132b] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans box-border border-8 border-slate-800"
    >
      {/* Top Header */}
      <div className="px-[50px] pt-[40px] pb-[20px] flex items-center justify-between border-b border-slate-800 bg-[#1c2541]/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="font-mono text-[16px] font-semibold text-slate-300 tracking-wider truncate">
            {brandKit.companyName.toUpperCase()} • RESEARCH
          </span>
        </div>
        <span
          data-badge="true"
          className="text-[13px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3.5 py-1 border border-cyan-800 shrink-0"
        >
          {badgeText}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-[50px] py-[24px] flex flex-col justify-between min-h-0 overflow-hidden">
        <div>
          <div className="text-[12px] font-mono text-cyan-400 uppercase tracking-widest mb-1.5">
            SUBMARKET ANALYSIS // {campaign.sourceData.targetMarket}
          </div>
          <h1
            style={{ fontSize: `${headlineSize}px`, lineHeight: 1.15 }}
            className="font-bold text-white tracking-tight leading-tight line-clamp-2"
          >
            {headline}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-slate-400 mt-1 font-mono line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Photo Frame */}
        <div className={`relative w-full ${isSq ? 'h-[320px]' : 'h-[420px]'} overflow-hidden border border-slate-800 bg-slate-900/60 my-3 shrink-0`}>
          <img
            src={heroImageUrl}
            alt={headline}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `center ${config.imageCropY}%`,
              transform: `scale(${config.imageZoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b132b] via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-cyan-950/90 text-cyan-300 border border-cyan-700 text-[11px] font-mono uppercase tracking-widest">
            {isDemo ? 'FICTIONAL DEMO' : 'SUBMARKET INTEL'}
          </div>
        </div>

        {/* Takeaway Card */}
        <div className="p-4 bg-[#1c2541]/60 border border-slate-800 my-1 shrink-0">
          <span className="text-[10px] font-mono uppercase text-cyan-300 block mb-1">
            KEY INVESTMENT TAKEAWAY
          </span>
          <p className="text-[14px] text-slate-300 leading-relaxed font-sans line-clamp-2">
            {takeawayText}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 my-1 shrink-0">
          {allMetrics.slice(0, 2).map((m) => (
            <div key={m.id} data-metric-card="true" className="p-3 bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 block uppercase truncate">{m.label}</span>
              <span className="text-[20px] font-bold font-mono text-cyan-300 truncate mt-0.5">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[12px] font-mono text-slate-400 shrink-0">
          <span data-contact="true">{contact.primaryContact}</span>
          <span className="text-cyan-400 font-semibold">{isDemo ? 'FICTIONAL DEMO' : brandKit.phone}</span>
        </div>
      </div>
    </div>
  );
};
