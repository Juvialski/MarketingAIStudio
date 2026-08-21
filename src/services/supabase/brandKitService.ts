import { supabase, isSupabaseConfigured } from './client';
import { BrandKit, DEFAULT_BRAND_KIT, ColorPalette, TypographyConfig } from '../../types/brandKit';
import { BrandKitStore } from '../storage/brandKitStore';
import { Database, Json } from '../../types/database.types';
import { ServiceError } from './serviceError';

type BrandKitRow = Database['public']['Tables']['brand_kits']['Row'];
type BrandKitInsert = Database['public']['Tables']['brand_kits']['Insert'];
type BrandKitUpdate = Database['public']['Tables']['brand_kits']['Update'];

const asColorPalette = (value: Json): ColorPalette =>
  (value as unknown as ColorPalette) || DEFAULT_BRAND_KIT.colors;

const asTypography = (value: Json): TypographyConfig =>
  (value as unknown as TypographyConfig) || DEFAULT_BRAND_KIT.typography;

const mapRowToBrandKit = (row: BrandKitRow): BrandKit => ({
  id: row.id,
  isDefault: row.is_default,
  companyName: row.company_name,
  tagline: row.tagline || undefined,
  logoUrl: row.logo_url || undefined,
  logoDarkUrl: row.logo_dark_url || undefined,
  website: row.website || '',
  phone: row.phone || '',
  email: row.email || '',
  licenseNumber: row.license_number || undefined,
  colors: asColorPalette(row.colors),
  typography: asTypography(row.typography),
  toneOfVoice: (row.tone_of_voice as BrandKit['toneOfVoice']) || 'institutional',
  targetAudienceDefault: row.target_audience_default || '',
  preferredCta: row.preferred_cta || '',
  requiredDisclaimer: row.required_disclaimer || '',
  forbiddenWords: row.forbidden_words || [],
  imageStylePreference:
    (row.image_style_preference as BrandKit['imageStylePreference']) || 'authentic_photos_first',
});

const toPayload = (organizationId: string, brandKit: BrandKit): BrandKitInsert => ({
  organization_id: organizationId,
  company_name: brandKit.companyName,
  tagline: brandKit.tagline || null,
  logo_url: brandKit.logoUrl || null,
  logo_dark_url: brandKit.logoDarkUrl || null,
  website: brandKit.website || null,
  phone: brandKit.phone || null,
  email: brandKit.email || null,
  license_number: brandKit.licenseNumber || null,
  colors: brandKit.colors as unknown as Json,
  typography: brandKit.typography as unknown as Json,
  tone_of_voice: brandKit.toneOfVoice,
  target_audience_default: brandKit.targetAudienceDefault,
  preferred_cta: brandKit.preferredCta,
  required_disclaimer: brandKit.requiredDisclaimer,
  forbidden_words: brandKit.forbiddenWords,
  image_style_preference: brandKit.imageStylePreference,
});

const toUpdatePayload = (organizationId: string, brandKit: BrandKit): BrandKitUpdate => {
  const payload = toPayload(organizationId, brandKit);
  const { organization_id: _organizationId, ...updates } = payload;
  return updates;
};

export class BrandKitService {
  public static async getBrandKit(organizationId: string): Promise<BrandKit | null> {
    if (!isSupabaseConfigured()) {
      return BrandKitStore.get({ allowDemoFixtures: true });
    }

    const { data, error } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ServiceError('query_failed', 'Unable to load the organization brand kit.', error);
    }
    return data ? mapRowToBrandKit(data as BrandKitRow) : null;
  }

  public static async createBrandKit(organizationId: string, brandKit: BrandKit): Promise<BrandKit> {
    if (!isSupabaseConfigured()) return BrandKitStore.save(brandKit);

    const { data, error } = await supabase
      .from('brand_kits')
      .insert(toPayload(organizationId, brandKit))
      .select('*')
      .single();

    if (error || !data) {
      throw new ServiceError('write_failed', 'Unable to create the organization brand kit.', error);
    }
    const saved = mapRowToBrandKit(data as BrandKitRow);
    return saved;
  }

  public static async updateBrandKit(organizationId: string, brandKit: BrandKit): Promise<BrandKit> {
    if (!brandKit.id) {
      throw new ServiceError('not_found', 'A saved brand kit ID is required for an update.');
    }
    if (!isSupabaseConfigured()) return BrandKitStore.save(brandKit);

    const updates: BrandKitUpdate = toUpdatePayload(organizationId, brandKit);
    const { data, error } = await supabase
      .from('brand_kits')
      .update(updates)
      .eq('id', brandKit.id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error || !data) {
      throw new ServiceError(error ? 'write_failed' : 'not_found', 'Unable to update the organization brand kit.', error);
    }
    const saved = mapRowToBrandKit(data as BrandKitRow);
    return saved;
  }

  /** Explicit operation selection avoids inferring create/update from IDs. */
  public static async saveBrandKit(
    organizationId: string,
    brandKit: BrandKit,
    operation: 'create' | 'update' = 'update'
  ): Promise<BrandKit> {
    if (!isSupabaseConfigured()) return BrandKitStore.save(brandKit);
    return operation === 'create'
      ? this.createBrandKit(organizationId, brandKit)
      : this.updateBrandKit(organizationId, brandKit);
  }
}
