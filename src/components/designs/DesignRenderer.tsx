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
import { resolveDemoAssetUrl } from '../../utils/demoAssets';

// Runtime-only neutral placeholder. It is deliberately not a campaign asset,
// is never persisted, and contains no fictional property photography.
const EMPTY_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%23e2e8f0"/%3E%3Cpath d="M470 510h260l-34-210-96-80-96 80z" fill="none" stroke="%2364758b" stroke-width="10"/%3E%3Cpath d="M420 510h360M520 510v-100h160v100" fill="none" stroke="%2364758b" stroke-width="10"/%3E%3Ctext x="600" y="650" text-anchor="middle" font-family="sans-serif" font-size="34" fill="%23475569"%3EProperty image not provided%3C/text%3E%3C/svg%3E';

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
      // A live campaign without a resolved asset must remain visibly empty;
      // silently inserting a fictional demo image corrupts the product truth.
      url: '',
    };

  const heroImageUrl = heroImage.url
    ? (resolveDemoAssetUrl(heroImage.url) || heroImage.url)
    : EMPTY_IMAGE_PLACEHOLDER;

  const dimensions = FORMAT_DIMENSIONS[aspectRatio];
  const isA4 = aspectRatio === 'flyer_a4';
  const isLetter = aspectRatio === 'flyer_letter';
  const nativeWidth = isLetter ? 1275 : isA4 ? 1240 : dimensions.width;
  const nativeHeight = isLetter ? 1650 : isA4 ? 1754 : dimensions.height;
  const renderedFamily = isLetter || isA4 ? 'flyer' : config.templateFamily;

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
          heroImageUrl={heroImageUrl}
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
            heroImageUrl={heroImageUrl}
          />
        );
      case 'modern_brokerage':
        return (
          <ModernBrokerageTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImageUrl}
          />
        );
      case 'direct_response':
        return (
          <DirectResponseTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImageUrl}
          />
        );
      case 'market_intelligence':
        return (
          <MarketIntelligenceTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImageUrl}
          />
        );
      case 'editorial':
      default:
        return (
          <EditorialTemplate
            campaign={campaign}
            config={config}
            brandKit={brandKit}
            heroImageUrl={heroImageUrl}
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
        data-template-family={renderedFamily}
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
