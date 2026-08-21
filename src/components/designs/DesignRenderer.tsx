import React, { useRef, useState, useEffect } from 'react';
import { Campaign, GraphicDesignConfig, OutputAspectRatio } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { FORMAT_DIMENSIONS } from '../../types/designs';
import { EditorialTemplate } from './templates/EditorialTemplate';
import { InstitutionalTemplate } from './templates/InstitutionalTemplate';
import { ModernBrokerageTemplate } from './templates/ModernBrokerageTemplate';
import { DirectResponseTemplate } from './templates/DirectResponseTemplate';
import { MarketIntelligenceTemplate } from './templates/MarketIntelligenceTemplate';
import { FlyerTemplate } from './templates/FlyerTemplate';

interface DesignRendererProps {
  campaign: Campaign;
  aspectRatio: OutputAspectRatio;
  configOverride?: Partial<GraphicDesignConfig>;
  brandKit: BrandKit;
  className?: string;
  id?: string;
  showSafeZones?: boolean;
  scale?: number;
  previewMode?: 'auto' | 'controlled';
}

export const DesignRenderer: React.FC<DesignRendererProps> = ({
  campaign,
  aspectRatio,
  configOverride,
  brandKit,
  className = '',
  id,
  showSafeZones = false,
  scale: controlledScale,
  previewMode = 'auto',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalScale, setInternalScale] = useState(1);
  const isControlled = previewMode === 'controlled' || controlledScale !== undefined;
  const effectiveScale = isControlled ? (controlledScale ?? 1) : internalScale;

  const baseConfig = campaign.designConfigs[aspectRatio] || {
    templateFamily: 'editorial',
    aspectRatio,
    headline: campaign.sourceData.title,
    imageCropY: 50,
    imageZoom: 1.0,
    activeMetricIds: ['purchase', 'arv', 'spread'],
    showDisclaimer: true,
  };

  const config: GraphicDesignConfig = {
    ...baseConfig,
    ...configOverride,
    aspectRatio,
  };

  // Determine active hero image
  const heroImage =
    campaign.sourceData.uploadedImages.find((img) => img.id === config.imageId) ||
    campaign.sourceData.uploadedImages.find((img) => img.isHero) ||
    campaign.sourceData.uploadedImages[0] || {
      url: '/demo/fictional-property-exterior.png',
    };

  const dimensions = FORMAT_DIMENSIONS[aspectRatio];
  const isA4 = aspectRatio === 'flyer_a4';
  const isLetter = aspectRatio === 'flyer_letter';
  const nativeWidth = isLetter ? 1275 : isA4 ? 1240 : dimensions.width;
  const nativeHeight = isLetter ? 1650 : isA4 ? 1754 : dimensions.height;

  useEffect(() => {
    if (isControlled || !containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth;
        if (clientWidth > 0) {
          setInternalScale(clientWidth / nativeWidth);
        }
      }
    };

    updateScale();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [isControlled, nativeWidth]);

  const renderTemplateContent = () => {
    if (aspectRatio === 'flyer_letter' || aspectRatio === 'flyer_a4') {
      return (
        <FlyerTemplate
          campaign={campaign}
          config={config}
          brandKit={brandKit}
          heroImageUrl={heroImage.url}
        />
      );
    }

    switch (config.templateFamily) {
      case 'institutional':
        return (
          <InstitutionalTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImage.url}
          />
        );
      case 'modern_brokerage':
        return (
          <ModernBrokerageTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImage.url}
          />
        );
      case 'direct_response':
        return (
          <DirectResponseTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImage.url}
          />
        );
      case 'market_intelligence':
        return (
          <MarketIntelligenceTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImage.url}
          />
        );
      case 'editorial':
      default:
        return (
          <EditorialTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImage.url}
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden shadow-elevated bg-slate-900 rounded-lg ${className}`}
      style={{
        aspectRatio: `${nativeWidth} / ${nativeHeight}`,
        width: isControlled ? `${Math.round(nativeWidth * effectiveScale)}px` : undefined,
        height: isControlled ? `${Math.round(nativeHeight * effectiveScale)}px` : undefined,
      }}
    >
      <div
        id={id}
        data-aspect-ratio={aspectRatio}
        data-target-width={dimensions.width}
        data-target-height={dimensions.height}
        style={{
          width: `${nativeWidth}px`,
          height: `${nativeHeight}px`,
          transform: `scale(${effectiveScale})`,
          transformOrigin: 'top left',
        }}
        className="relative origin-top-left"
      >
        {renderTemplateContent()}

        {/* Safe Zone Overlay Guide for QA */}
        {showSafeZones && (
          <div className="absolute inset-0 pointer-events-none z-50 border-2 border-red-500/40">
            {aspectRatio === 'story' && (
              <>
                <div className="absolute top-0 inset-x-0 h-[180px] bg-red-500/10 border-b border-red-500/50 flex items-center justify-center text-red-500 font-mono text-[14px]">
                  TOP SAFE ZONE (Reserved for Instagram/TikTok UI)
                </div>
                <div className="absolute bottom-0 inset-x-0 h-[250px] bg-red-500/10 border-t border-red-500/50 flex items-center justify-center text-red-500 font-mono text-[14px]">
                  BOTTOM SAFE ZONE (Reserved for UI / Sound Bar)
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
