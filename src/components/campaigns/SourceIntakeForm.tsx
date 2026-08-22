import React, { useState } from 'react';
import { CampaignSourceData, CampaignType, CampaignImage } from '../../types/campaign';
import { CURATED_STOCK_PHOTOS } from '../../services/providers/imageProvider';
import { StorageService } from '../../services/supabase/storageService';
import { DEFAULT_BRAND_KIT } from '../../types/brandKit';
import { ImageGenerationModal } from '../images/ImageGenerationModal';
import { PropertyExtractionService } from '../../services/extraction/propertyExtractionService';
import { ExtractionResult } from '../../types/extraction';
import { validatePropertyFinancials } from '../../services/financials/financialValidation';
import { 
  DollarSign, 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2,
  MapPin,
  Loader2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Layers,
  Info
} from 'lucide-react';

interface SourceIntakeFormProps {
  initialData?: Partial<CampaignSourceData>;
  organizationId?: string;
  campaignId?: string;
  runtimeMode?: 'demo' | 'live';
  onSave: (data: CampaignSourceData) => void;
  onCancel?: () => void;
}

interface ConflictItem {
  fieldName: string;
  fieldLabel: string;
  currentValue: any;
  extractedValue: any;
  evidenceSnippet?: string;
}

export const SourceIntakeForm: React.FC<SourceIntakeFormProps> = ({
  initialData,
  organizationId = 'demo-local',
  campaignId = 'demo-draft',
  runtimeMode = 'demo',
  onSave,
  onCancel,
}) => {
  const [campaignType, setCampaignType] = useState<CampaignType>(initialData?.campaignType || 'fix_and_flip');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [title, setTitle] = useState(initialData?.title || '');
  const [targetMarket, setTargetMarket] = useState(initialData?.targetMarket || '');
  const [address, setAddress] = useState(initialData?.property?.address || '');
  const [city, setCity] = useState(initialData?.property?.city || '');
  const [state, setState] = useState(initialData?.property?.state || '');
  const [zipCode, setZipCode] = useState(initialData?.property?.zipCode || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.property?.neighborhood || '');
  const [bedrooms, setBedrooms] = useState<number | ''>(initialData?.property?.bedrooms ?? '');
  const [bathrooms, setBathrooms] = useState<number | ''>(initialData?.property?.bathrooms ?? '');
  const [squareFeet, setSquareFeet] = useState<number | ''>(initialData?.property?.squareFeet ?? '');
  const [lotSizeSqFt, setLotSizeSqFt] = useState<number | ''>(initialData?.property?.lotSizeSqFt ?? '');
  const [yearBuilt, setYearBuilt] = useState<number | ''>(initialData?.property?.yearBuilt ?? '');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(initialData?.property?.financials?.purchasePrice ?? '');
  const [renovationEstimate, setRenovationEstimate] = useState<number | ''>(initialData?.property?.financials?.renovationEstimate ?? '');
  const [arv, setArv] = useState<number | ''>(initialData?.property?.financials?.arv ?? '');
  const [projectedRent, setProjectedRent] = useState<number | ''>(initialData?.property?.financials?.projectedRentMonthly ?? '');
  const [capRate, setCapRate] = useState<number | ''>(initialData?.property?.financials?.capRatePercent ?? '');
  const [investmentThesis, setInvestmentThesis] = useState(initialData?.property?.investmentThesis || '');
  const [dealHighlights, setDealHighlights] = useState(
    initialData?.property?.dealHighlights?.join('\n') || ''
  );
  const [uploadedImages, setUploadedImages] = useState<CampaignImage[]>(initialData?.uploadedImages || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isCleaningDraft, setIsCleaningDraft] = useState(false);

  // "Paste Everything" Extraction State
  const [rawIntakeText, setRawIntakeText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSummary, setExtractionSummary] = useState<{
    totalExtracted: number;
    appliedCount: number;
    conflictCount: number;
    source: string;
  } | null>(null);
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<Map<string, ConflictItem>>(new Map());
  const [formValidationErrors, setFormValidationErrors] = useState<string[]>([]);
  const [formValidationWarnings, setFormValidationWarnings] = useState<string[]>([]);

  // Calculate Real vs Conceptual Photo counts
  const realPhotosCount = uploadedImages.filter(
    (img) => img.source === 'upload' && !img.isAiIllustrative && img.provenance === 'uploaded'
  ).length;
  const conceptualPhotosCount = uploadedImages.filter(
    (img) => img.isAiIllustrative || img.isConceptual || img.source === 'sample'
  ).length;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      let shouldAssignHero = uploadedImages.length === 0;
      for (const file of Array.from(files)) {
        const asset = await StorageService.uploadPropertyPhoto(
          organizationId,
          campaignId,
          file
        );

        const newImg: CampaignImage = {
          id: asset.assetId || `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          assetId: asset.assetId,
          url: asset.url,
          name: file.name,
          source: 'upload',
          aspectRatio: 1.5,
          isHero: shouldAssignHero,
          provenance: 'uploaded',
          isAiIllustrative: false,
          isConceptual: false,
          storageBucket: asset.bucket,
          storagePath: asset.path,
          mimeType: asset.mimeType,
        };

        setUploadedImages((prev) => [...prev, newImg]);
        shouldAssignHero = false;
      }
    } catch (err) {
      console.error('Photo upload failed', err);
      setFormValidationErrors((previous) => [
        ...previous,
        err instanceof Error ? err.message : 'Photo upload failed. The campaign was not changed.',
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectCuratedStock = (photo: (typeof CURATED_STOCK_PHOTOS)[number]) => {
    const newImg: CampaignImage = {
      id: `stock-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      url: photo.url,
      name: photo.name,
      source: 'sample',
      aspectRatio: 1.5,
      isHero: uploadedImages.length === 0,
      provenance: 'fixture',
      isAiIllustrative: true,
      isConceptual: true,
    };
    setUploadedImages((prev) => [...prev, newImg]);
  };

  const setHeroImage = (id: string) => {
    setUploadedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isHero: img.id === id,
      }))
    );
  };

  const removeImage = (id: string) => {
    const target = uploadedImages.find((img) => img.id === id);
    if (target?.storagePath && organizationId && campaignId) {
      if (runtimeMode === 'live' && campaignId === 'drafts') {
        setIsCleaningDraft(true);
        void StorageService.deleteDraftUploads(organizationId, [target])
          .then(() => setUploadedImages((prev) => prev.filter((img) => img.id !== id)))
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : 'The unsaved draft photo could not be deleted from storage.';
            setFormValidationErrors((previous) => [...previous, message]);
          })
          .finally(() => setIsCleaningDraft(false));
        return;
      }
      void StorageService.deleteCampaignAsset(
        organizationId,
        campaignId,
        target.storagePath,
        (target.storageBucket as any) || 'property-media'
      ).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'The asset was removed from the form but could not be deleted from storage.';
        setFormValidationErrors((previous) => [...previous, message]);
      });
    }
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleCancel = async () => {
    if (runtimeMode === 'live' && campaignId === 'drafts' && organizationId) {
      setIsCleaningDraft(true);
      try {
        await StorageService.deleteDraftUploads(organizationId, uploadedImages);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unsaved draft photos could not be removed from storage.';
        setFormValidationErrors((previous) => [...previous, message]);
        setIsCleaningDraft(false);
        return;
      }
      setIsCleaningDraft(false);
    }
    onCancel?.();
  };

  // --- "Paste Everything" Extraction & Merge Engine ---

  const handleExtractFromRawText = async () => {
    if (!rawIntakeText.trim()) return;

    setIsExtracting(true);
    setExtractionSummary(null);

    try {
      const result: ExtractionResult = await PropertyExtractionService.extractPropertyData(
        rawIntakeText,
        { organizationId, campaignId, runtimeMode }
      );

      const ext = result.data;
      const newAutofilled = new Set<string>(autofilledFields);
      const newConflicts = new Map<string, ConflictItem>(conflicts);
      let appliedCount = 0;

      // Helper to merge or flag conflict
      const mergeOrConflict = <T extends string | number | string[]>(
        fieldName: string,
        fieldLabel: string,
        currentVal: T | '' | undefined,
        extractedVal: T | undefined,
        setter: (v: any) => void,
        evidenceSnippet?: string
      ) => {
        if (extractedVal === undefined || extractedVal === null) return;
        const isCurrentEmpty = currentVal === '' || currentVal === undefined || (Array.isArray(currentVal) && currentVal.length === 0);

        if (isCurrentEmpty) {
          setter(extractedVal);
          newAutofilled.add(fieldName);
          newConflicts.delete(fieldName);
          appliedCount++;
        } else if (String(currentVal).trim() !== String(extractedVal).trim()) {
          newConflicts.set(fieldName, {
            fieldName,
            fieldLabel,
            currentValue: currentVal,
            extractedValue: extractedVal,
            evidenceSnippet,
          });
        }
      };

      // 1. Campaign Type
      if (ext.campaignType?.value) {
        if (!initialData?.campaignType) {
          setCampaignType(ext.campaignType.value);
          newAutofilled.add('campaignType');
          appliedCount++;
        }
      }

      // 2. Title & Target Market
      mergeOrConflict('title', 'Campaign Title', title, ext.title?.value, setTitle, ext.title?.evidenceSnippet);
      mergeOrConflict('targetMarket', 'Target Market', targetMarket, ext.targetMarket?.value, setTargetMarket, ext.targetMarket?.evidenceSnippet);

      // 3. Location
      mergeOrConflict('address', 'Street Address', address, ext.address?.value, setAddress, ext.address?.evidenceSnippet);
      mergeOrConflict('city', 'City', city, ext.city?.value, setCity, ext.city?.evidenceSnippet);
      mergeOrConflict('state', 'State', state, ext.state?.value, setState, ext.state?.evidenceSnippet);
      mergeOrConflict('zipCode', 'ZIP Code', zipCode, ext.zipCode?.value, setZipCode, ext.zipCode?.evidenceSnippet);
      mergeOrConflict('neighborhood', 'Neighborhood', neighborhood, ext.neighborhood?.value, setNeighborhood, ext.neighborhood?.evidenceSnippet);

      // 4. Physical Specs
      mergeOrConflict('bedrooms', 'Bedrooms', bedrooms, ext.bedrooms?.value, setBedrooms, ext.bedrooms?.evidenceSnippet);
      mergeOrConflict('bathrooms', 'Bathrooms', bathrooms, ext.bathrooms?.value, setBathrooms, ext.bathrooms?.evidenceSnippet);
      mergeOrConflict('squareFeet', 'Square Feet', squareFeet, ext.squareFeet?.value, setSquareFeet, ext.squareFeet?.evidenceSnippet);
      mergeOrConflict('lotSizeSqFt', 'Lot Size (SqFt)', lotSizeSqFt, ext.lotSizeSqFt?.value, setLotSizeSqFt, ext.lotSizeSqFt?.evidenceSnippet);
      mergeOrConflict('yearBuilt', 'Year Built', yearBuilt, ext.yearBuilt?.value, setYearBuilt, ext.yearBuilt?.evidenceSnippet);

      // 5. Underwriting Financials
      mergeOrConflict('purchasePrice', 'Purchase Price', purchasePrice, ext.purchasePrice?.value, setPurchasePrice, ext.purchasePrice?.evidenceSnippet);
      mergeOrConflict('renovationEstimate', 'Renovation Budget', renovationEstimate, ext.renovationEstimate?.value, setRenovationEstimate, ext.renovationEstimate?.evidenceSnippet);
      mergeOrConflict('arv', 'After Repair Value (ARV)', arv, ext.arv?.value, setArv, ext.arv?.evidenceSnippet);
      mergeOrConflict('projectedRent', 'Projected Rent', projectedRent, ext.projectedRentMonthly?.value, setProjectedRent, ext.projectedRentMonthly?.evidenceSnippet);
      mergeOrConflict('capRate', 'Cap Rate %', capRate, ext.capRatePercent?.value, setCapRate, ext.capRatePercent?.evidenceSnippet);

      // 6. Thesis, Highlights & Scope
      mergeOrConflict('investmentThesis', 'Investment Thesis', investmentThesis, ext.investmentThesis?.value, setInvestmentThesis, ext.investmentThesis?.evidenceSnippet);
      if (ext.dealHighlights?.value && ext.dealHighlights.value.length > 0) {
        mergeOrConflict('dealHighlights', 'Deal Highlights', dealHighlights, ext.dealHighlights.value.join('\n'), setDealHighlights, ext.dealHighlights.evidenceSnippet);
      }

      setAutofilledFields(newAutofilled);
      setConflicts(newConflicts);
      setExtractionSummary({
        totalExtracted: result.fieldsExtractedCount,
        appliedCount,
        conflictCount: newConflicts.size,
        source: result.source === 'ai_llm' ? 'AI Intelligence Model' : 'Deterministic Pattern Extractor',
      });
    } catch (err: any) {
      console.error('Property extraction error', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const applyConflict = (fieldName: string) => {
    const item = conflicts.get(fieldName);
    if (!item) return;

    switch (fieldName) {
      case 'title': setTitle(item.extractedValue); break;
      case 'targetMarket': setTargetMarket(item.extractedValue); break;
      case 'address': setAddress(item.extractedValue); break;
      case 'city': setCity(item.extractedValue); break;
      case 'state': setState(item.extractedValue); break;
      case 'zipCode': setZipCode(item.extractedValue); break;
      case 'neighborhood': setNeighborhood(item.extractedValue); break;
      case 'bedrooms': setBedrooms(item.extractedValue); break;
      case 'bathrooms': setBathrooms(item.extractedValue); break;
      case 'squareFeet': setSquareFeet(item.extractedValue); break;
      case 'lotSizeSqFt': setLotSizeSqFt(item.extractedValue); break;
      case 'yearBuilt': setYearBuilt(item.extractedValue); break;
      case 'purchasePrice': setPurchasePrice(item.extractedValue); break;
      case 'renovationEstimate': setRenovationEstimate(item.extractedValue); break;
      case 'arv': setArv(item.extractedValue); break;
      case 'projectedRent': setProjectedRent(item.extractedValue); break;
      case 'capRate': setCapRate(item.extractedValue); break;
      case 'investmentThesis': setInvestmentThesis(item.extractedValue); break;
      case 'dealHighlights': setDealHighlights(item.extractedValue); break;
    }

    setAutofilledFields((prev) => new Set([...prev, fieldName]));
    setConflicts((prev) => {
      const next = new Map(prev);
      next.delete(fieldName);
      return next;
    });
  };

  const dismissConflict = (fieldName: string) => {
    setConflicts((prev) => {
      const next = new Map(prev);
      next.delete(fieldName);
      return next;
    });
  };

  const applyAllConflicts = () => {
    conflicts.forEach((_, fieldName) => {
      applyConflict(fieldName);
    });
  };

  const dismissAllConflicts = () => {
    setConflicts(new Map());
  };

  // --- Title Fallback Hierarchy Engine ---
  const generateEffectiveTitle = (): string => {
    if (title.trim()) return title.trim();
    if (address.trim()) return `${address.trim()} Opportunity`;
    if (targetMarket.trim()) return `${targetMarket.trim()} Investment Opportunity`;
    return 'Untitled Property Campaign';
  };

  // --- Data Coverage & Completeness Engine ---
  const calculateCompleteness = () => {
    const hasRealPhoto = realPhotosCount > 0;
    const hasAnyPhoto = uploadedImages.length > 0;
    const hasAddress = Boolean(address.trim() && city.trim() && state.trim());
    const hasPartialAddress = Boolean(address.trim() || city.trim() || targetMarket.trim());
    const hasSpecs = typeof bedrooms === 'number' && typeof bathrooms === 'number' && typeof squareFeet === 'number';
    const hasPartialSpecs = typeof bedrooms === 'number' || typeof bathrooms === 'number' || typeof squareFeet === 'number';
    const hasFinancials = (typeof purchasePrice === 'number' && typeof arv === 'number') || (typeof projectedRent === 'number');
    const hasThesis = Boolean(investmentThesis.trim() || dealHighlights.trim());

    return {
      photoStatus: hasRealPhoto ? 'complete' : hasAnyPhoto ? 'partial' : 'missing',
      locationStatus: hasAddress ? 'complete' : hasPartialAddress ? 'partial' : 'missing',
      specsStatus: hasSpecs ? 'complete' : hasPartialSpecs ? 'partial' : 'missing',
      financialStatus: hasFinancials ? 'complete' : 'missing',
      thesisStatus: hasThesis ? 'complete' : 'missing',
    };
  };

  const completeness = calculateCompleteness();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    // HARD GATE: In Live Mode, at least one authentic uploaded photo is required
    if (runtimeMode === 'live' && realPhotosCount === 0) {
      errors.push('At least one authentic uploaded property photo is required for live campaigns. AI concept visuals and bundled demo fixtures cannot serve as proof of real property.');
    }

    const financialReport = validatePropertyFinancials({
      purchasePrice: typeof purchasePrice === 'number' ? purchasePrice : undefined,
      renovationEstimate: typeof renovationEstimate === 'number' ? renovationEstimate : undefined,
      arv: typeof arv === 'number' ? arv : undefined,
      squareFeet: typeof squareFeet === 'number' ? squareFeet : undefined,
      projectedRentMonthly: typeof projectedRent === 'number' ? projectedRent : undefined,
      explicitCapRatePercent: typeof capRate === 'number' ? capRate : undefined,
    });
    setFormValidationWarnings(financialReport.warnings.map((issue) => issue.message));
    errors.push(...financialReport.errors.map((issue) => issue.message));

    if (errors.length > 0) {
      setFormValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormValidationErrors([]);

    const pPrice = typeof purchasePrice === 'number' ? purchasePrice : undefined;
    const pReno = typeof renovationEstimate === 'number' ? renovationEstimate : undefined;
    const pArv = typeof arv === 'number' ? arv : undefined;
    const spread = pArv && pPrice ? pArv - pPrice - (pReno || 0) : undefined;

    const effectiveTitle = generateEffectiveTitle();

    const sourceData: CampaignSourceData = {
      campaignType,
      title: effectiveTitle,
      targetMarket: targetMarket.trim() || (city.trim() && state.trim() ? `${city.trim()}, ${state.trim()}` : 'Target Market'),
      uploadedImages,
      selectedHeroImageId: uploadedImages.find((img) => img.isHero)?.id || uploadedImages[0]?.id,
      property: {
        address: address.trim() || 'Address Pending',
        city: city.trim() || targetMarket.trim() || 'Market Pending',
        state: state.trim() || '',
        zipCode: zipCode.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        propertyType: campaignType === 'cash_flow_rental' ? 'multi_family' : 'single_family',
        bedrooms: typeof bedrooms === 'number' ? bedrooms : undefined,
        bathrooms: typeof bathrooms === 'number' ? bathrooms : undefined,
        squareFeet: typeof squareFeet === 'number' ? squareFeet : undefined,
        lotSizeSqFt: typeof lotSizeSqFt === 'number' ? lotSizeSqFt : undefined,
        yearBuilt: typeof yearBuilt === 'number' ? yearBuilt : undefined,
        financials: {
          purchasePrice: pPrice,
          renovationEstimate: pReno,
          arv: pArv,
          projectedRentMonthly: typeof projectedRent === 'number' ? projectedRent : undefined,
          capRatePercent: typeof capRate === 'number' ? capRate : undefined,
          equitySpread: spread,
        },
        investmentThesis: investmentThesis.trim() || '',
        dealHighlights: dealHighlights.split('\n').map((h) => h.trim()).filter((h) => h.length > 0),
      },
    };

    onSave(sourceData);
  };

  // Conflict item renderer component
  const renderConflictBadge = (fieldName: string) => {
    const item = conflicts.get(fieldName);
    if (!item) return null;

    return (
      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-[11px] animate-fade-in">
        <div className="flex items-center gap-1.5 text-amber-900 truncate">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Extracted: <strong className="font-semibold text-slate-900 font-mono">"{String(item.extractedValue)}"</strong></span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => applyConflict(fieldName)}
            className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded text-[10px] transition-colors"
          >
            Apply Extracted
          </button>
          <button
            type="button"
            onClick={() => dismissConflict(fieldName)}
            className="px-2 py-0.5 border border-amber-300 hover:bg-amber-100 text-amber-800 rounded text-[10px] transition-colors"
          >
            Keep Mine
          </button>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 lg:p-10 rounded-2xl border border-slate-200 shadow-subtle w-full max-w-[1500px] mx-auto">
      {/* Validation Errors Header (if any) */}
      {formValidationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-1.5 animate-shake">
          <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <span>Campaign Validation Requirements</span>
          </div>
          <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
            {formValidationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      {formValidationWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Review financial assumptions</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
            {formValidationWarnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
              Campaign Intake & Property Underwriting
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Import unformatted property notes or enter specs manually. All text fields are non-mandatory with intelligent fallbacks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase ${
              runtimeMode === 'live' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {runtimeMode === 'live' ? '● LIVE MODE' : '○ DEMO MODE'}
            </span>
          </div>
        </div>
      </div>

      {/* 0. "PASTE EVERYTHING" QUICK PROPERTY IMPORT */}
      <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3.5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quick Property Import (Paste Everything)</h3>
              <p className="text-[11px] text-slate-400">Paste unformatted MLS remarks, broker emails, or underwriting memos to autofill the form.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
            ZERO HALLUCINATIONS
          </span>
        </div>

        <textarea
          rows={4}
          value={rawIntakeText}
          onChange={(e) => setRawIntakeText(e.target.value)}
          placeholder="Paste property listing, address, beds/baths, square footage, purchase price, rehab budget, ARV, rent projections, or broker summary here..."
          className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 font-mono outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="text-[11px] text-slate-400">
            {rawIntakeText.length > 0 && `${rawIntakeText.length} characters`}
          </div>
          <div className="flex items-center gap-2">
            {rawIntakeText && (
              <button
                type="button"
                onClick={() => setRawIntakeText('')}
                className="px-3 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleExtractFromRawText}
              disabled={isExtracting || !rawIntakeText.trim()}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting facts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Extract & Autofill Details</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Extraction Summary Banner */}
        {extractionSummary && (
          <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Extracted <strong className="text-white">{extractionSummary.totalExtracted} facts</strong> ({extractionSummary.appliedCount} autofilled
                {extractionSummary.conflictCount > 0 && `, ${extractionSummary.conflictCount} conflicts needing review`})
              </span>
            </div>
            {extractionSummary.conflictCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyAllConflicts}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] transition-colors"
                >
                  Apply All Extracted ({extractionSummary.conflictCount})
                </button>
                <button
                  type="button"
                  onClick={dismissAllConflicts}
                  className="px-2.5 py-1 border border-slate-600 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                >
                  Keep All Existing
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Campaign Classification */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
            1. Campaign Objective & Investment Strategy
          </label>
          {autofilledFields.has('campaignType') && (
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
              Autofilled
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { id: 'fix_and_flip', label: 'Fix & Flip / Value-Add', desc: 'Short-term equity spread & ARV upside' },
            { id: 'cash_flow_rental', label: 'Cash Flow Rental / Multi', desc: 'Cap rate, DSCR & cash-on-cash yield' },
            { id: 'wholesale_deal', label: 'Wholesale Assignment', desc: 'Discounted basis & fast disposition' },
            { id: 'market_update', label: 'Market Update / Insights', desc: 'Submarket trends & analytics' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setCampaignType(type.id as CampaignType)}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                campaignType === type.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-bold">{type.label}</div>
              <div className={`text-xs mt-1 leading-snug ${campaignType === type.id ? 'text-slate-300' : 'text-slate-500'}`}>
                {type.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Core Location & Title */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="campaign-working-title" className="block text-xs font-semibold text-slate-700">
              Campaign Working Title <span className="text-slate-400 font-normal">(Optional — defaults to Address/Market)</span>
            </label>
            {autofilledFields.has('title') && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                Autofilled
              </span>
            )}
          </div>
          <input
            id="campaign-working-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder={generateEffectiveTitle()}
          />
          {renderConflictBadge('title')}
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="target-metro-submarket" className="block text-xs font-semibold text-slate-700">
              Target Metro / Submarket
            </label>
            {autofilledFields.has('targetMarket') && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                Autofilled
              </span>
            )}
          </div>
          <input
            id="target-metro-submarket"
            type="text"
            value={targetMarket}
            onChange={(e) => setTargetMarket(e.target.value)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="e.g. Phoenix, AZ (Arcadia Lite)"
          />
          {renderConflictBadge('targetMarket')}
        </div>
      </div>

      {/* 3. Property Address & Specifications */}
      <div className="p-5 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-600" />
          Property Specifications
        </h3>

        {/* Row 1: Street Address | City | State | ZIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-street-address" className="block text-xs text-slate-600">Street Address</label>
              {autofilledFields.has('address') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-street-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. 4421 E Cambridge Ave"
            />
            {renderConflictBadge('address')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-city" className="block text-xs text-slate-600">City</label>
              {autofilledFields.has('city') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. Phoenix"
            />
            {renderConflictBadge('city')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-state" className="block text-xs text-slate-600">State</label>
              {autofilledFields.has('state') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. AZ"
            />
            {renderConflictBadge('state')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-zip" className="block text-xs text-slate-600">ZIP Code</label>
              {autofilledFields.has('zipCode') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-zip"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="85008"
            />
            {renderConflictBadge('zipCode')}
          </div>
        </div>

        {/* Row 2: Neighborhood | Bedrooms | Bathrooms | Square Feet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-neighborhood" className="block text-xs text-slate-600">Neighborhood</label>
              {autofilledFields.has('neighborhood') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-neighborhood"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. Arcadia Lite"
            />
            {renderConflictBadge('neighborhood')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-bedrooms" className="block text-xs text-slate-600">Bedrooms</label>
              {autofilledFields.has('bedrooms') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-bedrooms"
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="3"
            />
            {renderConflictBadge('bedrooms')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-bathrooms" className="block text-xs text-slate-600">Bathrooms</label>
              {autofilledFields.has('bathrooms') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-bathrooms"
              type="number"
              step="0.5"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="2"
            />
            {renderConflictBadge('bathrooms')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="property-square-feet" className="block text-xs text-slate-600">Square Feet</label>
              {autofilledFields.has('squareFeet') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="property-square-feet"
              type="number"
              value={squareFeet}
              onChange={(e) => setSquareFeet(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="1840"
            />
            {renderConflictBadge('squareFeet')}
          </div>
        </div>
      </div>

      {/* 4. Financial Underwriting Numbers */}
      <div className="p-5 sm:p-6 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-700" />
          Financial Underwriting Metrics (USD)
        </h3>

        {/* Large Desktop: 5 columns in a single responsive row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="financial-purchase-price" className="block text-xs font-semibold text-slate-700">Purchase Price</label>
              {autofilledFields.has('purchasePrice') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="financial-purchase-price"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="285000"
            />
            {renderConflictBadge('purchasePrice')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="financial-renovation-budget" className="block text-xs font-semibold text-slate-700">Renovation Budget</label>
              {autofilledFields.has('renovationEstimate') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="financial-renovation-budget"
              type="number"
              value={renovationEstimate}
              onChange={(e) => setRenovationEstimate(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="35000"
            />
            {renderConflictBadge('renovationEstimate')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="financial-arv" className="block text-xs font-semibold text-slate-700">After Repair Value (ARV)</label>
              {autofilledFields.has('arv') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="financial-arv"
              type="number"
              value={arv}
              onChange={(e) => setArv(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="390000"
            />
            {renderConflictBadge('arv')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="financial-projected-rent" className="block text-xs text-slate-600">Projected Monthly Rent</label>
              {autofilledFields.has('projectedRent') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="financial-projected-rent"
              type="number"
              value={projectedRent}
              onChange={(e) => setProjectedRent(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="e.g. 2400"
            />
            {renderConflictBadge('projectedRent')}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="financial-cap-rate" className="block text-xs text-slate-600">Projected Cap Rate %</label>
              {autofilledFields.has('capRate') && (
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded">Autofilled</span>
              )}
            </div>
            <input
              id="financial-cap-rate"
              type="number"
              step="0.1"
              value={capRate}
              onChange={(e) => setCapRate(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="e.g. 9.4"
            />
            {renderConflictBadge('capRate')}
          </div>
        </div>
      </div>

      {/* 5. Investment Thesis & Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="investment-thesis" className="block text-xs font-semibold text-slate-700">Investment Thesis & Scope Notes</label>
            {autofilledFields.has('investmentThesis') && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                Autofilled
              </span>
            )}
          </div>
          <textarea
            id="investment-thesis"
            rows={3}
            value={investmentThesis}
            onChange={(e) => setInvestmentThesis(e.target.value)}
            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="Describe the opportunity, why you are buying, and scope..."
          />
          {renderConflictBadge('investmentThesis')}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="deal-highlights" className="block text-xs font-semibold text-slate-700">Deal Highlights / Comp Notes (1 per line)</label>
            {autofilledFields.has('dealHighlights') && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                Autofilled
              </span>
            )}
          </div>
          <textarea
            id="deal-highlights"
            rows={3}
            value={dealHighlights}
            onChange={(e) => setDealHighlights(e.target.value)}
            className="w-full text-xs p-3 border border-slate-300 rounded-lg font-mono text-[11px] focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="Enter key deal highlights..."
          />
          {renderConflictBadge('dealHighlights')}
        </div>
      </div>

      {/* 6. Photography & Asset Upload */}
      <div className="p-5 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-600" />
              Property Photography
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {runtimeMode === 'live' ? (
                <span className="text-amber-800 font-semibold">
                  Live Requirement: At least 1 authentic uploaded photo is required for compliance.
                </span>
              ) : (
                'Demo Mode: Local uploads, AI visuals, or bundled fixtures are permitted.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
              {realPhotosCount} Real Photos
            </span>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded">
              {conceptualPhotosCount} Conceptual
            </span>
          </div>
        </div>

        {/* Upload Button & Quick Add */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{isUploading ? 'Preparing photo...' : runtimeMode === 'live' ? 'Upload Authentic Property Photo' : 'Add Local Demo Photo'}</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Generate Conceptual AI Visual</span>
          </button>

          {runtimeMode === 'demo' && (
            <>
              <span className="text-xs text-slate-400">or add a fictional bundled fixture:</span>
              <div className="flex gap-1.5 overflow-x-auto py-1">
                {CURATED_STOCK_PHOTOS.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelectCuratedStock(photo)}
                    className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded text-[10px] text-slate-600 truncate max-w-[180px]"
                  >
                    + {photo.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Image Grid Preview - 6 columns on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pt-2">
          {uploadedImages.map((img) => {
            const isReal = img.source === 'upload' && !img.isAiIllustrative && img.provenance === 'uploaded';

            return (
              <div
                key={img.id}
                className={`relative group rounded-xl overflow-hidden border-2 bg-slate-950 aspect-[4/3] ${
                  img.isHero ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
                }`}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                
                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                  {img.isHero && (
                    <div className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-bold uppercase rounded shadow">
                      HERO
                    </div>
                  )}
                  <div className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow ${
                    isReal
                      ? 'bg-emerald-600 text-white'
                      : img.source === 'sample'
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-purple-700 text-white'
                  }`}>
                    {isReal ? 'REAL PHOTO' : img.source === 'sample' ? 'FIXTURE' : 'AI CONCEPT'}
                  </div>
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <button
                    type="button"
                    onClick={() => setHeroImage(img.id)}
                    className="px-2 py-1 bg-white/90 text-slate-900 text-[10px] font-bold rounded shadow self-start"
                  >
                    {img.isHero ? '✓ Hero' : 'Set Hero'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    aria-label={`Remove ${img.name}`}
                    className="p-1 bg-red-600 text-white rounded self-end hover:bg-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. DATA COVERAGE & COMPLETENESS SUMMARY */}
      <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-600" />
            Data Coverage & Downstream Claim Readiness
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Effective Title: <strong className="text-slate-800">{generateEffectiveTitle()}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px]">
          <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            completeness.photoStatus === 'complete'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : completeness.photoStatus === 'partial'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-red-50/70 border-red-200 text-red-900'
          }`}>
            <span className="text-xs font-bold">1. Photo</span>
            <span className="text-[10px] font-mono ml-auto uppercase font-semibold">
              {completeness.photoStatus === 'complete' ? 'Authentic' : completeness.photoStatus === 'partial' ? 'Concept Only' : 'Missing'}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            completeness.locationStatus === 'complete'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : completeness.locationStatus === 'partial'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span className="text-xs font-bold">2. Location</span>
            <span className="text-[10px] font-mono ml-auto uppercase font-semibold">
              {completeness.locationStatus}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            completeness.specsStatus === 'complete'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : completeness.specsStatus === 'partial'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span className="text-xs font-bold">3. Specs</span>
            <span className="text-[10px] font-mono ml-auto uppercase font-semibold">
              {completeness.specsStatus}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            completeness.financialStatus === 'complete'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span className="text-xs font-bold">4. Financials</span>
            <span className="text-[10px] font-mono ml-auto uppercase font-semibold">
              {completeness.financialStatus}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            completeness.thesisStatus === 'complete'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span className="text-xs font-bold">5. Thesis</span>
            <span className="text-[10px] font-mono ml-auto uppercase font-semibold">
              {completeness.thesisStatus}
            </span>
          </div>
        </div>

        {completeness.financialStatus === 'missing' && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Omitted underwriting metrics will automatically be excluded from marketing copy and presentation slides to maintain strict compliance.</span>
          </div>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={isCleaningDraft}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
          >
            {isCleaningDraft ? 'Cleaning up…' : 'Cancel'}
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Save & Proceed to Campaign Studio</span>
        </button>
      </div>

      {/* Concept Image Generator Modal */}
      <ImageGenerationModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onImageGenerated={(newImg) => {
          setUploadedImages((prev) => [...prev, newImg]);
        }}
        brandKit={DEFAULT_BRAND_KIT}
        targetMarket={targetMarket}
        propertyTitle={title || address || 'Residential Investment Property'}
        propertyType={campaignType}
        uploadedImages={uploadedImages}
        campaignId={campaignId}
        organizationId={organizationId}
        runtimeMode={runtimeMode}
      />
    </form>
  );
};
