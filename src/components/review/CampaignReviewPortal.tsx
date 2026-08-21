import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ReviewSnapshot, 
  ReviewLinkPermissions, 
  ReviewFeedback, 
  SanitizedGraphicMaterial, 
  ReviewStatus 
} from '../../types/review';
import { 
  Campaign, 
  OutputAspectRatio, 
  PropertyDetails, 
  CampaignStrategy, 
  GraphicDesignConfig 
} from '../../types/campaign';
import { BrandKit, TypographyFamily } from '../../types/brandKit';
import { PresentationRenderer, PresentationRendererRef } from '../../features/presentations/renderer/PresentationRenderer';
import { DesignRenderer } from '../designs/DesignRenderer';
import { MaterialLightboxModal } from './MaterialLightboxModal';
import { VariantComparisonModal } from './VariantComparisonModal';
import { ReviewAccessGate } from './ReviewAccessGate';
import { CampaignReviewService } from '../../services/supabase/campaignReviewService';
import { 
  Presentation, 
  Maximize2, 
  Star, 
  Check, 
  Copy, 
  Columns, 
  CheckCircle2, 
  MapPin, 
  Film, 
  UserCheck, 
  MessageSquare,
  Shield
} from 'lucide-react';

interface CampaignReviewPortalProps {
  token: string;
}

export const CampaignReviewPortal: React.FC<CampaignReviewPortalProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<'active' | 'not_found' | 'revoked' | 'expired' | 'no_version'>('active');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
  const [permissions, setPermissions] = useState<ReviewLinkPermissions>({
    allowComments: true,
    allowSelection: true,
    allowApproval: true,
    allowDownloads: false,
  });
  const [versionNumber, setVersionNumber] = useState<number>(1);
  const [feedbackList, setFeedbackList] = useState<ReviewFeedback[]>([]);

  // Reviewer session state
  const [reviewerName, setReviewerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zaw_reviewer_name') || '';
    }
    return '';
  });

  // Category filter for graphics
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'social' | 'advertising' | 'print'>('all');

  // Active variants selected locally for preview
  const [activeVariantMap, setActiveVariantMap] = useState<Record<string, string>>({});

  // Modals state
  const [inspectingMaterial, setInspectingMaterial] = useState<SanitizedGraphicMaterial | null>(null);
  const [comparingMaterial, setComparingMaterial] = useState<SanitizedGraphicMaterial | null>(null);
  const presentationRef = useRef<PresentationRendererRef>(null);

  // Overall Campaign Approval state
  const [isApprovingCampaign, setIsApprovingCampaign] = useState(false);
  const [campaignApprovalNotes, setCampaignApprovalNotes] = useState('');
  const [campaignApprovalSuccess, setCampaignApprovalSuccess] = useState(false);

  // Load public snapshot
  const loadReviewPortal = async () => {
    setLoading(true);
    try {
      const res = await CampaignReviewService.getPublicSnapshot(token);
      if (res.status !== 'active' || !res.snapshot) {
        setAccessStatus(res.status);
        setErrorMessage(res.error || 'This review package is not available.');
        return;
      }

      setAccessStatus('active');
      setSnapshot(res.snapshot);
      if (res.permissions) setPermissions(res.permissions);
      if (res.versionNumber) setVersionNumber(res.versionNumber);
      if (res.feedback) setFeedbackList(res.feedback);

      // Initialize active variants from snapshot or feedback
      const initialMap: Record<string, string> = {};
      res.snapshot.graphicMaterials.forEach((m) => {
        const preferredFb = res.feedback?.find(
          (f) => f.materialKey === m.id && f.status === 'preferred'
        );
        initialMap[m.id] = preferredFb?.variantKey || m.activeVariantId || m.variants[0]?.id;
      });
      setActiveVariantMap(initialMap);
    } catch (e: unknown) {
      setAccessStatus('not_found');
      const errText = e instanceof Error ? e.message : 'Failed to load review portal.';
      setErrorMessage(errText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewPortal();
  }, [token]);

  const handleReviewerNameChange = (name: string) => {
    setReviewerName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zaw_reviewer_name', name);
    }
  };

  // Convert snapshot into Campaign & BrandKit models for renderers
  const { simulatedCampaign, simulatedBrandKit } = useMemo(() => {
    if (!snapshot) return { simulatedCampaign: null, simulatedBrandKit: null };

    const brandKit: BrandKit = {
      id: 'brand-snapshot',
      isDefault: true,
      companyName: snapshot.brandKit.companyName,
      tagline: snapshot.brandKit.tagline || '',
      logoUrl: snapshot.brandKit.logoUrl || '',
      logoDarkUrl: snapshot.brandKit.logoDarkUrl || '',
      website: snapshot.brandKit.website || '',
      phone: snapshot.brandKit.phone || '',
      email: snapshot.brandKit.email || '',
      licenseNumber: snapshot.brandKit.licenseNumber || '',
      colors: snapshot.brandKit.colors,
      typography: {
        headlineFont: snapshot.brandKit.typography.headlineFont,
        bodyFont: snapshot.brandKit.typography.bodyFont,
        monoFont: snapshot.brandKit.typography.monoFont,
        familyPairing: (snapshot.brandKit.typography.familyPairing as TypographyFamily) || 'editorial_serif',
      },
      toneOfVoice: 'analytical_investor',
      targetAudienceDefault: snapshot.strategy?.targetAudience.description || '',
      preferredCta: snapshot.strategy?.keyHooks[0] || 'Request Deal Package',
      requiredDisclaimer: snapshot.brandKit.disclaimer,
      forbiddenWords: [],
      imageStylePreference: 'authentic_photos_first',
    };

    const designConfigs: Record<OutputAspectRatio, GraphicDesignConfig> = {
      square: (snapshot.graphicMaterials.find((m) => m.format === 'square')?.variants[0]?.config as GraphicDesignConfig) || {
        templateFamily: 'editorial',
        aspectRatio: 'square',
        headline: snapshot.campaignTitle,
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        showDisclaimer: true,
      },
      portrait: (snapshot.graphicMaterials.find((m) => m.format === 'portrait')?.variants[0]?.config as GraphicDesignConfig) || {
        templateFamily: 'editorial',
        aspectRatio: 'portrait',
        headline: snapshot.campaignTitle,
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        showDisclaimer: true,
      },
      story: (snapshot.graphicMaterials.find((m) => m.format === 'story')?.variants[0]?.config as GraphicDesignConfig) || {
        templateFamily: 'editorial',
        aspectRatio: 'story',
        headline: snapshot.campaignTitle,
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        showDisclaimer: true,
      },
      landscape: (snapshot.graphicMaterials.find((m) => m.format === 'landscape')?.variants[0]?.config as GraphicDesignConfig) || {
        templateFamily: 'editorial',
        aspectRatio: 'landscape',
        headline: snapshot.campaignTitle,
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        showDisclaimer: true,
      },
      flyer_letter: (snapshot.graphicMaterials.find((m) => m.format === 'flyer_letter')?.variants[0]?.config as GraphicDesignConfig) || {
        templateFamily: 'editorial',
        aspectRatio: 'flyer_letter',
        headline: snapshot.campaignTitle,
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        showDisclaimer: true,
      },
      flyer_a4: (snapshot.graphicMaterials.find((m) => m.format === 'flyer_a4')?.variants[0]?.config as GraphicDesignConfig) || {
        templateFamily: 'editorial',
        aspectRatio: 'flyer_a4',
        headline: snapshot.campaignTitle,
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        showDisclaimer: true,
      },
    };

    const campaign: Campaign = {
      id: snapshot.campaignId || 'public-review-campaign',
      name: snapshot.campaignTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'completed',
      sourceData: {
        campaignType: snapshot.campaignType,
        title: snapshot.campaignTitle,
        targetMarket: snapshot.targetMarket,
        uploadedImages: snapshot.heroImageUrl && snapshot.heroImageUrl.trim() !== ''
          ? [
              {
                id: 'hero-1',
                url: snapshot.heroImageUrl,
                name: 'Hero Image',
                source: 'sample',
                aspectRatio: 1.5,
                isHero: true,
              },
            ]
          : [],
        property: snapshot.property
          ? {
              address: snapshot.property.address,
              city: snapshot.property.city,
              state: snapshot.property.state,
              zipCode: snapshot.property.zipCode,
              neighborhood: snapshot.property.neighborhood,
              propertyType: (snapshot.property.propertyType as PropertyDetails['propertyType']) || 'single_family',
              bedrooms: snapshot.property.bedrooms,
              bathrooms: snapshot.property.bathrooms,
              squareFeet: snapshot.property.squareFeet,
              financials: snapshot.property.financials,
              investmentThesis: snapshot.property.investmentThesis,
              dealHighlights: snapshot.property.dealHighlights,
              renovationScope: snapshot.property.renovationScope,
            }
          : undefined,
      },
      strategy: snapshot.strategy as CampaignStrategy | undefined,
      presentation: snapshot.presentation,
      designConfigs,
      tags: ['Client Review'],
    };

    return { simulatedCampaign: campaign, simulatedBrandKit: brandKit };
  }, [snapshot]);

  // Feedback actions
  const handleMarkPreferred = async (materialKey: string, variantKey: string) => {
    setActiveVariantMap((prev) => ({ ...prev, [materialKey]: variantKey }));
    
    // Optimistically update feedback list
    setFeedbackList((prev) => {
      const filtered = prev.filter((f) => !(f.materialKey === materialKey && f.status === 'preferred'));
      return [
        {
          id: `fb-opt-${Date.now()}`,
          reviewLinkId: '',
          materialKey,
          variantKey,
          reviewerName: reviewerName || 'Reviewer',
          status: 'preferred',
          updatedAt: new Date().toISOString(),
        },
        ...filtered,
      ];
    });

    await CampaignReviewService.submitPublicFeedback(
      token,
      materialKey,
      variantKey,
      'preferred',
      undefined,
      reviewerName || 'Reviewer'
    );
  };

  const handleUpdateStatus = async (
    materialKey: string,
    variantKey: string,
    status: ReviewStatus,
    comment?: string
  ) => {
    setFeedbackList((prev) => [
      {
        id: `fb-opt-${Date.now()}`,
        reviewLinkId: '',
        materialKey,
        variantKey,
        reviewerName: reviewerName || 'Reviewer',
        status,
        comment,
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    await CampaignReviewService.submitPublicFeedback(
      token,
      materialKey,
      variantKey,
      status,
      comment,
      reviewerName || 'Reviewer'
    );
  };

  const handleApproveOverallCampaign = async () => {
    setIsApprovingCampaign(true);
    try {
      await CampaignReviewService.submitPublicCampaignApproval(
        token,
        'approved',
        campaignApprovalNotes,
        reviewerName || 'Reviewer'
      );
      setCampaignApprovalSuccess(true);
    } catch (err) {
      alert('Failed to record campaign approval. Please try again.');
    } finally {
      setIsApprovingCampaign(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading Campaign Review Room...</span>
        </div>
      </div>
    );
  }

  if (accessStatus !== 'active' || !snapshot || !simulatedCampaign || !simulatedBrandKit) {
    return (
      <ReviewAccessGate
        status={accessStatus === 'active' ? 'not_found' : accessStatus}
        errorMessage={errorMessage || undefined}
      />
    );
  }

  // Calculate review progress
  const totalItems = (snapshot.presentation ? 1 : 0) + snapshot.graphicMaterials.length + snapshot.copyChannels.length;
  const reviewedCount = new Set(feedbackList.map((f) => f.materialKey)).size;

  // Filter graphic materials
  const filteredMaterials = snapshot.graphicMaterials.filter((m) => {
    if (selectedCategory === 'all') return true;
    return m.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* 1. Top Client Review Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Property Title */}
        <div className="flex items-center gap-3.5">
          {snapshot.brandKit.logoUrl ? (
            <img 
              src={snapshot.brandKit.logoUrl} 
              alt={snapshot.brandKit.companyName} 
              className="h-8 max-w-[120px] object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
              {snapshot.brandKit.companyName.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Review Package · Version {versionNumber}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {snapshot.targetMarket}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-serif font-bold text-white tracking-tight mt-0.5">
              {snapshot.campaignTitle}
            </h1>
          </div>
        </div>

        {/* Reviewer Name & Progress Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => handleReviewerNameChange(e.target.value)}
              placeholder="Your name (e.g. John)"
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-28 sm:w-36"
            />
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-amber-400 font-bold">{reviewedCount}</span>
            <span className="text-slate-500">/</span>
            <span>{totalItems} Reviewed</span>
          </div>

          {permissions.allowApproval && (
            <button
              onClick={() => {
                const el = document.getElementById('campaign-approval-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Approve Package</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Review Portal Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {/* 2. Overview Section */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Hero Image or Branded Placeholder */}
            {snapshot.heroImageUrl && snapshot.heroImageUrl.trim() !== '' ? (
              <div className="lg:col-span-5 aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950 relative group">
                <img
                  src={snapshot.heroImageUrl}
                  alt={snapshot.campaignTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-3 py-1 rounded-lg text-[10px] font-mono text-slate-300">
                  Primary Asset Photography
                </div>
              </div>
            ) : (
              <div className="lg:col-span-5 aspect-[4/3] rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <MapPin className="w-6 h-6 text-slate-500" />
                </div>
                <div className="text-xs font-semibold text-slate-300">Property image not provided</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Live campaign without primary photography</div>
              </div>
            )}

            {/* Investment Highlights */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
                  {snapshot.campaignType.replace(/_/g, ' ').toUpperCase()}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-2">
                  {snapshot.property?.investmentThesis || snapshot.campaignTitle}
                </h2>
                {snapshot.strategy?.coreAngle && (
                  <p className="text-xs text-amber-300 font-mono mt-1">
                    Strategy: {snapshot.strategy.coreAngle}
                  </p>
                )}
              </div>

              {/* Financial Metrics Cards */}
              {snapshot.property?.financials && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {snapshot.property.financials.purchasePrice && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Purchase Basis</div>
                      <div className="text-base font-bold text-white font-mono">
                        ${snapshot.property.financials.purchasePrice.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {snapshot.property.financials.renovationEstimate && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Est. Renovation</div>
                      <div className="text-base font-bold text-amber-400 font-mono">
                        ${snapshot.property.financials.renovationEstimate.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {snapshot.property.financials.arv && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Target ARV</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        ${snapshot.property.financials.arv.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {snapshot.property.financials.equitySpread && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Gross Spread</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        ${snapshot.property.financials.equitySpread.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {snapshot.property.financials.roiPercent && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Projected ROI</div>
                      <div className="text-base font-bold text-amber-300 font-mono">
                        {snapshot.property.financials.roiPercent}%
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deal Highlights */}
              {snapshot.property?.dealHighlights && snapshot.property.dealHighlights.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Key Offer Highlights</h4>
                  <ul className="space-y-1">
                    {snapshot.property.dealHighlights.slice(0, 3).map((hl, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">✓</span>
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. Investment Presentation Section */}
        {snapshot.presentation && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-bold">
                  CANONICAL 16:9 DECK
                </span>
                <h3 className="text-xl font-serif font-bold text-white mt-1">
                  Investment Presentation Deck
                </h3>
                <p className="text-xs text-slate-400">
                  Full multi-slide capital deck rendered at canonical 1600×900 precision.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    presentationRef.current?.toggleFullscreen();
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Presentation className="w-4 h-4" />
                  <span>Present Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Embedded 16:9 Container */}
            <div className="w-full aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center">
              <PresentationRenderer
                ref={presentationRef}
                deck={snapshot.presentation}
                campaign={simulatedCampaign}
                brandKit={simulatedBrandKit}
                readOnly={true}
              />
            </div>
          </section>
        )}

        {/* 4. Social, Web & Print Graphic Materials */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-bold">
                CREATIVE SUITE
              </span>
              <h3 className="text-xl font-serif font-bold text-white mt-1">
                Marketing Graphics & Flyer Materials
              </h3>
              <p className="text-xs text-slate-400">
                Review and select your preferred creative direction for each publication format.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all' as const, label: 'All Formats' },
                { id: 'social' as const, label: 'Social' },
                { id: 'advertising' as const, label: 'Advertising' },
                { id: 'print' as const, label: 'Print Memorandum' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graphic Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => {
              const activeVariantId = activeVariantMap[material.id] || material.variants[0]?.id;
              const activeVariant = material.variants.find((v) => v.id === activeVariantId) || material.variants[0];
              const feedback = feedbackList.find((f) => f.materialKey === material.id);
              const isPreferred = feedback?.status === 'preferred';

              return (
                <div
                  key={material.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col hover:border-slate-700 transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {material.format.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {material.dimensions.width}×{material.dimensions.height}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{material.label}</h4>
                    </div>

                    {isPreferred && (
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
                        <Star className="w-3 h-3 fill-emerald-400" />
                        PREFERRED
                      </span>
                    )}
                  </div>

                  {/* Scaled Preview Box */}
                  <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px] relative group">
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden shadow">
                      <DesignRenderer
                        campaign={simulatedCampaign}
                        aspectRatio={material.format}
                        configOverride={activeVariant.config}
                        brandKit={simulatedBrandKit}
                      />
                    </div>

                    {/* Hover Inspect Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                      <button
                        onClick={() => setInspectingMaterial(material)}
                        className="px-3.5 py-2 bg-white text-slate-950 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-slate-100 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      {material.variants.length > 1 && (
                        <button
                          onClick={() => setComparingMaterial(material)}
                          className="px-3.5 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer"
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Compare ({material.variants.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variant Selection & Actions */}
                  <div className="p-4 border-t border-slate-800 space-y-3 mt-auto bg-slate-950/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400">Direction:</span>
                      <span className="font-bold text-amber-400">{activeVariant.name}</span>
                    </div>

                    {/* Variant Pills */}
                    {material.variants.length > 1 && (
                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                        {material.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setActiveVariantMap((prev) => ({ ...prev, [material.id]: v.id }))}
                            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                              v.id === activeVariant.id
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {v.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      {permissions.allowSelection && (
                        <button
                          onClick={() => handleMarkPreferred(material.id, activeVariant.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                            isPreferred
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>{isPreferred ? '✓ Preferred' : 'Mark Preferred'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setInspectingMaterial(material)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                        title="Fullscreen Lightbox"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Platform Copy & Video Reel Concept */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-bold">
              WRITTEN ASSETS & SCRIPTS
            </span>
            <h3 className="text-xl font-serif font-bold text-white mt-1">
              Social Copy & Video Script Package
            </h3>
            <p className="text-xs text-slate-400">
              High-converting platform copywriting and 9:16 short-form video concepts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copy Channel Cards */}
            {snapshot.copyChannels.map((ch) => (
              <div key={ch.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">{ch.channelName}</h4>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${ch.headline}\n\n${ch.body}\n\n${ch.cta}`);
                      alert('Copied to clipboard!');
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1"
                    title="Copy text"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-300">{ch.headline}</div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {ch.body}
                  </p>
                  <div className="text-xs font-semibold text-emerald-400 pt-1">CTA: {ch.cta}</div>
                  {ch.hashtags && ch.hashtags.length > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      {ch.hashtags.join(' ')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Video Script Card */}
            {snapshot.videoScript && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 md:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">9:16 Short-Form Reel Script</h4>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {snapshot.videoScript.durationSeconds}s Target Duration
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Hook: {snapshot.videoScript.hook}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {snapshot.videoScript.scenes.map((sc, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                        <span>SCENE {idx + 1}</span>
                        <span>{sc.timeframe}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        <span className="text-slate-500 font-mono">Visual:</span> {sc.visualDirection}
                      </div>
                      <div className="text-xs text-white italic">
                        "{sc.spokenAudio}"
                      </div>
                      {sc.onScreenText && (
                        <div className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-1 rounded">
                          Text: {sc.onScreenText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6. Overall Campaign Approval & Review Submission Section */}
        {permissions.allowApproval && (
          <section id="campaign-approval-section" className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white">
                Submit Campaign Review Decision
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your selections and feedback will be securely synchronized to the campaign sponsor's workspace.
              </p>
            </div>

            {campaignApprovalSuccess ? (
              <div className="max-w-md mx-auto bg-emerald-950/60 border border-emerald-500/50 p-6 rounded-2xl text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Review Successfully Submitted</h4>
                <p className="text-xs text-emerald-200">
                  Thank you! Your preferences and approval have been recorded.
                </p>
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-4">
                {permissions.allowComments && (
                  <textarea
                    value={campaignApprovalNotes}
                    onChange={(e) => setCampaignApprovalNotes(e.target.value)}
                    placeholder="Optional executive feedback or instructions for the campaign sponsor..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 h-24"
                  />
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleApproveOverallCampaign}
                    disabled={isApprovingCampaign}
                    className="w-full sm:flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isApprovingCampaign ? 'Submitting Approval...' : 'Approve Selected Materials'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      await CampaignReviewService.submitPublicCampaignApproval(
                        token,
                        'needs_changes',
                        campaignApprovalNotes,
                        reviewerName || 'Reviewer'
                      );
                      alert('Feedback recorded as Needs Changes.');
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-colors"
                  >
                    Request Revisions
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 7. Legal Disclaimer Footer */}
        <footer className="border-t border-slate-900 pt-8 pb-12 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>CONFIDENTIAL CLIENT REVIEW ROOM · {snapshot.brandKit.companyName}</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-3xl mx-auto leading-relaxed">
            {snapshot.brandKit.disclaimer}
          </p>
        </footer>
      </main>

      {/* Lightbox Modal */}
      {inspectingMaterial && (
        <MaterialLightboxModal
          isOpen={Boolean(inspectingMaterial)}
          material={inspectingMaterial}
          activeVariant={
            inspectingMaterial.variants.find((v) => v.id === activeVariantMap[inspectingMaterial.id]) ||
            inspectingMaterial.variants[0]
          }
          allMaterials={snapshot.graphicMaterials}
          brandKit={simulatedBrandKit}
          campaign={simulatedCampaign}
          currentStatus={feedbackList.find((f) => f.materialKey === inspectingMaterial.id)?.status || 'not_reviewed'}
          isPreferred={feedbackList.some((f) => f.materialKey === inspectingMaterial.id && f.status === 'preferred')}
          allowSelection={permissions.allowSelection}
          allowApproval={permissions.allowApproval}
          allowComments={permissions.allowComments}
          onSelectVariant={(vId) => setActiveVariantMap((prev) => ({ ...prev, [inspectingMaterial.id]: vId }))}
          onMarkPreferred={handleMarkPreferred}
          onUpdateStatus={handleUpdateStatus}
          onOpenComparison={(m) => {
            setInspectingMaterial(null);
            setComparingMaterial(m);
          }}
          onNavigateMaterial={(m) => setInspectingMaterial(m)}
          onClose={() => setInspectingMaterial(null)}
        />
      )}

      {/* Variant Comparison Modal */}
      {comparingMaterial && (
        <VariantComparisonModal
          isOpen={Boolean(comparingMaterial)}
          material={comparingMaterial}
          brandKit={simulatedBrandKit}
          campaign={simulatedCampaign}
          preferredVariantId={activeVariantMap[comparingMaterial.id]}
          allowSelection={permissions.allowSelection}
          onMarkPreferred={handleMarkPreferred}
          onClose={() => setComparingMaterial(null)}
          onOpenLightbox={(m, vId) => {
            if (vId) {
              setActiveVariantMap((prev) => ({ ...prev, [m.id]: vId }));
            }
            setComparingMaterial(null);
            setInspectingMaterial(m);
          }}
        />
      )}
    </div>
  );
};
