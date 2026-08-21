import React, { useState, useRef } from 'react';
import { Campaign } from '../../../types/campaign';
import { BrandKit } from '../../../types/brandKit';
import { PresentationDeck } from '../../../types/presentation';
import { PresentationRenderer, PresentationRendererRef } from '../renderer/PresentationRenderer';
import { SlideEditorModal } from './SlideEditorModal';
import { generateDeterministicPresentationDeck } from '../services/demoDeckGenerator';
import { validatePresentationDeck } from '../utils/validatePresentationDeck';
import { ProviderManager } from '../../../services/providers/aiProvider';
import {
  Play,
  Edit3,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  FileJson,
  Presentation,
  ShieldCheck,
  Info,
  XCircle,
} from 'lucide-react';

interface PresentationWorkspaceProps {
  campaign: Campaign;
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode: 'demo' | 'live';
  onUpdateCampaign: (campaign: Campaign) => void;
}

export const PresentationWorkspace: React.FC<PresentationWorkspaceProps> = ({
  campaign,
  brandKit,
  organizationId,
  runtimeMode,
  onUpdateCampaign,
}) => {
  const isDemo = runtimeMode === 'demo' || campaign.tags?.includes('Demo') || campaign.tags?.includes('Fictional');

  const [deck, setDeck] = useState<PresentationDeck | null>(() => {
    if (campaign.presentation) return campaign.presentation;
    if (isDemo) {
      return generateDeterministicPresentationDeck(campaign, brandKit);
    }
    return null;
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const presentationRef = useRef<PresentationRendererRef>(null);

  const qaReport = deck ? validatePresentationDeck(deck, campaign) : null;

  const handleSaveDeck = (updatedDeck: PresentationDeck) => {
    setDeck(updatedDeck);
    const updatedCampaign: Campaign = {
      ...campaign,
      presentation: updatedDeck,
    };
    onUpdateCampaign(updatedCampaign);
  };

  const handleNotesChange = (slideIndex: number, notes: string) => {
    if (!deck) return;
    const updatedSlides = [...deck.slides];
    if (updatedSlides[slideIndex]) {
      updatedSlides[slideIndex] = {
        ...updatedSlides[slideIndex],
        speakerNotes: notes,
      };
      const updatedDeck = { ...deck, slides: updatedSlides };
      setDeck(updatedDeck);
      onUpdateCampaign({ ...campaign, presentation: updatedDeck });
    }
  };

  const handleGenerateDeck = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(isDemo ? 'Generating deterministic demo presentation...' : 'Initializing presentation engine...');

    try {
      if (isDemo) {
        const demoDeck = generateDeterministicPresentationDeck(campaign, brandKit);
        handleSaveDeck(demoDeck);
      } else {
        const ai = ProviderManager.getAIProvider(runtimeMode);
        const newDeck = await ai.generatePresentationDeck(
          campaign,
          brandKit,
          (step: string) => setGenerationStep(step),
          { organizationId, campaignId: campaign.id, runtimeMode }
        );
        handleSaveDeck(newDeck);
      }
    } catch (err: unknown) {
      console.error('AI presentation generation failed:', err);
      const message = err instanceof Error ? err.message : 'AI presentation deck generation failed.';
      setGenerationError(message);
      // DO NOT silently fall back to demo generator in live mode!
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleExportJson = () => {
    if (!deck) return;
    const jsonStr = JSON.stringify(deck, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.id}-presentation-deck.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFullscreen = () => {
    presentationRef.current?.toggleFullscreen();
  };

  // Empty state when no presentation exists
  if (!deck) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-subtle text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
            <Presentation className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-slate-900">
              Investment Presentation
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Create a structured investor-facing presentation from this campaign's verified property data, strategy, copy, visuals, and Brand Kit.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 text-left space-y-2 max-w-md mx-auto">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>No paid image generation occurs automatically. Existing campaign visuals will be reused first.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>All financial figures are bound to your verified Financial Truth Engine fact ledger.</span>
            </div>
          </div>

          {generationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start gap-2 text-left">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Generation Error:</strong> {generationError}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleGenerateDeck}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-md inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {isGenerating
                  ? generationStep || 'Generating Presentation...'
                  : isDemo
                  ? 'Generate Demo Presentation'
                  : 'Generate Investment Presentation'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Bolt Slides Presentation Engine
            </span>
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {deck.slides.filter((s) => !s.isHidden).length} Slides
            </span>
          </div>
          <h2 className="text-lg font-serif font-bold text-slate-900 mt-1">
            Investment Presentation & Deck Studio
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditorOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Slides</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title="Export Presentation Deck JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleGenerateDeck}
            disabled={isGenerating}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isGenerating
                ? generationStep || 'Generating...'
                : isDemo
                ? 'Regenerate Demo Deck'
                : 'Regenerate Deck'}
            </span>
          </button>

          <button
            onClick={handleFullscreen}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Present Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Generation Error Alert */}
      {generationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Generation Error:</strong> {generationError}
          </div>
          <button
            onClick={() => setGenerationError(null)}
            className="text-red-600 hover:text-red-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. QA Preflight Check Summary */}
      {qaReport && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {qaReport.valid ? (
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Preflight Quality Check: Passed (Score: {qaReport.score}/100 · {qaReport.checks.filter(c => c.passed).length}/{qaReport.checks.length} checks verified)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Preflight Warnings ({qaReport.score}/100): {qaReport.errors.join(' · ')}</span>
              </div>
            )}
          </div>

          <div className="text-slate-500 font-mono text-[11px]">
            Shortcuts: [←/→] Navigate · [S] Sidebar · [G] Grid · [A] Annotate · [P] Presenter · [F] Fullscreen
          </div>
        </div>
      )}

      {/* 3. Presentation Viewport Frame */}
      <div className="w-full aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative flex items-center justify-center">
        <PresentationRenderer
          ref={presentationRef}
          deck={deck}
          campaign={campaign}
          brandKit={brandKit}
          onNotesChange={handleNotesChange}
        />
      </div>

      {/* 4. Slide Editor Modal */}
      {isEditorOpen && (
        <SlideEditorModal
          deck={deck}
          onSave={handleSaveDeck}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};
