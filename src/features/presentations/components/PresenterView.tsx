import React, { useMemo } from 'react';
import { Presentation } from 'lucide-react';
import { Campaign } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { generateDeterministicPresentationDeck } from '../services/demoDeckGenerator';
import { PresentationRenderer } from '../renderer/PresentationRenderer';

interface PresenterViewProps {
  campaign: Campaign;
  brandKit: BrandKit;
  runtimeMode: 'demo' | 'live';
  onUpdateCampaign: (campaign: Campaign) => void;
}

export const PresenterView: React.FC<PresenterViewProps> = ({
  campaign,
  brandKit,
  runtimeMode,
  onUpdateCampaign,
}) => {
  const isDemoCampaign = useMemo(
    () => runtimeMode === 'demo',
    [runtimeMode]
  );
  const deck = campaign.presentation || (isDemoCampaign ? generateDeterministicPresentationDeck(campaign, brandKit) : null);

  if (!deck) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-amber-400">
          <Presentation className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-serif font-bold text-slate-100">Presentation Deck Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md">
          The campaign &quot;{campaign.name}&quot; does not have an active presentation deck. Please open the Campaign Studio to generate one.
        </p>
        <a
          href={window.location.pathname}
          className="px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 overflow-hidden flex flex-col">
      <PresentationRenderer
        deck={deck}
        campaign={campaign}
        brandKit={brandKit}
        runtimeMode={runtimeMode}
        onNotesChange={(slideIndex, notes) => {
          const updatedSlides = [...deck.slides];
          if (!updatedSlides[slideIndex]) return;
          updatedSlides[slideIndex] = {
            ...updatedSlides[slideIndex],
            speakerNotes: notes,
          };
          onUpdateCampaign({ ...campaign, presentation: { ...deck, slides: updatedSlides } });
        }}
      />
    </div>
  );
};

export default PresenterView;
