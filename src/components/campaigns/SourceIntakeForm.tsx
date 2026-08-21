import React, { useState } from 'react';
import { CampaignSourceData, CampaignType, CampaignImage } from '../../types/campaign';
import { CURATED_STOCK_PHOTOS } from '../../services/providers/imageProvider';
import { StorageService } from '../../services/supabase/storageService';
import { DEFAULT_BRAND_KIT } from '../../types/brandKit';
import { ImageGenerationModal } from '../images/ImageGenerationModal';
import { 
  DollarSign, 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2,
  MapPin,
  Loader2
} from 'lucide-react';

interface SourceIntakeFormProps {
  initialData?: Partial<CampaignSourceData>;
  organizationId?: string;
  campaignId?: string;
  runtimeMode?: 'demo' | 'live';
  onSave: (data: CampaignSourceData) => void;
  onCancel?: () => void;
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
  const [bedrooms, setBedrooms] = useState<number | ''>(initialData?.property?.bedrooms || '');
  const [bathrooms, setBathrooms] = useState<number | ''>(initialData?.property?.bathrooms || '');
  const [squareFeet, setSquareFeet] = useState<number | ''>(initialData?.property?.squareFeet || '');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(initialData?.property?.financials.purchasePrice || '');
  const [renovationEstimate, setRenovationEstimate] = useState<number | ''>(initialData?.property?.financials.renovationEstimate || '');
  const [arv, setArv] = useState<number | ''>(initialData?.property?.financials.arv || '');
  const [projectedRent, setProjectedRent] = useState<number | ''>(initialData?.property?.financials.projectedRentMonthly || '');
  const [capRate, setCapRate] = useState<number | ''>(initialData?.property?.financials.capRatePercent || '');
  const [investmentThesis, setInvestmentThesis] = useState(initialData?.property?.investmentThesis || '');
  const [dealHighlights, setDealHighlights] = useState(
    initialData?.property?.dealHighlights?.join('\n') || ''
  );
  const [uploadedImages, setUploadedImages] = useState<CampaignImage[]>(initialData?.uploadedImages || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const asset = await StorageService.uploadPropertyPhoto(
          organizationId,
          campaignId,
          file
        );

        const newImg: CampaignImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          url: asset.url,
          name: file.name,
          source: 'upload',
          aspectRatio: 1.5,
          isHero: uploadedImages.length === 0,
          provenance: 'uploaded',
          storageBucket: asset.bucket,
          storagePath: asset.path,
        };

        setUploadedImages((prev) => [...prev, newImg]);
      }
    } catch (err) {
      console.error('Photo upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectCuratedStock = (photo: (typeof CURATED_STOCK_PHOTOS)[number]) => {
    const newImg: CampaignImage = {
      id: `stock-${Date.now()}`,
      url: photo.url,
      name: photo.name,
      source: 'sample',
      aspectRatio: 1.5,
      isHero: uploadedImages.length === 0,
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
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pPrice = typeof purchasePrice === 'number' ? purchasePrice : undefined;
    const pReno = typeof renovationEstimate === 'number' ? renovationEstimate : undefined;
    const pArv = typeof arv === 'number' ? arv : undefined;
    const spread = pArv && pPrice ? pArv - pPrice - (pReno || 0) : undefined;

    const sourceData: CampaignSourceData = {
      campaignType,
      title: title || (address ? `${address} Opportunity` : `${targetMarket} Investment Brief`),
      targetMarket,
      uploadedImages,
      selectedHeroImageId: uploadedImages.find((img) => img.isHero)?.id || uploadedImages[0]?.id,
      property: {
        address,
        city,
        state,
        zipCode: zipCode || undefined,
        neighborhood: neighborhood || undefined,
        propertyType: campaignType === 'cash_flow_rental' ? 'multi_family' : 'single_family',
        bedrooms: typeof bedrooms === 'number' ? bedrooms : undefined,
        bathrooms: typeof bathrooms === 'number' ? bathrooms : undefined,
        squareFeet: typeof squareFeet === 'number' ? squareFeet : undefined,
        financials: {
          purchasePrice: pPrice,
          renovationEstimate: pReno,
          arv: pArv,
          projectedRentMonthly: typeof projectedRent === 'number' ? projectedRent : undefined,
          capRatePercent: typeof capRate === 'number' ? capRate : undefined,
          equitySpread: spread,
        },
        investmentThesis,
        dealHighlights: dealHighlights.split('\n').filter((h) => h.trim().length > 0),
      },
    };

    onSave(sourceData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 lg:p-10 rounded-2xl border border-slate-200 shadow-subtle w-full max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
          Campaign Intake & Property Underwriting
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Provide property details, underwriting metrics, and photos. Deterministic layout templates and the anti-slop copy engine will build your complete campaign package.
        </p>
      </div>

      {/* 1. Campaign Classification */}
      <div className="space-y-3">
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
          1. Campaign Objective & Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'fix_and_flip', label: 'Fix & Flip / Value-Add', desc: 'Short-term equity spread' },
            { id: 'cash_flow_rental', label: 'Cash Flow Rental / Multi', desc: 'Cap rate & long-term yield' },
            { id: 'wholesale_deal', label: 'Wholesale Assignment', desc: 'Fast investor disposition' },
            { id: 'market_update', label: 'Market Update / Insights', desc: 'Data & trend analysis' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setCampaignType(type.id as CampaignType)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                campaignType === type.id
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold">{type.label}</div>
              <div className="text-[10px] opacity-80 mt-0.5">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Core Location & Title */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="md:col-span-2 lg:col-span-3">
          <label htmlFor="campaign-working-title" className="block text-xs font-semibold text-slate-700 mb-1">Campaign Working Title</label>
          <input
            id="campaign-working-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="e.g. Phoenix Value-Add 3-Bed ($285k Basis)"
          />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <label htmlFor="target-metro-submarket" className="block text-xs font-semibold text-slate-700 mb-1">Target Metro / Submarket</label>
          <input
            id="target-metro-submarket"
            type="text"
            required
            value={targetMarket}
            onChange={(e) => setTargetMarket(e.target.value)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="e.g. Phoenix, AZ (Arcadia Lite)"
          />
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
            <label htmlFor="property-street-address" className="block text-xs text-slate-600 mb-1">Street Address</label>
            <input
              id="property-street-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. 4421 E Cambridge Ave"
            />
          </div>
          <div>
            <label htmlFor="property-city" className="block text-xs text-slate-600 mb-1">City</label>
            <input
              id="property-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. Phoenix"
            />
          </div>
          <div>
            <label htmlFor="property-state" className="block text-xs text-slate-600 mb-1">State</label>
            <input
              id="property-state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. AZ"
            />
          </div>
          <div>
            <label htmlFor="property-zip" className="block text-xs text-slate-600 mb-1">ZIP Code</label>
            <input
              id="property-zip"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="85008"
            />
          </div>
        </div>

        {/* Row 2: Neighborhood | Bedrooms | Bathrooms | Square Feet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="property-neighborhood" className="block text-xs text-slate-600 mb-1">Neighborhood</label>
            <input
              id="property-neighborhood"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. Arcadia Lite"
            />
          </div>
          <div>
            <label htmlFor="property-bedrooms" className="block text-xs text-slate-600 mb-1">Bedrooms</label>
            <input
              id="property-bedrooms"
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="3"
            />
          </div>
          <div>
            <label htmlFor="property-bathrooms" className="block text-xs text-slate-600 mb-1">Bathrooms</label>
            <input
              id="property-bathrooms"
              type="number"
              step="0.5"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="2"
            />
          </div>
          <div>
            <label htmlFor="property-square-feet" className="block text-xs text-slate-600 mb-1">Square Feet</label>
            <input
              id="property-square-feet"
              type="number"
              value={squareFeet}
              onChange={(e) => setSquareFeet(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              placeholder="1840"
            />
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
            <label htmlFor="financial-purchase-price" className="block text-xs font-semibold text-slate-700 mb-1">Purchase Price</label>
            <input
              id="financial-purchase-price"
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="285000"
            />
          </div>
          <div>
            <label htmlFor="financial-renovation-budget" className="block text-xs font-semibold text-slate-700 mb-1">Renovation Budget</label>
            <input
              id="financial-renovation-budget"
              type="number"
              value={renovationEstimate}
              onChange={(e) => setRenovationEstimate(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="35000"
            />
          </div>
          <div>
            <label htmlFor="financial-arv" className="block text-xs font-semibold text-slate-700 mb-1">After Repair Value (ARV)</label>
            <input
              id="financial-arv"
              type="number"
              value={arv}
              onChange={(e) => setArv(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="390000"
            />
          </div>
          <div>
            <label htmlFor="financial-projected-rent" className="block text-xs text-slate-600 mb-1">Projected Monthly Rent</label>
            <input
              id="financial-projected-rent"
              type="number"
              value={projectedRent}
              onChange={(e) => setProjectedRent(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="e.g. 2400"
            />
          </div>
          <div>
            <label htmlFor="financial-cap-rate" className="block text-xs text-slate-600 mb-1">Projected Cap Rate %</label>
            <input
              id="financial-cap-rate"
              type="number"
              step="0.1"
              value={capRate}
              onChange={(e) => setCapRate(e.target.value ? parseFloat(e.target.value) : '')}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="e.g. 9.4"
            />
          </div>
        </div>
      </div>

      {/* 5. Investment Thesis & Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <label htmlFor="investment-thesis" className="block text-xs font-semibold text-slate-700 mb-1">Investment Thesis & Scope Notes</label>
          <textarea
            id="investment-thesis"
            rows={3}
            value={investmentThesis}
            onChange={(e) => setInvestmentThesis(e.target.value)}
            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="Describe the opportunity, why you are buying, and scope..."
          />
        </div>
        <div>
          <label htmlFor="deal-highlights" className="block text-xs font-semibold text-slate-700 mb-1">Deal Highlights / Comp Notes (1 per line)</label>
          <textarea
            id="deal-highlights"
            rows={3}
            value={dealHighlights}
            onChange={(e) => setDealHighlights(e.target.value)}
            className="w-full text-xs p-3 border border-slate-300 rounded-lg font-mono text-[11px] focus:ring-1 focus:ring-slate-900 bg-white"
            placeholder="Enter key deal highlights..."
          />
        </div>
      </div>

      {/* 6. Photography & Asset Upload (Supabase Storage Enabled) */}
      <div className="p-5 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-600" />
            {runtimeMode === 'live' ? 'Property Photography (Private Storage)' : 'Demo Photography (Local Only)'}
          </h3>
          <span className="text-[11px] text-slate-500">{uploadedImages.length} photos ready</span>
        </div>

        {/* Upload Button & Quick Add */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{isUploading ? 'Preparing photo...' : runtimeMode === 'live' ? 'Upload to Private Storage' : 'Add Local Demo Photo'}</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Generate AI Concept Visual</span>
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
          {uploadedImages.map((img) => (
            <div
              key={img.id}
              className={`relative group rounded-xl overflow-hidden border-2 bg-slate-950 aspect-[4/3] ${
                img.isHero ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
              }`}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <button
                  type="button"
                  onClick={() => setHeroImage(img.id)}
                  className="px-2 py-1 bg-white/90 text-slate-900 text-[10px] font-bold rounded shadow self-start"
                >
                  {img.isHero ? '✓ Current Hero' : 'Set as Hero'}
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
              {img.isHero && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-bold uppercase rounded shadow">
                  HERO PHOTO
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
          >
            Cancel
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
