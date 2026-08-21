import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SanitizedGraphicMaterial, SanitizedGraphicVariant, ReviewStatus } from '../../types/review';
import { BrandKit } from '../../types/brandKit';
import { Campaign } from '../../types/campaign';
import { DesignRenderer } from '../designs/DesignRenderer';
import {
  MaterialPreviewViewport,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from './MaterialPreviewViewport';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  Star,
  AlertCircle,
  Columns,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface MaterialLightboxModalProps {
  isOpen: boolean;
  material: SanitizedGraphicMaterial;
  activeVariant: SanitizedGraphicVariant;
  allMaterials: SanitizedGraphicMaterial[];
  brandKit: BrandKit;
  campaign: Campaign;
  currentStatus: ReviewStatus;
  isPreferred: boolean;
  allowSelection: boolean;
  allowApproval: boolean;
  allowComments: boolean;
  onSelectVariant: (variantId: string) => void;
  onMarkPreferred: (materialKey: string, variantKey: string) => void;
  onUpdateStatus: (materialKey: string, variantKey: string, status: ReviewStatus, comment?: string) => void;
  onOpenComparison: (material: SanitizedGraphicMaterial) => void;
  onNavigateMaterial: (material: SanitizedGraphicMaterial) => void;
  onClose: () => void;
}

export const MaterialLightboxModal: React.FC<MaterialLightboxModalProps> = ({
  isOpen,
  material,
  activeVariant,
  allMaterials,
  brandKit,
  campaign,
  currentStatus,
  isPreferred,
  allowSelection,
  allowApproval,
  allowComments,
  onSelectVariant,
  onMarkPreferred,
  onUpdateStatus,
  onOpenComparison,
  onNavigateMaterial,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Zoom management
  const [isFit, setIsFit] = useState(true);
  const [customZoomScale, setCustomZoomScale] = useState(1);
  const [currentScale, setCurrentScale] = useState(1);

  // Reset zoom to Fit whenever navigating to a different material
  useEffect(() => {
    setIsFit(true);
    setCustomZoomScale(1);
  }, [material.id, material.format]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement &&
          (document.fullscreenElement === modalRef.current ||
            modalRef.current?.contains(document.fullscreenElement))
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = modalRef.current;
    if (!el || typeof document === 'undefined') return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {
        document.documentElement.requestFullscreen?.().catch(() => {});
      });
    }
  }, []);

  const currentIndex = allMaterials.findIndex((m) => m.id === material.id);
  const handlePrevMaterial = useCallback(() => {
    if (currentIndex > 0) onNavigateMaterial(allMaterials[currentIndex - 1]);
  }, [currentIndex, allMaterials, onNavigateMaterial]);

  const handleNextMaterial = useCallback(() => {
    if (currentIndex < allMaterials.length - 1) onNavigateMaterial(allMaterials[currentIndex + 1]);
  }, [currentIndex, allMaterials, onNavigateMaterial]);

  const handleZoomIn = useCallback(() => {
    setIsFit(false);
    setCustomZoomScale((prev) => {
      const base = isFit ? currentScale : prev;
      return Math.min(MAX_ZOOM, base + ZOOM_STEP);
    });
  }, [isFit, currentScale]);

  const handleZoomOut = useCallback(() => {
    setIsFit(false);
    setCustomZoomScale((prev) => {
      const base = isFit ? currentScale : prev;
      return Math.max(MIN_ZOOM, base - ZOOM_STEP);
    });
  }, [isFit, currentScale]);

  const handleZoomFit = useCallback(() => {
    setIsFit(true);
  }, []);

  const handleToggle100Percent = useCallback(() => {
    if (!isFit && Math.abs(currentScale - 1) < 0.05) {
      setIsFit(true);
    } else {
      setIsFit(false);
      setCustomZoomScale(1.0);
    }
  }, [isFit, currentScale]);

  // Window Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomFit();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          handleToggleFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevMaterial();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextMaterial();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleZoomFit,
    handleToggleFullscreen,
    handlePrevMaterial,
    handleNextMaterial,
    onClose,
  ]);

  const handleSaveComment = () => {
    if (commentText.trim()) {
      onUpdateStatus(material.id, activeVariant.id, 'needs_changes', commentText.trim());
      setIsCommenting(false);
      setCommentText('');
    }
  };

  if (!isOpen) return null;

  const zoomPercentDisplay = Math.round(currentScale * 100);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col text-slate-100 animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${material.label} Lightbox View`}
    >
      {/* Top Bar / Header */}
      <div className="h-14 sm:h-16 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-slate-900/80 gap-3">
        {/* Left: Material Info */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider bg-slate-800 text-amber-400 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded font-bold shrink-0">
            {material.category.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-serif font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">{material.label}</span>
              <span className="text-[11px] sm:text-xs font-sans font-normal text-slate-400 shrink-0">
                · {activeVariant.name}
              </span>
            </h3>
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
              {material.dimensions.width} × {material.dimensions.height} px ({material.sublabel})
            </div>
          </div>
        </div>

        {/* Right: Actions & Zoom Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {material.variants.length > 1 && (
            <button
              onClick={() => onOpenComparison(material)}
              className="hidden md:flex px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
              title="Compare all variants"
            >
              <Columns className="w-3.5 h-3.5 text-amber-400" />
              <span>Compare ({material.variants.length})</span>
            </button>
          )}

          {/* Zoom Toolbar */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={handleZoomOut}
              disabled={currentScale <= MIN_ZOOM}
              className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 rounded transition-colors"
              aria-label="Zoom out"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggle100Percent}
              className={`px-1.5 sm:px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-colors ${
                isFit
                  ? 'text-amber-400 hover:bg-slate-700'
                  : 'text-slate-200 hover:bg-slate-700'
              }`}
              aria-label="Current zoom level"
              title="Click to toggle 100% / Fit"
            >
              {isFit ? `Fit · ${zoomPercentDisplay}%` : `${zoomPercentDisplay}%`}
            </button>

            <button
              onClick={handleZoomIn}
              disabled={currentScale >= MAX_ZOOM}
              className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 rounded transition-colors"
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleZoomFit}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                isFit
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              aria-label="Fit design to screen"
              title="Fit to screen (0)"
            >
              Fit
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle fullscreen"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
            aria-label="Close lightbox"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area — Reusable Viewport with Dual-Axis Fit */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-950/60 flex items-center justify-center">
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevMaterial}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-slate-900/80 hover:bg-slate-800 hover:scale-105 border border-slate-700 text-slate-200 rounded-full shadow-2xl transition-all z-20 backdrop-blur-xs cursor-pointer"
            aria-label="Previous material"
            title="Previous material (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        {currentIndex < allMaterials.length - 1 && (
          <button
            onClick={handleNextMaterial}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-slate-900/80 hover:bg-slate-800 hover:scale-105 border border-slate-700 text-slate-200 rounded-full shadow-2xl transition-all z-20 backdrop-blur-xs cursor-pointer"
            aria-label="Next material"
            title="Next material (Right Arrow)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Viewport Host */}
        <MaterialPreviewViewport
          aspectRatio={material.format}
          isFit={isFit}
          zoomScale={customZoomScale}
          onScaleChange={(scale, fit) => {
            setCurrentScale(scale);
            setIsFit(fit);
          }}
          enableKeyboardShortcuts={false}
          onClose={onClose}
          onPrevMaterial={handlePrevMaterial}
          onNextMaterial={handleNextMaterial}
          padding={24}
        >
          {({ scale }) => (
            <DesignRenderer
              campaign={campaign}
              aspectRatio={material.format}
              configOverride={activeVariant.config}
              brandKit={brandKit}
              scale={scale}
              previewMode="controlled"
            />
          )}
        </MaterialPreviewViewport>
      </div>

      {/* Bottom Variant Switcher & Feedback Actions */}
      <div className="border-t border-slate-800 bg-slate-900/90 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Variant Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 max-w-full">
          <span className="text-xs font-mono text-slate-400 mr-1 shrink-0">Variant:</span>
          {material.variants.map((v) => {
            const isSelected = v.id === activeVariant.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelectVariant(v.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{v.name}</span>
                {isPreferred && isSelected && (
                  <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                )}
              </button>
            );
          })}
        </div>

        {/* Reviewer Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {allowSelection && (
            <button
              onClick={() => onMarkPreferred(material.id, activeVariant.id)}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isPreferred
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isPreferred ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
              <span>{isPreferred ? '✓ Preferred' : 'Mark as Preferred'}</span>
            </button>
          )}

          {allowApproval && (
            <>
              <button
                onClick={() => onUpdateStatus(material.id, activeVariant.id, 'approved')}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentStatus === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-emerald-900/50 text-slate-200 border border-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentStatus === 'approved' ? 'Approved' : 'Approve'}</span>
              </button>

              <button
                onClick={() => setIsCommenting(!isCommenting)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentStatus === 'needs_changes'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 hover:bg-amber-900/50 text-slate-200 border border-slate-700'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Needs Changes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline Comment Panel */}
      {isCommenting && allowComments && (
        <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shrink-0">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Notes on ${activeVariant.name} (e.g. "Headline should emphasize the $70k spread")...`}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 sm:px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            autoFocus
          />
          <button
            onClick={handleSaveComment}
            disabled={!commentText.trim()}
            className="px-3.5 sm:px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Submit Note
          </button>
          <button
            onClick={() => setIsCommenting(false)}
            className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
