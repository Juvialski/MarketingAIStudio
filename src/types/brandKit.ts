/**
 * Brand Kit Type Definitions
 */

export interface ColorPalette {
  primary: string; // e.g. '#0f172a' (Slate 900)
  secondary: string; // e.g. '#1b3b2b' (Forest) or '#1c2e56' (Navy)
  accent: string; // e.g. '#c85a32' (Terracotta) or '#c59b27' (Gold)
  backgroundLight: string; // e.g. '#fdfbf7' (Warm Paper)
  backgroundDark: string; // e.g. '#0a1128' (Deep Navy)
  textPrimary: string;
  textMuted: string;
}

export type TypographyFamily = 'editorial_serif' | 'modern_sans' | 'institutional_mono' | 'luxury_display';

export interface TypographyConfig {
  headlineFont: string; // e.g. 'Playfair Display', 'Instrument Serif', 'Inter'
  bodyFont: string; // e.g. 'Inter'
  monoFont: string; // e.g. 'JetBrains Mono'
  familyPairing: TypographyFamily;
}

export interface BrandKit {
  id: string;
  isDefault: boolean;
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  website: string;
  phone: string;
  email: string;
  licenseNumber?: string; // e.g. "DRE #01928472"
  colors: ColorPalette;
  typography: TypographyConfig;
  toneOfVoice: 'institutional' | 'analytical_investor' | 'luxury_concierge' | 'approachable_local' | 'direct_response';
  targetAudienceDefault: string;
  preferredCta: string;
  requiredDisclaimer: string;
  forbiddenWords: string[];
  imageStylePreference: 'authentic_photos_first' | 'editorial_clean' | 'architectural_minimal';
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'brand-default',
  isDefault: true,
  companyName: 'Apex Capital & Acquisitions',
  tagline: 'Institutional Quality Real Estate Investments & Value-Add Opportunities',
  logoUrl: '',
  website: 'www.apexcapitalpartners.com',
  phone: '(480) 555-0194',
  email: 'acquisitions@apexcapitalpartners.com',
  licenseNumber: 'AZ DRE #LC682019000',
  colors: {
    primary: '#0f172a',
    secondary: '#1b3b2b',
    accent: '#c85a32',
    backgroundLight: '#fdfbf7',
    backgroundDark: '#0a1128',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
  },
  typography: {
    headlineFont: 'Playfair Display',
    bodyFont: 'Inter',
    monoFont: 'JetBrains Mono',
    familyPairing: 'editorial_serif',
  },
  toneOfVoice: 'analytical_investor',
  targetAudienceDefault: 'Accredited real estate investors, private equity partners, and value-add operators',
  preferredCta: 'Request Detailed Investment Memorandum & Underwriting Pro Forma',
  requiredDisclaimer: 'All investments carry risk. Pro forma estimates, ARV projections, and renovation budgets are provided for underwriting analysis only and do not constitute guaranteed returns. Conduct independent due diligence.',
  forbiddenWords: [
    'guaranteed returns',
    'get rich quick',
    'can’t lose',
    'game-changer',
    'nestled in the heart of',
    'unlock the secret',
    'hurry before it’s gone',
  ],
  imageStylePreference: 'authentic_photos_first',
};
