import React, { useState, useEffect, useRef } from 'react';
import { BrandKit, ColorPalette, TypographyFamily } from '../../types/brandKit';
import { createNeutralBrandKit } from '../../services/storage/brandKitStore';
import { StorageService } from '../../services/supabase/storageService';
import { BrandColorField } from './BrandColorField';
import { 
  Palette, 
  Type, 
  ShieldAlert, 
  Building2, 
  Check, 
  RotateCcw, 
  Eye, 
  Plus, 
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface BrandKitManagerProps {
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode?: 'demo' | 'live';
  onSaveBrandKit: (brandKit: BrandKit) => void;
}

const BRAND_COLOR_TOKENS: Array<{
  key: keyof ColorPalette;
  label: string;
  description: string;
}> = [
  { key: 'primary', label: 'Primary', description: 'Main brand & headlines' },
  { key: 'secondary', label: 'Secondary', description: 'Supporting accents & cards' },
  { key: 'accent', label: 'Accent', description: 'Call-to-action & badges' },
  { key: 'backgroundLight', label: 'Light Background', description: 'Editorial paper & surfaces' },
  { key: 'backgroundDark', label: 'Dark Background', description: 'Navy hero & dark mode' },
  { key: 'textPrimary', label: 'Primary Text', description: 'Body text & typography' },
];

export const BrandKitManager: React.FC<BrandKitManagerProps> = ({
  brandKit,
  organizationId = 'demo-org',
  runtimeMode = 'live',
  onSaveBrandKit,
}) => {
  const [formData, setFormData] = useState<BrandKit>(brandKit);
  const [newForbiddenWord, setNewForbiddenWord] = useState('');
  const [savedAlert, setSavedAlert] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);

  // Synchronize form data when brandKit prop updates across runtimes or on reset
  useEffect(() => {
    setFormData(brandKit);
  }, [brandKit]);

  const handleUpdate = (updates: Partial<BrandKit>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isDark = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isDark) {
      setUploadingDarkLogo(true);
    } else {
      setUploadingLogo(true);
    }

    try {
      const asset = await StorageService.uploadBrandLogo(organizationId, file);
      if (isDark) {
        handleUpdate({
          logoDarkUrl: asset.url,
          logoDarkStorageBucket: asset.bucket,
          logoDarkStoragePath: asset.path,
        });
      } else {
        handleUpdate({
          logoUrl: asset.url,
          logoStorageBucket: asset.bucket,
          logoStoragePath: asset.path,
        });
      }
    } catch (err) {
      console.error('Logo upload failed', err);
    } finally {
      if (isDark) {
        setUploadingDarkLogo(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleRemoveLogo = (isDark = false) => {
    if (isDark) {
      handleUpdate({
        logoDarkUrl: '',
        logoDarkStorageBucket: undefined,
        logoDarkStoragePath: undefined,
      });
    } else {
      handleUpdate({
        logoUrl: '',
        logoStorageBucket: undefined,
        logoStoragePath: undefined,
      });
    }
  };

  const handleColorUpdate = (key: keyof ColorPalette, val: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: val,
      },
    }));
  };

  const handleAddForbiddenWord = () => {
    if (!newForbiddenWord.trim()) return;
    const current = formData.forbiddenWords || [];
    if (!current.includes(newForbiddenWord.trim())) {
      handleUpdate({ forbiddenWords: [...current, newForbiddenWord.trim()] });
    }
    setNewForbiddenWord('');
  };

  const handleRemoveForbiddenWord = (word: string) => {
    handleUpdate({
      forbiddenWords: (formData.forbiddenWords || []).filter((w) => w !== word),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBrandKit(formData);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Clear optional brand identity fields and restore neutral style defaults?')) {
      const neutral = createNeutralBrandKit();
      setFormData(neutral);
      onSaveBrandKit(neutral);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-[1500px] mx-auto">
      {/* 1. Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              {runtimeMode === 'demo' ? 'DEMO BRAND SYSTEM · FICTIONAL IDENTITY' : 'GLOBAL BRAND SYSTEM'}
            </span>
            {runtimeMode === 'demo' && (
              <span className="text-[10px] text-amber-800 font-mono font-medium">
                (Apex Capital Fixture)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 mt-1">Brand Kit & Identity</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure company identity, color tokens, typography, and legal compliance disclaimers inherited across all marketing outputs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear to Neutral</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>Save Brand Kit</span>
          </button>
        </div>
      </div>

      {savedAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Brand Kit saved successfully! All campaign templates and copy have inherited these settings.</span>
        </div>
      )}

      {/* 2. Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Company Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              Company Identity & Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Fund Name</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => handleUpdate({ companyName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">License / DRE Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber || ''}
                  onChange={(e) => handleUpdate({ licenseNumber: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                  placeholder="e.g. AZ DRE #LC682019000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Website URL</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleUpdate({ website: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleUpdate({ phone: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Inquiry Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleUpdate({ email: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Brand Logos & Visual Marks */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                Brand Logos & Visual Marks
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Private Storage Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Logo */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Primary Logo (Light Surfaces)</label>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLogo(false)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="h-24 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden p-2">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Primary Brand Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">No primary logo uploaded</span>
                  )}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => void handleLogoUpload(e, false)}
                />

                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>{uploadingLogo ? 'Uploading to Storage...' : 'Upload Primary Logo'}</span>
                </button>
              </div>

              {/* Dark Mode Logo */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">Dark Logo (Dark Surfaces)</label>
                  {formData.logoDarkUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLogo(true)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="h-24 bg-slate-950 border border-dashed border-slate-800 rounded-lg flex items-center justify-center overflow-hidden p-2">
                  {formData.logoDarkUrl ? (
                    <img
                      src={formData.logoDarkUrl}
                      alt="Dark Mode Brand Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">No dark logo uploaded</span>
                  )}
                </div>

                <input
                  ref={logoDarkInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => void handleLogoUpload(e, true)}
                />

                <button
                  type="button"
                  disabled={uploadingDarkLogo}
                  onClick={() => logoDarkInputRef.current?.click()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {uploadingDarkLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{uploadingDarkLogo ? 'Uploading to Storage...' : 'Upload Dark Logo'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-600" />
                Brand Color Palette
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">6 Token Palette</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {BRAND_COLOR_TOKENS.map((token) => (
                <BrandColorField
                  key={token.key}
                  colorKey={token.key}
                  label={token.label}
                  description={token.description}
                  value={formData.colors[token.key]}
                  onChange={(val) => handleColorUpdate(token.key, val)}
                />
              ))}
            </div>
          </div>

          {/* Typography Pairings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-600" />
              Typography Pairings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'editorial_serif',
                  name: 'Editorial Serif',
                  headline: 'Playfair Display',
                  body: 'Inter',
                  desc: 'High-contrast luxury editorial look for premium offerings',
                },
                {
                  id: 'modern_sans',
                  name: 'Modern Clean Sans',
                  headline: 'Inter Bold',
                  body: 'Inter Regular',
                  desc: 'Contemporary, high-legibility tech/brokerage aesthetic',
                },
                {
                  id: 'institutional_mono',
                  name: 'Institutional Financial',
                  headline: 'Playfair + Mono',
                  body: 'JetBrains Mono',
                  desc: 'Disciplined numbers-first investment fund look',
                },
                {
                  id: 'luxury_display',
                  name: 'Architectural Editorial',
                  headline: 'Instrument Serif',
                  body: 'Inter',
                  desc: 'Refined architectural magazine typography',
                },
              ].map((p) => {
                const isSelected = formData.typography.familyPairing === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        typography: {
                          ...formData.typography,
                          familyPairing: p.id as TypographyFamily,
                          headlineFont: p.headline,
                        },
                      })
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{p.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      {p.headline} + {p.body}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legal Compliance & Forbidden Words */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Legal Compliance & Anti-Slop Safeguards
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Legal / Risk Disclaimer
              </label>
              <textarea
                rows={3}
                value={formData.requiredDisclaimer}
                onChange={(e) => handleUpdate({ requiredDisclaimer: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-600 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Forbidden Brand Terms & Clichés
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(formData.forbiddenWords || []).map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-medium"
                  >
                    <span>"{word}"</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveForbiddenWord(word)}
                      className="hover:text-red-950"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newForbiddenWord}
                  onChange={(e) => setNewForbiddenWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddForbiddenWord();
                    }
                  }}
                  placeholder="Add custom banned word or claim (e.g. 'can't lose')..."
                  className="flex-1 text-xs p-2 border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddForbiddenWord}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Identity Preview Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="sticky top-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              Live Brand Preview
            </h3>

            {/* Mock Brand Card */}
            <div
              className="p-5 rounded-xl border space-y-4"
              style={{
                backgroundColor: formData.colors.backgroundLight,
                borderColor: formData.colors.primary + '30',
                color: formData.colors.textPrimary,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <span
                  className="font-serif font-bold text-sm"
                  style={{ color: formData.colors.primary }}
                >
                  {formData.companyName.toUpperCase()}
                </span>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 uppercase font-bold"
                  style={{
                    backgroundColor: formData.colors.accent + '20',
                    color: formData.colors.accent,
                  }}
                >
                  ACQUISITIONS
                </span>
              </div>

              <div>
                <h4
                  className="font-serif font-bold text-lg leading-tight"
                  style={{ color: formData.colors.primary }}
                >
                  Phoenix Value-Add Single Family Flip
                </h4>
                <p className="text-xs opacity-75 mt-1 font-sans">
                  $285,000 Purchase Basis | $70,000 Gross Spread
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  className="p-2 rounded border"
                  style={{
                    backgroundColor: formData.colors.primary + '10',
                    borderColor: formData.colors.primary + '20',
                  }}
                >
                  <span className="text-[9px] font-mono block opacity-70">ENTRY</span>
                  <span className="font-bold font-mono">$285,000</span>
                </div>
                <div
                  className="p-2 rounded border"
                  style={{
                    backgroundColor: formData.colors.accent + '15',
                    borderColor: formData.colors.accent + '40',
                  }}
                >
                  <span className="text-[9px] font-mono block opacity-70">SPREAD</span>
                  <span className="font-bold font-mono" style={{ color: formData.colors.accent }}>
                    $70,000
                  </span>
                </div>
              </div>

              <div
                className="py-2 px-3 text-center text-xs font-bold uppercase tracking-wider text-white shadow-sm"
                style={{ backgroundColor: formData.colors.primary }}
              >
                REQUEST PRO FORMA
              </div>

              <div className="text-[9px] font-mono opacity-60 text-center">
                {formData.phone} • {formData.website}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
