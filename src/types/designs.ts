/**
 * Graphic Design and Template Layout Definitions
 */

import { OutputAspectRatio, DesignTemplateFamily } from './campaign';

export interface CanvasDimensions {
  width: number;
  height: number;
  label: string;
  sublabel: string;
  cssAspectRatio: string;
  exportFormat: 'png' | 'jpeg' | 'pdf';
  isPrint: boolean;
}

export const FORMAT_DIMENSIONS: Record<OutputAspectRatio, CanvasDimensions> = {
  square: {
    width: 1080,
    height: 1080,
    label: 'Instagram Square',
    sublabel: '1:1 Feed Post (1080×1080)',
    cssAspectRatio: '1/1',
    exportFormat: 'png',
    isPrint: false,
  },
  portrait: {
    width: 1080,
    height: 1350,
    label: 'Instagram Portrait',
    sublabel: '4:5 Feed Post (1080×1350)',
    cssAspectRatio: '4/5',
    exportFormat: 'png',
    isPrint: false,
  },
  story: {
    width: 1080,
    height: 1920,
    label: 'Story / Reel / TikTok',
    sublabel: '9:16 Full Screen (1080×1920)',
    cssAspectRatio: '9/16',
    exportFormat: 'png',
    isPrint: false,
  },
  landscape: {
    width: 1200,
    height: 630,
    label: 'Facebook & LinkedIn Banner',
    sublabel: '1.91:1 Landscape (1200×630)',
    cssAspectRatio: '1.91/1',
    exportFormat: 'png',
    isPrint: false,
  },
  flyer_letter: {
    width: 2550, // 8.5" x 300 dpi
    height: 3300, // 11" x 300 dpi
    label: 'Printable Investment Flyer (US Letter)',
    sublabel: '8.5" × 11" (300 DPI High-Res Print)',
    cssAspectRatio: '8.5/11',
    exportFormat: 'pdf',
    isPrint: true,
  },
  flyer_a4: {
    width: 2480, // 210mm x 300 dpi
    height: 3508, // 297mm x 300 dpi
    label: 'Printable Investment Flyer (A4)',
    sublabel: '210mm × 297mm (300 DPI High-Res Print)',
    cssAspectRatio: '210/297',
    exportFormat: 'pdf',
    isPrint: true,
  },
};

export interface TemplateFamilyMetadata {
  id: DesignTemplateFamily;
  name: string;
  description: string;
  idealFor: string;
  badgeStyle: 'minimal' | 'solid_tag' | 'pill' | 'editorial_box';
  headlineTone: string;
  previewBg: string;
}

export const TEMPLATE_FAMILIES: TemplateFamilyMetadata[] = [
  {
    id: 'editorial',
    name: 'Editorial Real Estate',
    description: 'Magazine-grade editorial composition, sophisticated serif typography, generous whitespace, and prominent hero photography.',
    idealFor: 'Luxury properties, high-end flips, architectural updates, executive investment offerings',
    badgeStyle: 'editorial_box',
    headlineTone: 'Refined, cultured, authoritative',
    previewBg: 'bg-stone-900 text-stone-100',
  },
  {
    id: 'institutional',
    name: 'Institutional Investment',
    description: 'Investment-firm financial aesthetic with high-contrast data grid, numerical hierarchy, and formal underwriting metrics.',
    idealFor: 'Commercial syndications, multi-family acquisitions, private capital offerings, fund updates',
    badgeStyle: 'solid_tag',
    headlineTone: 'Analytical, disciplined, institutional',
    previewBg: 'bg-slate-900 text-slate-100',
  },
  {
    id: 'modern_brokerage',
    name: 'Modern Brokerage',
    description: 'Crisp contemporary real estate marketing with sans-serif typography, clean visual blocks, and photo-forward layout.',
    idealFor: 'Turnkey rentals, newly listed value-add properties, agent-investor partnerships',
    badgeStyle: 'pill',
    headlineTone: 'Clean, direct, contemporary',
    previewBg: 'bg-zinc-900 text-zinc-100',
  },
  {
    id: 'direct_response',
    name: 'Direct Response Investor',
    description: 'High-conversion deal economics highlighting purchase-to-ARV spread, projected cash-on-cash return, and urgent buyer CTAs.',
    idealFor: 'Wholesale assignments, quick-close fix-and-flip deals, investor list blasts',
    badgeStyle: 'solid_tag',
    headlineTone: 'High-energy, quantitative, action-oriented',
    previewBg: 'bg-emerald-950 text-emerald-100',
  },
  {
    id: 'market_intelligence',
    name: 'Market Intelligence & Data',
    description: 'Structured report layout featuring market trend stats, cap rate benchmarks, and educational takeaways.',
    idealFor: 'Quarterly market updates, neighborhood migration analysis, educational investor insights',
    badgeStyle: 'minimal',
    headlineTone: 'Data-driven, macroeconomic, insightful',
    previewBg: 'bg-slate-950 text-amber-200',
  },
];
