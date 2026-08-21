import React, { useState } from 'react';
import { Campaign, GraphicDesignConfig, OutputAspectRatio, DesignTemplateFamily } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { FORMAT_DIMENSIONS, TEMPLATE_FAMILIES } from '../../types/designs';
import { DesignRenderer } from './DesignRenderer';
import { getAvailableMetrics } from '../../utils/formatters';
import { GraphicExporter } from '../../services/export/graphicExporter';
import { PdfExporter } from '../../services/export/pdfExporter';
import { 
  Sliders, 
  Download, 
  Layers, 
  Type, 
  Eye, 
  Check, 
  Sparkles,
  Maximize2,
  FileText,
  ShieldAlert
} from 'lucide-react';

interface DesignEditorProps {
  campaign: Campaign;
  brandKit: BrandKit;
  onSaveConfig: (aspectRatio: OutputAspectRatio, config: GraphicDesignConfig) => void;
}

export const DesignEditor: React.FC<DesignEditorProps> = ({
  campaign,
  brandKit,
  onSaveConfig,
}) => {
  const [activeFormat, setActiveFormat] = useState<OutputAspectRatio>('square');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [showSafeZones, setShowSafeZones] = useState(false);

  const currentConfig = campaign.designConfigs[activeFormat] || {
    templateFamily: 'editorial',
    aspectRatio: activeFormat,
    headline: campaign.sourceData.title,
    imageCropY: 50,
    imageZoom: 1.0,
    activeMetricIds: ['purchase', 'arv', 'spread'],
    showDisclaimer: true,
  };

  const handleUpdate = (updates: Partial<GraphicDesignConfig>) => {
    const updated: GraphicDesignConfig = {
      ...currentConfig,
      ...updates,
      aspectRatio: activeFormat,
    };
    onSaveConfig(activeFormat, updated);
  };

  const handleExportSingle = async () => {
    setIsExporting(true);
    setExportMessage(`Rendering ${FORMAT_DIMENSIONS[activeFormat].label}...`);

    try {
      const elementId = `rendered-design-${activeFormat}`;
      const filename = `${campaign.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeFormat}`;

      if (activeFormat === 'flyer_letter' || activeFormat === 'flyer_a4') {
        await PdfExporter.exportElementToPdf(
          elementId,
          `${filename}.pdf`,
          activeFormat === 'flyer_a4' ? 'a4' : 'letter'
        );
      } else {
        await GraphicExporter.exportToPng(elementId, `${filename}.png`);
      }
      setExportMessage('Export complete!');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Export error', err);
      setExportMessage(`Export failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const availableMetrics = getAvailableMetrics(campaign);
  const isFlyer = activeFormat === 'flyer_letter' || activeFormat === 'flyer_a4';

  return (
    <div className="space-y-6">
      {/* 1. Format Selector Ribbon */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(Object.keys(FORMAT_DIMENSIONS) as OutputAspectRatio[]).map((fmt) => {
            const dim = FORMAT_DIMENSIONS[fmt];
            const isActive = activeFormat === fmt;
            return (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {fmt.startsWith('flyer') ? <FileText className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{dim.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {activeFormat === 'story' && (
            <button
              onClick={() => setShowSafeZones(!showSafeZones)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                showSafeZones
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Safe Areas</span>
            </button>
          )}

          <button
            onClick={handleExportSingle}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : `Export ${isFlyer ? 'PDF' : 'High-Res PNG'}`}</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{exportMessage}</span>
        </div>
      )}

      {/* 2. Workspace: Left Controls & Right Live Canvas Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Template Family Selector (Social Formats Only) */}
          {!isFlyer && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-mono">
                  <Layers className="w-4 h-4 text-slate-500" />
                  Design Family
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">5 Styles Available</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {TEMPLATE_FAMILIES.map((family) => {
                  const isSelected = currentConfig.templateFamily === family.id;
                  return (
                    <button
                      key={family.id}
                      onClick={() => handleUpdate({ templateFamily: family.id as DesignTemplateFamily })}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{family.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{family.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Typography & Headline Editor */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-mono">
              <Type className="w-4 h-4 text-slate-500" />
              Headline & Text Overrides
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rendered Headline</label>
              <textarea
                rows={2}
                value={currentConfig.headline}
                onChange={(e) => handleUpdate({ headline: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                placeholder="Enter headline..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle / Location</label>
              <input
                type="text"
                value={currentConfig.subtitle || ''}
                onChange={(e) => handleUpdate({ subtitle: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                placeholder="Optional subtitle or submarket..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={currentConfig.customBadgeText || ''}
                  onChange={(e) => handleUpdate({ customBadgeText: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  placeholder="e.g. OFF-MARKET"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Button CTA Text</label>
                <input
                  type="text"
                  value={currentConfig.customCtaText || ''}
                  onChange={(e) => handleUpdate({ customCtaText: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  placeholder="e.g. INQUIRE"
                />
              </div>
            </div>
          </div>

          {/* Photo & Crop Position */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4 text-slate-500" />
              Photo Positioning & Framing
            </h3>

            {/* Photo Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Select Active Photo</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {campaign.sourceData.uploadedImages.map((img) => {
                  const isSelected = (currentConfig.imageId || campaign.sourceData.selectedHeroImageId) === img.id;
                  return (
                    <button
                      key={img.id}
                      onClick={() => handleUpdate({ imageId: img.id })}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        isSelected ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Alignment / Crop Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Vertical Crop Alignment</span>
                <span className="font-mono">{currentConfig.imageCropY}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentConfig.imageCropY}
                onChange={(e) => handleUpdate({ imageCropY: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
            </div>

            {/* Zoom Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Photo Zoom</span>
                <span className="font-mono">{currentConfig.imageZoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="100"
                max="160"
                value={Math.round(currentConfig.imageZoom * 100)}
                onChange={(e) => handleUpdate({ imageZoom: parseInt(e.target.value, 10) / 100 })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
            </div>
          </div>

          {/* Financial Metrics Toggle */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-mono">
              <Eye className="w-4 h-4 text-slate-500" />
              Toggle Active Underwriting Badges
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {availableMetrics.map((metric) => {
                const isActive = currentConfig.activeMetricIds.includes(metric.id);
                return (
                  <button
                    key={metric.id}
                    onClick={() => {
                      const newIds = isActive
                        ? currentConfig.activeMetricIds.filter((id) => id !== metric.id)
                        : [...currentConfig.activeMetricIds, metric.id];
                      handleUpdate({ activeMetricIds: newIds });
                    }}
                    className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-[9px] uppercase font-mono opacity-80">{metric.label}</div>
                      <div className="font-bold font-mono text-xs">{metric.value}</div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Live Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 text-xs text-slate-500 font-mono">
            <span>LIVE CANVAS PREVIEW ({FORMAT_DIMENSIONS[activeFormat].sublabel})</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Sparkles className="w-3 h-3" /> Real-time Deterministic Rendering
            </span>
          </div>

          {/* Preview Viewport Container */}
          <div className="w-full max-w-[560px] bg-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-300/80 shadow-inner flex items-center justify-center">
            <DesignRenderer
              id={`rendered-design-${activeFormat}`}
              campaign={campaign}
              aspectRatio={activeFormat}
              configOverride={currentConfig}
              brandKit={brandKit}
              showSafeZones={showSafeZones}
              className="rounded-lg shadow-elevated"
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3 max-w-md">
            Social graphics export at their exact declared pixel dimensions. Flyers export as high-resolution raster PDFs at the correct physical page size.
          </p>
        </div>
      </div>
    </div>
  );
};
