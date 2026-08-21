import React, { useState } from 'react';
import { SanitizedGraphicMaterial } from '../../types/review';
import { BrandKit } from '../../types/brandKit';
import { Campaign } from '../../types/campaign';
import { DesignRenderer } from '../designs/DesignRenderer';
import { MaterialPreviewViewport } from './MaterialPreviewViewport';
import { 
  X, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Layers,
  Maximize2
} from 'lucide-react';

interface VariantComparisonModalProps {
  isOpen: boolean;
  material: SanitizedGraphicMaterial;
  brandKit: BrandKit;
  campaign: Campaign;
  preferredVariantId?: string;
  allowSelection: boolean;
  onMarkPreferred: (materialKey: string, variantKey: string) => void;
  onClose: () => void;
  onOpenLightbox?: (material: SanitizedGraphicMaterial, variantId?: string) => void;
}

export const VariantComparisonModal: React.FC<VariantComparisonModalProps> = ({
  isOpen,
  material,
  brandKit,
  campaign,
  preferredVariantId,
  allowSelection,
  onMarkPreferred,
  onClose,
  onOpenLightbox,
}) => {
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  if (!isOpen) return null;

  const variants = material.variants;
  const currentPreferred = preferredVariantId || material.activeVariantId || variants[0]?.id;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col text-slate-100 animate-fadeIn overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Compare ${material.label} Variants`}
    >
      {/* Top Header */}
      <div className="h-14 sm:h-16 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-slate-900/80 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/40 rounded-lg flex items-center justify-center text-amber-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-serif font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">Compare Creative Versions</span>
              <span className="text-[11px] sm:text-xs font-sans font-normal text-slate-400 shrink-0">
                · {material.label}
              </span>
            </h2>
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
              Evaluating {variants.length} creative directions for this format ({material.dimensions.width}×{material.dimensions.height} px)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile indicator */}
          <div className="flex lg:hidden items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300">
            <span>{activeMobileIndex + 1}</span>
            <span className="text-slate-500">/</span>
            <span>{variants.length}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
            aria-label="Close comparison view"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Comparison Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-6 lg:p-8">
        {/* Desktop Side-by-Side Grid */}
        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1700px] mx-auto items-stretch">
          {variants.map((v, idx) => {
            const isPreferred = v.id === currentPreferred;
            const letter = String.fromCharCode(65 + idx); // A, B, C...

            return (
              <div 
                key={v.id}
                className={`bg-slate-900 rounded-2xl border transition-all flex flex-col overflow-hidden shadow-xl ${
                  isPreferred
                    ? 'border-amber-400/80 ring-2 ring-amber-400/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Variant Header */}
                <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold flex items-center justify-center text-amber-400 shrink-0">
                      {letter}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{v.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{v.description}</p>
                    </div>
                  </div>

                  {isPreferred && (
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold shrink-0 ml-2">
                      <Star className="w-3 h-3 fill-emerald-400" />
                      PREFERRED
                    </span>
                  )}
                </div>

                {/* Scaled Fit Preview Box (Bounded Height to fit entire creative) */}
                <div className="h-[48vh] max-h-[520px] min-h-[280px] w-full bg-slate-950 p-2 flex items-center justify-center overflow-hidden relative">
                  <MaterialPreviewViewport
                    aspectRatio={material.format}
                    isFit={true}
                    padding={8}
                    enablePanning={false}
                    enableWheelZoom={false}
                    enableKeyboardShortcuts={false}
                  >
                    {({ scale }) => (
                      <DesignRenderer
                        campaign={campaign}
                        aspectRatio={material.format}
                        configOverride={v.config}
                        brandKit={brandKit}
                        scale={scale}
                        previewMode="controlled"
                      />
                    )}
                  </MaterialPreviewViewport>
                </div>

                {/* Footer Action */}
                <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between mt-auto shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {material.dimensions.width}×{material.dimensions.height}
                  </span>

                  <div className="flex items-center gap-2">
                    {onOpenLightbox && (
                      <button
                        onClick={() => onOpenLightbox(material, v.id)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                        title="Inspect full screen with zoom"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {allowSelection && (
                      <button
                        onClick={() => onMarkPreferred(material.id, v.id)}
                        className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPreferred
                            ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                            : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isPreferred ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                        <span>{isPreferred ? '✓ Preferred' : 'Mark as Preferred'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile / Tablet Swipeable Layout */}
        <div className="lg:hidden flex flex-col items-center max-w-md mx-auto">
          {variants[activeMobileIndex] && (() => {
            const v = variants[activeMobileIndex];
            const isPreferred = v.id === currentPreferred;
            const letter = String.fromCharCode(65 + activeMobileIndex);

            return (
              <div className={`w-full bg-slate-900 rounded-2xl border overflow-hidden shadow-2xl ${
                isPreferred ? 'border-amber-400' : 'border-slate-800'
              }`}>
                {/* Mobile Variant Top */}
                <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold flex items-center justify-center text-amber-400 shrink-0">
                      {letter}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{v.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{v.description}</p>
                    </div>
                  </div>
                  {isPreferred && (
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold shrink-0 ml-2">
                      PREFERRED
                    </span>
                  )}
                </div>

                {/* Mobile Bounded Fit Preview */}
                <div className="h-[46vh] max-h-[440px] min-h-[260px] w-full bg-slate-950 p-2 flex items-center justify-center overflow-hidden">
                  <MaterialPreviewViewport
                    aspectRatio={material.format}
                    isFit={true}
                    padding={6}
                    enablePanning={false}
                    enableWheelZoom={false}
                    enableKeyboardShortcuts={false}
                  >
                    {({ scale }) => (
                      <DesignRenderer
                        campaign={campaign}
                        aspectRatio={material.format}
                        configOverride={v.config}
                        brandKit={brandKit}
                        scale={scale}
                        previewMode="controlled"
                      />
                    )}
                  </MaterialPreviewViewport>
                </div>

                {/* Mobile Bottom Action */}
                <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveMobileIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activeMobileIndex === 0}
                      className="p-2 bg-slate-800 disabled:opacity-30 rounded-lg text-slate-200 cursor-pointer"
                      aria-label="Previous variant"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveMobileIndex((prev) => Math.min(variants.length - 1, prev + 1))}
                      disabled={activeMobileIndex === variants.length - 1}
                      className="p-2 bg-slate-800 disabled:opacity-30 rounded-lg text-slate-200 cursor-pointer"
                      aria-label="Next variant"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {allowSelection && (
                    <button
                      onClick={() => onMarkPreferred(material.id, v.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                        isPreferred ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{isPreferred ? '✓ Preferred' : 'Mark Preferred'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
