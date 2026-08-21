import React from 'react';
import { Campaign, GraphicDesignConfig } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { getAvailableMetrics, formatPropertyType, formatNumber } from '../../../utils/formatters';

interface FlyerTemplateProps {
  campaign: Campaign;
  config: GraphicDesignConfig;
  brandKit: BrandKit;
  heroImageUrl: string;
}

export const FlyerTemplate: React.FC<FlyerTemplateProps> = ({
  campaign,
  config,
  brandKit,
  heroImageUrl,
}) => {
  const prop = campaign.sourceData.property;
  const allMetrics = getAvailableMetrics(campaign);
  const selectedMetrics = allMetrics.filter((metric) => config.activeMetricIds.includes(metric.id));
  const metrics = (selectedMetrics.length > 0 ? selectedMetrics : allMetrics).slice(0, 6);
  
  const images = campaign.sourceData.uploadedImages || [];
  // Filter out any image identical to hero to avoid duplicate photos
  const secondaryImages = images.filter((img) => img.url !== heroImageUrl && img.id !== config.imageId);
  const isDemo = campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional') || campaign.id.includes('sample');

  const isA4 = config.aspectRatio === 'flyer_a4';
  const widthPx = isA4 ? 1240 : 1275;
  const heightPx = isA4 ? 1754 : 1650;

  return (
    <div
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
      className="relative bg-white text-slate-900 p-[48px] flex flex-col justify-between select-none font-sans box-border overflow-hidden border-8 border-slate-900"
    >
      {/* 1. Header & Institutional Branding */}
      <div className="pb-4 border-b-4 border-slate-900 flex items-end justify-between gap-6 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-amber-600 shrink-0" />
            <h2 className="text-[20px] font-mono font-black tracking-widest text-slate-900 uppercase truncate">
              {brandKit.companyName}
            </h2>
          </div>
          <h1 className="text-[34px] font-serif font-bold text-slate-900 tracking-tight mt-1.5 line-clamp-2">
            {campaign.sourceData.title || prop?.address || 'Investment Memorandum'}
          </h1>
          <p className="text-[16px] text-slate-600 font-medium mt-1 truncate">
            {prop ? `${prop.address}, ${prop.city}, ${prop.state} ${prop.zipCode || ''}` : campaign.sourceData.targetMarket}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span
            data-badge="true"
            className="inline-block px-4 py-1.5 bg-slate-900 text-white font-mono text-[13px] font-bold uppercase tracking-widest"
          >
            {config.customBadgeText || (isDemo ? 'FICTIONAL DEMO' : 'CONFIDENTIAL BRIEF')}
          </span>
          <p className="text-[13px] font-mono text-slate-500 mt-1.5">
            DATE: {new Date(campaign.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 2. Adaptive Photo Gallery (Hero only, Hero+1, or Hero+2) */}
      <div className="my-3 shrink-0">
        {secondaryImages.length === 0 ? (
          // 1 Image: Full Width Hero Frame
          <div className="relative w-full h-[400px] overflow-hidden border-2 border-slate-300 bg-slate-100">
            <img
              src={heroImageUrl}
              alt="Primary Property Elevation"
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${config.imageCropY}%` }}
            />
            <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 text-white text-[12px] font-mono uppercase tracking-wider">
              {isDemo ? 'FICTIONAL DEMO ELEVATION' : 'PRIMARY ELEVATION'}
            </div>
          </div>
        ) : secondaryImages.length === 1 ? (
          // 2 Images: Hero (65%) + Secondary (35%)
          <div className="grid grid-cols-[1.85fr_1fr] gap-3 h-[400px]">
            <div className="relative overflow-hidden border-2 border-slate-300 bg-slate-100">
              <img
                src={heroImageUrl}
                alt="Primary Property Elevation"
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${config.imageCropY}%` }}
              />
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 text-white text-[12px] font-mono uppercase tracking-wider">
                {isDemo ? 'FICTIONAL DEMO ELEVATION' : 'PRIMARY ELEVATION'}
              </div>
            </div>
            <div className="relative overflow-hidden border-2 border-slate-300 bg-slate-100">
              <img
                src={secondaryImages[0].url}
                alt={secondaryImages[0].name || 'Secondary Property View'}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 px-2.5 py-0.5 bg-black/75 text-white text-[11px] font-mono uppercase">
                INTERIOR / CONTEXT
              </div>
            </div>
          </div>
        ) : (
          // 3+ Images: Hero (65%) + 2 Stacked Secondary (35%)
          <div className="grid grid-cols-[1.85fr_1fr] gap-3 h-[400px]">
            <div className="relative overflow-hidden border-2 border-slate-300 bg-slate-100">
              <img
                src={heroImageUrl}
                alt="Primary Property Elevation"
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${config.imageCropY}%` }}
              />
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 text-white text-[12px] font-mono uppercase tracking-wider">
                {isDemo ? 'FICTIONAL DEMO ELEVATION' : 'PRIMARY ELEVATION'}
              </div>
            </div>
            <div className="flex flex-col gap-3 h-[400px]">
              <div className="relative flex-1 overflow-hidden border-2 border-slate-300 bg-slate-100">
                <img
                  src={secondaryImages[0].url}
                  alt={secondaryImages[0].name || 'Secondary View 1'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative flex-1 overflow-hidden border-2 border-slate-300 bg-slate-100">
                <img
                  src={secondaryImages[1].url}
                  alt={secondaryImages[1].name || 'Secondary View 2'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Executive Underwriting Metrics Grid */}
      <div className="my-2 shrink-0">
        <h3 className="text-[14px] font-mono font-black uppercase tracking-widest text-slate-900 mb-2.5 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-slate-900" />
          EXECUTIVE UNDERWRITING METRICS
        </h3>
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(6, metrics.length))}, minmax(0, 1fr))` }}
        >
          {metrics.map((m) => (
            <div
              key={m.id}
              data-metric-card="true"
              className={`p-3 border-2 flex flex-col justify-between ${
                m.highlight ? 'bg-amber-50 border-amber-500' : 'bg-slate-50 border-slate-300'
              }`}
            >
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 block truncate">
                {m.label}
              </span>
              <span className="text-[20px] font-black font-mono text-slate-900 block mt-1 leading-tight">
                {m.value}
              </span>
              {m.subtext && (
                <span className="text-[11px] text-slate-500 block mt-1 font-medium leading-tight">
                  {m.subtext}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Specifications & Investment Highlights Split */}
      <div className="grid grid-cols-2 gap-4 my-2 shrink-0">
        {/* Specifications */}
        <div className="p-4 bg-slate-50 border-2 border-slate-200">
          <h4 className="text-[13px] font-mono font-black uppercase text-slate-800 tracking-wider mb-2.5 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-800" />
            PROPERTY SPECIFICATIONS
          </h4>
          <div className="grid grid-cols-2 gap-y-2 text-[13px]">
            <div>
              <span className="text-slate-500">Asset Type:</span>{' '}
              <span className="font-bold text-slate-900">{formatPropertyType(prop?.propertyType)}</span>
            </div>
            <div>
              <span className="text-slate-500">Bed / Bath:</span>{' '}
              <span className="font-bold text-slate-900">{prop?.bedrooms && prop?.bathrooms ? `${prop.bedrooms} Bed / ${prop.bathrooms} Bath` : 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-500">Building Size:</span>{' '}
              <span className="font-bold text-slate-900">{prop?.squareFeet ? `${formatNumber(prop.squareFeet)} SF` : 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-500">Year Built:</span>{' '}
              <span className="font-bold text-slate-900">{prop?.yearBuilt || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-500">Lot Size:</span>{' '}
              <span className="font-bold text-slate-900">{prop?.lotSizeSqFt ? `${formatNumber(prop.lotSizeSqFt)} SF` : '0.33 Acres'}</span>
            </div>
            <div>
              <span className="text-slate-500">Submarket:</span>{' '}
              <span className="font-bold text-slate-900 truncate">{prop?.neighborhood || campaign.sourceData.targetMarket}</span>
            </div>
          </div>
        </div>

        {/* Investment Highlights */}
        <div className="p-4 bg-slate-50 border-2 border-slate-200">
          <h4 className="text-[13px] font-mono font-black uppercase text-slate-800 tracking-wider mb-2.5 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-800" />
            INVESTMENT HIGHLIGHTS
          </h4>
          <ul className="text-[12px] text-slate-700 space-y-1.5 list-disc list-inside leading-relaxed">
            {(prop?.dealHighlights || [
              'Under-market entry basis with verified comparable sales support',
              'Cosmetic scope with rapid target turnaround',
              'Located in high-demand submarket with strong supply fundamentals',
            ]).slice(0, 3).map((h, i) => (
              <li key={i} className="line-clamp-2">{h}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Investment Thesis & Scope Box */}
      <div className="p-4 border-l-4 border-amber-600 bg-amber-50/60 my-2 shrink-0">
        <h4 className="text-[13px] font-mono font-black uppercase text-amber-950 tracking-wider mb-1.5">
          INVESTMENT THESIS & VALUE-ADD RATIONALE
        </h4>
        <p className="text-[13px] text-slate-800 leading-relaxed line-clamp-3">
          {prop?.investmentThesis || campaign.strategy?.valueProposition || 'Acquisition of an off-market value-add asset positioned for substantial yield and equity expansion.'}
        </p>
      </div>

      {/* 6. Footer: Clean Contact & Required Legal Disclaimer */}
      <div className="pt-3 border-t-4 border-slate-900 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-[14px]">
          <div data-contact="true">
            <span className="font-bold text-slate-900">{brandKit.companyName}</span>
            <span className="text-slate-500 ml-3 font-mono">{brandKit.phone} • {brandKit.email}</span>
          </div>
          <div className="text-right font-mono font-bold text-slate-900">
            {brandKit.website}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          {isDemo ? 'DEMO / FICTIONAL SAMPLE. Illustrative inputs only; not a real listing, offering, or projection. ' : ''}
          {brandKit.requiredDisclaimer} {brandKit.licenseNumber ? `| ${brandKit.licenseNumber}` : ''}
        </p>
      </div>
    </div>
  );
};
