import React, { useRef, useState } from 'react';
import { CampaignImage } from '../../types/campaign';
import { 
  ImageCreativeBrief, 
  ImagePurpose, 
  ImageStyle, 
  ImageQualityTier,
  GenerationMode
} from '../../types/providers';
import { BrandKit } from '../../types/brandKit';
import { SettingsStore } from '../../services/storage/settingsStore';
import { ImageProviderRegistry } from '../../services/providers/imageProviderRegistry';
import { ImageSpendingTracker } from '../../services/providers/imageSpendingTracker';
import { ImageProviderRouter } from '../../services/providers/imageProvider';
import {
  ImageGenerationState,
  stateAfterProviderResult,
} from '../../services/providers/imageGenerationLifecycle';
import { isSupabaseConfigured } from '../../services/supabase/client';
import { 
  Sparkles, 
  X, 
  DollarSign, 
  AlertCircle, 
  Check, 
  ShieldAlert, 
  RefreshCw,
  Info,
  Layers,
  Zap,
  HardDrive
} from 'lucide-react';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (image: CampaignImage) => void;
  brandKit: BrandKit;
  targetMarket?: string;
  propertyTitle?: string;
  propertyType?: string;
  uploadedImages?: CampaignImage[];
  campaignId?: string;
  organizationId?: string;
  runtimeMode?: 'demo' | 'live';
}

interface GenerationDiagnostics {
  provider: string;
  model?: string;
  estimatedCostUsd: number;
  durationMs: number;
  storageBucket?: string;
  storagePath?: string;
  provenance: string;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  onImageGenerated,
  brandKit,
  targetMarket = 'the selected market',
  propertyTitle = 'Property campaign',
  propertyType = 'single_family',
  uploadedImages = [],
  campaignId,
  organizationId,
  runtimeMode = 'demo',
}) => {
  const config = SettingsStore.get();
  const spendingLimits = config.imageSpendingLimits;
  const backendConfigured = isSupabaseConfigured();

  const [demoModeChoice, setDemoModeChoice] = useState<'fixture' | 'demo_provider_test'>('fixture');
  const [purpose, setPurpose] = useState<ImagePurpose>('hero');
  const [style, setStyle] = useState<ImageStyle>('architectural_photography');
  const [qualityTier, setQualityTier] = useState<ImageQualityTier>(
    spendingLimits.enablePaidGeneration && runtimeMode === 'live' ? 'paid_maximum' : 'free_dev'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9' | '9:16'>('1:1');
  const [customSubject, setCustomSubject] = useState('');
  const [selectedReferenceUrls, setSelectedReferenceUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<GenerationDiagnostics | null>(null);
  const [generationState, setGenerationState] = useState<ImageGenerationState>('idle');
  const requestKeyRef = useRef<string | null>(null);

  if (!isOpen) return null;

  // Resolve estimated cost
  const isPaidTier = qualityTier !== 'free_dev';
  const estimatedCost = ImageProviderRegistry.getCostEstimate(qualityTier);
  const isPaidAllowed = spendingLimits.enablePaidGeneration && runtimeMode === 'live';

  const handleGenerate = async () => {
    if (isGenerating || requestKeyRef.current) return;
    setErrorMsg(null);
    setDiagnostics(null);

    const generationMode: GenerationMode = runtimeMode === 'demo'
      ? demoModeChoice
      : 'live';

    if (runtimeMode === 'demo' && generationMode === 'demo_provider_test') {
      if (!backendConfigured) {
        setErrorMsg('Fresh demo generation requires a configured Supabase backend connection.');
        return;
      }
    }

    if (runtimeMode === 'live') {
      if (!campaignId || campaignId === 'drafts') {
        setErrorMsg('Save the campaign before requesting live image generation so the asset can be stored securely.');
        return;
      }
      if (!organizationId) {
        setErrorMsg('An organization workspace is required for live image generation.');
        return;
      }
    }

    // Enforce cost safety in live mode
    if (isPaidTier && runtimeMode === 'live') {
      const budgetCheck = ImageSpendingTracker.canExecutePaidGeneration(
        estimatedCost,
        spendingLimits,
        campaignId
      );
      if (!budgetCheck.allowed) {
        setErrorMsg(budgetCheck.reason || 'Paid generation blocked by budget rules.');
        return;
      }
    }

    requestKeyRef.current = crypto.randomUUID();
    setIsGenerating(true);
    let lifecycleState: ImageGenerationState = 'preparing';
    const transition = (next: ImageGenerationState) => {
      lifecycleState = next;
      setGenerationState(next);
    };
    transition('preparing');
    setProgressMsg('Composing creative brief...');
    const startTime = Date.now();

    try {
      const brief: ImageCreativeBrief = {
        purpose,
        subject: customSubject.trim() || `${propertyTitle} in ${targetMarket} (${propertyType.replace('_', ' ')})`,
        style,
        aspectRatio,
        qualityTier: generationMode === 'demo_provider_test' ? 'free_dev' : qualityTier,
        references: selectedReferenceUrls,
        brandColors: [brandKit.colors.primary, brandKit.colors.accent],
        isConceptual: true,
        generationMode,
      };

      const resolved = ImageProviderRegistry.resolveProviderForBrief(brief, config, runtimeMode);
      setProgressMsg(
        generationMode === 'fixture'
          ? 'Loading prepackaged fictional fixture...'
          : `Generating via ${resolved.providerId.toUpperCase()} (${resolved.modelId})...`
      );

      const adapter = ImageProviderRouter.getAdapterForConfig({
        ...config,
        imageQualityTier: generationMode === 'demo_provider_test' ? 'free_dev' : qualityTier,
      }, { 
        campaignId: campaignId || 'demo-campaign-preview', 
        organizationId: organizationId || 'demo-org', 
        runtimeMode,
        generationMode,
        idempotencyKey: requestKeyRef.current,
      });

      transition('submitting');
      const result = await adapter.generateFromBrief(brief, (step) => {
        transition(step.toLowerCase().includes('persist') ? 'persisting' : 'generating');
        setProgressMsg(step);
      });
      transition(stateAfterProviderResult(result));

      const durationMs = Date.now() - startTime;
      const isFixture = result.provider === 'demo_fixture' || result.provenance === 'fixture';
      const isDemoTest = brief.generationMode === 'demo_provider_test';

      const newCampaignImg: CampaignImage = {
        id: result.id || `ai-img-${Date.now()}`,
        assetId: result.assetId || (result.id && !result.id.startsWith('ai-img-') ? result.id : undefined),
        url: result.url,
        name: isFixture
          ? `Bundled Demo Fixture: ${purpose.toUpperCase()}`
          : isDemoTest
          ? `Fresh Demo Visual: ${purpose.toUpperCase()} (${result.provider}/${result.metadata?.modelId || 'nvidia'})`
          : `AI Visual: ${purpose.toUpperCase()} (${result.provider})`,
        source: isFixture ? 'sample' : 'ai_generated',
        aspectRatio: aspectRatio === '16:9' ? 1.77 : aspectRatio === '4:5' ? 0.8 : aspectRatio === '9:16' ? 0.56 : 1.0,
        isHero: purpose === 'hero',
        isAiIllustrative: true,
        isConceptual: true,
        estimatedCostUsd: result.costMetadata?.estimatedCostUsd || (isPaidTier && runtimeMode === 'live' ? estimatedCost : 0),
        provider: result.provider,
        model: result.metadata?.modelId,
        provenance: isFixture ? 'fixture' : 'generated',
        storageBucket: result.storageBucket,
        storagePath: result.storagePath,
      };

      setDiagnostics({
        provider: result.provider,
        model: result.metadata?.modelId,
        estimatedCostUsd: newCampaignImg.estimatedCostUsd || 0,
        durationMs,
        storageBucket: result.storageBucket,
        storagePath: result.storagePath,
        provenance: newCampaignImg.provenance || 'generated',
      });

      transition('attaching');
      onImageGenerated(newCampaignImg);
      transition('attached_locally');
      onClose();
    } catch (err: any) {
      console.error('Image generation failed', err);
      const message = err?.message || 'Image generation encountered an error.';
      transition(
        (lifecycleState as ImageGenerationState) === 'attaching'
          ? 'attachment_failed'
          : /persist|storage|asset/i.test(message)
          ? 'storage_failed'
          : 'provider_failed'
      );
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
      requestKeyRef.current = null;
      setProgressMsg('');
    }
  };

  const handleFallbackToFixture = async () => {
    if (isGenerating || runtimeMode !== 'demo') return;
    setErrorMsg(null);
    setIsGenerating(true);
    setGenerationState('preparing');
    setProgressMsg('Loading curated fixture visual...');
    try {
      const adapter = ImageProviderRouter.getAdapterForConfig(config, { runtimeMode: 'demo' });
      const brief: ImageCreativeBrief = {
        purpose,
        subject: customSubject.trim() || `${propertyTitle} in ${targetMarket} (${propertyType.replace('_', ' ')})`,
        style,
        aspectRatio,
        qualityTier: 'free_dev',
        isConceptual: true,
        generationMode: 'fixture',
      };
      const result = await adapter.generateFromBrief(brief);

      const newCampaignImg: CampaignImage = {
        id: result.id || `fixture-img-${Date.now()}`,
        url: result.url,
        name: `Curated Demo Visual: ${purpose.toUpperCase()}`,
        source: 'sample',
        aspectRatio: aspectRatio === '16:9' ? 1.77 : aspectRatio === '4:5' ? 0.8 : aspectRatio === '9:16' ? 0.56 : 1.0,
        isHero: purpose === 'hero',
        isAiIllustrative: true,
        isConceptual: true,
        estimatedCostUsd: 0,
        provider: 'demo_fixture',
        provenance: 'fixture',
      };

      onImageGenerated(newCampaignImg);
      setGenerationState('attached_locally');
      onClose();
    } catch (fallbackErr: any) {
      console.error('Fallback fixture failed', fallbackErr);
      setGenerationState('provider_failed');
      setErrorMsg(fallbackErr.message || 'Could not load fixture image.');
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  const toggleReference = (url: string) => {
    setSelectedReferenceUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const getPrimaryButtonLabel = () => {
    if (runtimeMode === 'demo') {
      return demoModeChoice === 'fixture' ? 'Use Bundled Demo' : 'Generate Fresh Demo Visual';
    }
    return 'Generate Visual Asset';
  };

  return (
    <div data-generation-state={generationState} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-generation-title"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                VISUAL CONCEPT ENGINE
              </span>
              {runtimeMode === 'demo' ? (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  demoModeChoice === 'fixture'
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {demoModeChoice === 'fixture' ? 'OFFLINE SAFE' : 'PROVIDER TEST'}
                </span>
              ) : (
                isPaidTier && (
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Est. ~${estimatedCost.toFixed(2)}
                  </span>
                )
              )}
            </div>
            <h3 id="image-generation-title" className="text-lg font-serif font-bold text-slate-900 mt-1">
              Generate Campaign Visual Concept
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close image generation dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* 1. Mode / Quality Tier Selector */}
          {runtimeMode === 'demo' ? (
            <div>
              <label className="font-bold text-slate-900 block mb-1.5 flex items-center justify-between">
                <span>Demo Execution Mode</span>
                <span className="text-[10px] text-slate-500 font-mono">Select fixture or live test</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Bundled Demo Fixture */}
                <button
                  type="button"
                  onClick={() => setDemoModeChoice('fixture')}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    demoModeChoice === 'fixture'
                      ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                      Bundled Demo Fixture
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                      OFFLINE SAFE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Uses prepackaged fictional example image</div>
                  <div className="text-[10px] font-mono text-slate-700 font-semibold mt-1">Instant / $0.00</div>
                </button>

                {/* Option 2: Fresh Demo Generation */}
                <button
                  type="button"
                  onClick={() => setDemoModeChoice('demo_provider_test')}
                  disabled={!backendConfigured}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    demoModeChoice === 'demo_provider_test'
                      ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                      : !backendConfigured
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      Fresh Demo Generation
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      PROVIDER TEST
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Tests live provider pipeline using fictional data</div>
                  <div className="text-[10px] font-mono text-slate-700 font-semibold mt-1">
                    Free ($0.00) · NVIDIA NIM
                  </div>
                  {!backendConfigured && (
                    <div className="text-[10px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                      <Info className="w-3 h-3" /> Requires backend connection
                    </div>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="font-bold text-slate-900 block mb-1.5 flex items-center justify-between">
                <span>Image Quality Tier</span>
                {!isPaidAllowed && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Paid Generation Disabled in Settings
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'free_dev',
                    label: 'Free / Dev Tier',
                    provider: 'NVIDIA NIM (Free Dev Tier)',
                    cost: 'Free ($0.00)',
                    badge: 'FREE',
                    badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  },
                  {
                    id: 'paid_standard',
                    label: 'Production Standard',
                    provider: 'FLUX.2 Pro',
                    cost: 'from ~$0.03 / img',
                    badge: 'PAID',
                    badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    disabled: !isPaidAllowed,
                  },
                  {
                    id: 'paid_maximum',
                    label: 'Maximum Quality (Hero)',
                    provider: 'FLUX.2 Max',
                    cost: 'from ~$0.07 / img',
                    badge: 'PREMIUM',
                    badgeColor: 'bg-purple-50 text-purple-700 border border-purple-200',
                    disabled: !isPaidAllowed,
                  },
                  {
                    id: 'paid_specialized',
                    label: 'Specialized Control',
                    provider: 'FLUX.2 Flex',
                    cost: 'from ~$0.05 / img',
                    badge: 'FLEX',
                    badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200',
                    disabled: !isPaidAllowed,
                  },
                  {
                    id: 'paid_alternate',
                    label: 'Multimodal Grounding',
                    provider: 'Gemini Image (Not enabled on this deployment)',
                    cost: 'Unavailable',
                    badge: 'DISABLED',
                    badgeColor: 'bg-slate-100 text-slate-400',
                    disabled: true,
                  },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => !tier.disabled && setQualityTier(tier.id as ImageQualityTier)}
                    disabled={tier.disabled}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      qualityTier === tier.id
                        ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                        : tier.disabled
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{tier.label}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${tier.badgeColor}`}>
                        {tier.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{tier.provider}</div>
                    <div className="text-[10px] font-mono text-slate-700 font-semibold mt-1">{tier.cost}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Visual Purpose & Aspect Ratio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-900 block mb-1">Visual Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as ImagePurpose)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-slate-900 outline-none"
              >
                <option value="hero">Hero Exterior Elevation</option>
                <option value="supporting">Interior Living & Kitchen</option>
                <option value="renovation_concept">Conceptual Renovation Vision</option>
                <option value="neighborhood_lifestyle">Neighborhood & Lifestyle</option>
                <option value="editorial">Editorial Detail</option>
                <option value="background">Background Texture / Facade</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-900 block mb-1">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-slate-900 outline-none"
              >
                <option value="1:1">1:1 Square (Instagram / Social Feed)</option>
                <option value="4:5">4:5 Portrait (Instagram Post)</option>
                <option value="16:9">16:9 Landscape (LinkedIn / Web Banner)</option>
                <option value="9:16">9:16 Vertical (Story / Reel / TikTok)</option>
              </select>
            </div>
          </div>

          {/* 3. Photographic Style */}
          <div>
            <label className="font-bold text-slate-900 block mb-1">Photographic Aesthetic</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as ImageStyle)}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-slate-900 outline-none"
            >
              <option value="architectural_photography">Crisp Commercial Architectural Photography</option>
              <option value="warm_natural_light">Warm Natural Daylight (Golden Hour)</option>
              <option value="dusk_luxury">Dusk / Twilight Luxury Lighting</option>
              <option value="editorial_clean">Editorial Magazine 35mm Aesthetic</option>
              <option value="aerial_submarket">Elevated Submarket Drone Aerial</option>
              <option value="minimalist_luxury">Minimalist Luxury & Travertine Texture</option>
            </select>
          </div>

          {/* 4. Subject Customization */}
          <div>
            <label className="font-bold text-slate-900 block mb-1">Custom Creative Directives (Optional)</label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder={`e.g. Modernized mid-century exterior with drought-tolerant desert landscaping in ${targetMarket}`}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-slate-900 outline-none"
            />
          </div>

          {/* 5. Reference Image Selector */}
          {uploadedImages.length > 0 && (
            <div>
              <label className="font-bold text-slate-900 block mb-1.5 flex items-center justify-between">
                <span>Multi-Reference Guidance (Select up to 2 uploaded photos)</span>
                <span className="text-[10px] text-slate-500 font-mono">{selectedReferenceUrls.length} selected</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {uploadedImages.map((img) => {
                  const isSelected = selectedReferenceUrls.includes(img.url);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggleReference(img.url)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        isSelected ? 'border-slate-900 ring-2 ring-slate-900/30' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real Estate Disclaimer Callout */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong className="font-semibold">Compliance Note:</strong> Generative visuals are marked as conceptual. They enhance marketing atmosphere and should not misrepresent physical defects or uncompleted renovations on factual listings.
            </p>
          </div>

          {/* Diagnostic Card (if available) */}
          {diagnostics && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1 text-[11px] font-mono text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                Generation Diagnostics Summary
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
                <div>Provider: <span className="font-semibold text-slate-900">{diagnostics.provider}</span></div>
                <div>Model: <span className="font-semibold text-slate-900">{diagnostics.model || 'default'}</span></div>
                <div>Duration: <span className="font-semibold text-slate-900">{diagnostics.durationMs}ms</span></div>
                <div>Est. Cost: <span className="font-semibold text-slate-900">${diagnostics.estimatedCostUsd.toFixed(3)}</span></div>
                {diagnostics.storageBucket && (
                  <div className="col-span-2">Storage: <span className="font-semibold text-slate-900">{diagnostics.storageBucket}/{diagnostics.storagePath}</span></div>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl text-xs space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-red-900">Image Generation Backend Notice</div>
                  <p className="text-red-800 leading-relaxed">{errorMsg}</p>
                </div>
              </div>

              {runtimeMode === 'demo' && (
                <div className="pt-2 border-t border-red-200/60 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-red-700">
                    You can immediately insert a bundled high-resolution visual fixture instead:
                  </span>
                  <button
                    type="button"
                    onClick={handleFallbackToFixture}
                    disabled={isGenerating}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Use Curated Fixture Asset Instead</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {runtimeMode === 'demo' ? (
              demoModeChoice === 'fixture' ? (
                <span className="text-slate-600 font-medium">Bundled Fictional Demo Fixture ($0.00)</span>
              ) : (
                <span className="text-amber-800 font-medium">Fresh Demo Generation (NVIDIA NIM · $0.00)</span>
              )
            ) : isPaidTier ? (
              <span className="font-mono text-slate-700 font-semibold">
                Est. Cost: ~${estimatedCost.toFixed(2)} · {qualityTier.replace('_', ' ').toUpperCase()}
              </span>
            ) : (
              <span className="text-slate-600 font-medium">Free Development Tier (NVIDIA NIM · $0.00)</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || (runtimeMode === 'demo' && demoModeChoice === 'demo_provider_test' && !backendConfigured)}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>{progressMsg || 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{getPrimaryButtonLabel()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

