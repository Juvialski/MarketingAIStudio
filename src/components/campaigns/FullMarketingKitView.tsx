import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { ProviderManager } from '../../services/providers/aiProvider';
import { DesignRenderer } from '../designs/DesignRenderer';
import { MarketingKitZipExporter } from '../../services/export/marketingKitZip';
import { SettingsStore } from '../../services/storage/settingsStore';
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  FileText, 
  Image as ImageIcon, 
  Share2,
  Check,
  AlertCircle,
  Award,
  Cpu,
  Presentation
} from 'lucide-react';

interface FullMarketingKitViewProps {
  campaign: Campaign;
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode: 'demo' | 'live';
  onUpdateCampaign: (updated: Campaign) => void;
  onOpenReview?: () => void;
}

export const FullMarketingKitView: React.FC<FullMarketingKitViewProps> = ({
  campaign,
  brandKit,
  organizationId,
  runtimeMode,
  onUpdateCampaign,
  onOpenReview,
}) => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isReviewingPremium, setIsReviewingPremium] = useState(false);
  const [currentStepName, setCurrentStepName] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  const [zipMessage, setZipMessage] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const config = SettingsStore.get();

  const handleGenerateFullKit = async () => {
    setIsGeneratingAll(true);
    setProgressPercent(10);
    setCurrentStepName('Phase 1: Initializing Quota-Aware Campaign Pipeline...');
    setFallbackNotice(null);

    try {
      const ai = ProviderManager.getAIProvider(runtimeMode);

      // Single-turn full kit generation to conserve quota
      const result = await ai.generateFullMarketingKit(
        campaign.sourceData,
        brandKit,
        (step, pct) => {
          setCurrentStepName(step);
          setProgressPercent(pct);
        },
        { organizationId, campaignId: campaign.id, runtimeMode }
      );

      if (result.metadata?.fallbackOccurred) {
        setFallbackNotice(
          `Generated via fallback model: ${result.metadata.actualModel} (${result.metadata.fallbackReason || 'quota limit'})`
        );
      }

      const updated: Campaign = {
        ...campaign,
        status: 'completed',
        strategy: result.strategy,
        copy: result.copy,
        generationMetadata: result.metadata,
      };

      onUpdateCampaign(updated);
      setProgressPercent(100);
      setCurrentStepName('Full Marketing Kit Package Ready!');
    } catch (err: unknown) {
      console.error('Full kit generation failed', err);
      const message = err instanceof Error ? err.message : 'Campaign kit generation failed. Please try again.';
      alert(message);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleProfessionalReview = async () => {
    if (!campaign.copy) return;
    setIsReviewingPremium(true);
    try {
      const ai = ProviderManager.getAIProvider();
      const premiumModelId = config.premiumModelId || 'gemini-3.7-flash';
      
      const qualityReport = await ai.reviewCopyQuality(
        campaign.copy,
        campaign.sourceData,
        brandKit,
        { modelId: premiumModelId, organizationId, campaignId: campaign.id, runtimeMode }
      );

      const updatedCopy = {
        ...campaign.copy,
        qualityReport,
      };

      onUpdateCampaign({
        ...campaign,
        copy: updatedCopy,
      });

      alert(`Professional Review completed via ${premiumModelId}. Quality Score: ${qualityReport.overallScore}/100.`);
    } catch (err) {
      console.warn('Professional Review failed', err);
    } finally {
      setIsReviewingPremium(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    setZipMessage('Initializing bundle...');
    try {
      await MarketingKitZipExporter.bundleAndDownloadKit(
        campaign,
        brandKit,
        (msg, pct) => {
          setZipMessage(`${msg} (${pct}%)`);
        }
      );
    } catch (err) {
      console.error('Failed to export ZIP', err);
      alert('Export failed. Please ensure graphics are rendered on screen.');
    } finally {
      setIsZipping(false);
      setZipMessage('');
    }
  };

  const isKitReady = Boolean(campaign.strategy && campaign.copy);
  const metadata = campaign.generationMetadata || campaign.copy?.generationMetadata;

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              ONE-CLICK CAMPAIGN PACKAGE
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Status: {campaign.status.toUpperCase()}
            </span>
            {metadata && (
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-500" />
                {metadata.actualModel}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mt-2">
            Full Marketing Kit Studio
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Generate and export the entire asset suite in a single quota-efficient pipeline: strategy brief, multi-platform copy, short-form video reel script, 4 social graphic variants, and a printable investment memorandum flyer.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleGenerateFullKit}
            disabled={isGeneratingAll}
            className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span>{isGeneratingAll ? 'Generating Full Kit...' : 'Generate Full Marketing Kit'}</span>
          </button>

          {isKitReady && (
            <>
              <button
                onClick={handleProfessionalReview}
                disabled={isReviewingPremium}
                className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                title="Run deep underwriting & compliance review with Gemini 3.7 Flash"
              >
                {isReviewingPremium ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                ) : (
                  <Award className="w-4 h-4 text-amber-600" />
                )}
                <span>{isReviewingPremium ? 'Reviewing...' : 'Professional Review'}</span>
              </button>

              {onOpenReview && (
                <button
                  onClick={onOpenReview}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Create or manage shareable review link for clients and bosses"
                >
                  <Share2 className="w-4 h-4 text-amber-400" />
                  <span>Share / Review</span>
                </button>
              )}

              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isZipping ? zipMessage || 'Packaging ZIP...' : 'Download Kit (.ZIP)'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fallback Notice Banner */}
      {fallbackNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{fallbackNotice}</span>
        </div>
      )}

      {/* 2. Generation Progress Tracker */}
      {isGeneratingAll && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-elevated space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-400 font-bold uppercase">{currentStepName}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Asset Overview Grid */}
      {isKitReady && (
        <div className="space-y-8">
          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Strategy</div>
                <div className="text-xs font-bold text-slate-900">Quantifiable Hooks Ready</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Platform Copy</div>
                <div className="text-xs font-bold text-slate-900">5 Channels + Video</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Graphics</div>
                <div className="text-xs font-bold text-slate-900">4 Format Renders</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Printable Flyer</div>
                <div className="text-xs font-bold text-slate-900">US Letter & A4 PDF</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700">
                <Presentation className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Investment Deck</div>
                <div className="text-xs font-bold text-slate-900">
                  {campaign.presentation ? `${campaign.presentation.slides.length} Slides Ready` : 'Ready to Present'}
                </div>
              </div>
            </div>
          </div>

          {/* Rendered Graphics Gallery */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
              Generated Visual Marketing Assets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {/* Instagram Square */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-subtle space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                  Instagram Square (1:1)
                </span>
                <div className="bg-slate-100 p-2 rounded-lg">
                  <DesignRenderer
                    id="rendered-design-square"
                    campaign={campaign}
                    aspectRatio="square"
                    brandKit={brandKit}
                    className="rounded shadow-sm"
                  />
                </div>
              </div>

              {/* Instagram Portrait */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-subtle space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                  Instagram Portrait (4:5)
                </span>
                <div className="bg-slate-100 p-2 rounded-lg">
                  <DesignRenderer
                    id="rendered-design-portrait"
                    campaign={campaign}
                    aspectRatio="portrait"
                    brandKit={brandKit}
                    className="rounded shadow-sm"
                  />
                </div>
              </div>

              {/* Story / Reel */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-subtle space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                  Story / Reel (9:16)
                </span>
                <div className="bg-slate-100 p-2 rounded-lg">
                  <DesignRenderer
                    id="rendered-design-story"
                    campaign={campaign}
                    aspectRatio="story"
                    brandKit={brandKit}
                    className="rounded shadow-sm"
                  />
                </div>
              </div>

              {/* Landscape Banner */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-subtle space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase block">
                  LinkedIn & Facebook Banner (1.91:1)
                </span>
                <div className="bg-slate-100 p-2 rounded-lg">
                  <DesignRenderer
                    id="rendered-design-landscape"
                    campaign={campaign}
                    aspectRatio="landscape"
                    brandKit={brandKit}
                    className="rounded shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Printable Flyer Preview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                  Printable Investment Memorandum Flyer
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-resolution 300 DPI vector layout formatted for standard US Letter & A4 paper.
                </p>
              </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-xl flex justify-center">
              <div className="w-full max-w-2xl">
                <DesignRenderer
                  id="rendered-design-flyer_letter"
                  campaign={campaign}
                  aspectRatio="flyer_letter"
                  brandKit={brandKit}
                  className="rounded-lg shadow-flyer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
