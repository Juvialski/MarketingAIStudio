import React, { forwardRef } from 'react';
import { PresentationDeck } from '../../../types/presentation';
import { Campaign } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { themeToCssVariables } from '../themes/presentationTheme';
import Deck, { DeckRef } from '../bolt/Deck';
import { SemanticSlideRenderer } from './SemanticSlideRenderer';
import { FictionalDemoBanner } from './FictionalDemoBanner';
import { normalizeDemoAssetReferences } from '../../../utils/demoAssets';
import '../styles/presentation.css';

export type PresentationRendererRef = DeckRef;

export interface PresentationRendererProps {
  deck: PresentationDeck;
  campaign?: Campaign;
  brandKit?: BrandKit;
  className?: string;
  style?: React.CSSProperties;
  onNotesChange?: (slideIndex: number, notes: string) => void;
  readOnly?: boolean;
}

export const PresentationRenderer = forwardRef<PresentationRendererRef, PresentationRendererProps>(
  function PresentationRenderer(
    {
      deck,
      campaign,
      brandKit,
      className = '',
      style = {},
      onNotesChange,
      readOnly = false,
    },
    ref
  ) {
    const isDemo =
      deck.isDemo ??
      (campaign?.tags?.includes('Demo') ||
        campaign?.id.includes('demo') ||
        campaign?.id.includes('sample'));

    // Published demo review snapshots can outlive a deployment. Normalize only
    // bundled `/demo/*` references at render time so old snapshots also pick up
    // the current cache-busted asset URL without mutating persisted data.
    const renderedDeck = isDemo ? normalizeDemoAssetReferences(deck) : deck;
    const renderedCampaign =
      isDemo && campaign ? normalizeDemoAssetReferences(campaign) : campaign;

    const themeStyles = themeToCssVariables(renderedDeck.theme);
    const visibleSlides = renderedDeck.slides.filter((s) => !s.isHidden);

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
        {isDemo && <FictionalDemoBanner />}
        <Deck
          ref={ref}
          campaignId={renderedDeck.campaignId}
          style={themeStyles}
          className={className}
          onNotesChange={onNotesChange}
          readOnly={readOnly}
        >
          {visibleSlides.map((slide) => (
            <SemanticSlideRenderer
              key={slide.id}
              slide={slide}
              campaign={renderedCampaign}
              brandKit={brandKit}
            />
          ))}
        </Deck>
      </div>
    );
  }
);
