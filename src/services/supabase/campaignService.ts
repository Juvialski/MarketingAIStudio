import { supabase, isSupabaseConfigured } from './client';
import {
  Campaign,
  CampaignCopy,
  CampaignSourceData,
  CampaignStrategy,
  GraphicDesignConfig,
  OutputAspectRatio,
} from '../../types/campaign';
import { PresentationDeck } from '../../types/presentation';
import { CampaignStore } from '../storage/campaignStore';
import { Database, Json } from '../../types/database.types';
import { ServiceError } from './serviceError';
import { StorageBucket, StorageService } from './storageService';

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
type CampaignUpdate = Database['public']['Tables']['campaigns']['Update'];
type CampaignContentInsert = Database['public']['Tables']['campaign_content']['Insert'];
type CampaignContentRow = Database['public']['Tables']['campaign_content']['Row'];

interface CampaignQueryRow extends CampaignRow {
  campaign_content?: CampaignContentRow[] | null;
}

const localId = (): string => {
  const cryptoObject = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObject?.randomUUID) return `demo-${cryptoObject.randomUUID()}`;
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const asJson = (value: unknown): Json => value as Json;

const toPayload = (
  organizationId: string,
  campaign: Campaign,
  userId?: string
): CampaignInsert => ({
  organization_id: organizationId,
  created_by: userId || null,
  name: campaign.name,
  campaign_type: campaign.sourceData.campaignType,
  target_market: campaign.sourceData.targetMarket,
  status: campaign.status,
  source_data: asJson(campaign.sourceData),
  strategy: campaign.strategy ? asJson(campaign.strategy) : null,
  design_configs: asJson(campaign.designConfigs),
  tags: campaign.tags || [],
});

const toUpdatePayload = (
  organizationId: string,
  campaign: Campaign,
  userId?: string
): CampaignUpdate => {
  const payload = toPayload(organizationId, campaign, userId);
  const { organization_id: _organizationId, ...updates } = payload;
  return updates;
};

const mapRowToCampaign = (row: CampaignQueryRow): Campaign => {
  const copyContent = row.campaign_content?.find((content) => content.content_type === 'all_package');
  const copy = copyContent?.content as unknown as CampaignCopy | undefined;

  const presentationContent = row.campaign_content?.find((content) => content.content_type === 'presentation_deck');
  const presentation = presentationContent?.content as unknown as PresentationDeck | undefined;

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    sourceData: row.source_data as unknown as CampaignSourceData,
    strategy: row.strategy as unknown as CampaignStrategy | undefined,
    copy,
    presentation,
    designConfigs: row.design_configs as unknown as Record<OutputAspectRatio, GraphicDesignConfig>,
    tags: row.tags || [],
  };
};

const hydrateSignedAssetUrls = async (campaign: Campaign): Promise<Campaign> => {
  const uploadedImages = await Promise.all(
    campaign.sourceData.uploadedImages.map(async (image) => {
      if (!image.storageBucket || !image.storagePath) return image;
      try {
        const url = await StorageService.getSignedUrl(
          image.storageBucket as StorageBucket,
          image.storagePath
        );
        return { ...image, url };
      } catch {
        // Preserve canonical identity and let the UI show its normal broken/
        // unavailable asset state rather than substituting fictional media.
        return { ...image, url: '' };
      }
    })
  );
  return { ...campaign, sourceData: { ...campaign.sourceData, uploadedImages } };
};

export class CampaignService {
  private static requireOrganization(organizationId: string): void {
    if (!organizationId) {
      throw new ServiceError('forbidden', 'A live organization is required for this operation.');
    }
  }

  public static async getCampaigns(organizationId: string): Promise<Campaign[]> {
    if (!isSupabaseConfigured()) {
      return CampaignStore.getAll({ allowDemoFixtures: true });
    }
    this.requireOrganization(organizationId);

    const { data, error } = await supabase
      .from('campaigns')
      .select('*, campaign_content(*)')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new ServiceError('query_failed', 'Unable to load campaigns for this organization.', error);
    }
    // Empty is a valid live workspace state and must not become fictional data.
    const rows = (data || []) as unknown as CampaignQueryRow[];
    return Promise.all(rows.map((row) => hydrateSignedAssetUrls(mapRowToCampaign(row))));
  }

  public static async getCampaignById(id: string, organizationId?: string): Promise<Campaign | null> {
    if (!isSupabaseConfigured()) {
      return CampaignStore.getById(id, { allowDemoFixtures: true }) || null;
    }
    if (!id) throw new ServiceError('not_found', 'A campaign ID is required.');
    this.requireOrganization(organizationId || '');

    let query = supabase.from('campaigns').select('*, campaign_content(*)').eq('id', id);
    query = query.eq('organization_id', organizationId!);
    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new ServiceError('query_failed', 'Unable to load the campaign.', error);
    }
    return data ? hydrateSignedAssetUrls(mapRowToCampaign(data as unknown as CampaignQueryRow)) : null;
  }

  private static async persistContent(organizationId: string, campaign: Campaign): Promise<void> {
    if (campaign.copy) {
      const payload: CampaignContentInsert = {
        campaign_id: campaign.id,
        organization_id: organizationId,
        content_type: 'all_package',
        content: asJson(campaign.copy),
        quality_report: campaign.copy.qualityReport ? asJson(campaign.copy.qualityReport) : null,
        is_accepted: true,
        version: 1,
      };
      const { data: existing, error: lookupError } = await supabase
        .from('campaign_content')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('content_type', 'all_package')
        .eq('version', 1)
        .maybeSingle();
      if (lookupError) {
        throw new ServiceError('write_failed', 'Campaign copy content could not be inspected before saving.', lookupError);
      }

      const write = existing
        ? await supabase.from('campaign_content').update(payload).eq('id', existing.id)
        : await supabase.from('campaign_content').insert(payload);
      if (write.error) {
        throw new ServiceError('write_failed', 'Campaign copy content could not be saved.', write.error);
      }
    }

    if (campaign.presentation) {
      const presPayload: CampaignContentInsert = {
        campaign_id: campaign.id,
        organization_id: organizationId,
        content_type: 'presentation_deck',
        content: asJson(campaign.presentation),
        is_accepted: true,
        version: 1,
      };
      const { data: existingPres, error: presLookupError } = await supabase
        .from('campaign_content')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('content_type', 'presentation_deck')
        .eq('version', 1)
        .maybeSingle();
      if (presLookupError) {
        throw new ServiceError('write_failed', 'Campaign presentation content could not be inspected before saving.', presLookupError);
      }

      const writePres = existingPres
        ? await supabase.from('campaign_content').update(presPayload).eq('id', existingPres.id)
        : await supabase.from('campaign_content').insert(presPayload);
      if (writePres.error) {
        throw new ServiceError('write_failed', 'Campaign presentation content could not be saved.', writePres.error);
      }
    }
  }

  /** Inserts without a client-generated ID; Supabase returns the canonical UUID row. */
  public static async createCampaign(
    organizationId: string,
    draft: Campaign,
    userId?: string
  ): Promise<Campaign> {
    if (!isSupabaseConfigured()) {
      const localCampaign = { ...draft, id: localId() };
      return CampaignStore.save(localCampaign, { allowDemoFixtures: true });
    }
    this.requireOrganization(organizationId);

    const { data, error } = await supabase
      .from('campaigns')
      .insert(toPayload(organizationId, draft, userId))
      .select('*')
      .single();
    if (error || !data) {
      throw new ServiceError('write_failed', 'Campaign creation failed.', error);
    }

    const saved = {
      ...mapRowToCampaign(data as unknown as CampaignQueryRow),
      copy: draft.copy,
      presentation: draft.presentation,
    };
    await this.persistContent(organizationId, saved);
    return saved;
  }

  public static async updateCampaign(
    organizationId: string,
    campaign: Campaign,
    userId?: string
  ): Promise<Campaign> {
    if (!campaign.id) throw new ServiceError('not_found', 'A campaign ID is required for an update.');
    if (!isSupabaseConfigured()) return CampaignStore.save(campaign, { allowDemoFixtures: true });
    this.requireOrganization(organizationId);

    const { data, error } = await supabase
      .from('campaigns')
      .update(toUpdatePayload(organizationId, campaign, userId))
      .eq('id', campaign.id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error || !data) {
      throw new ServiceError(error ? 'write_failed' : 'not_found', 'Campaign update failed.', error);
    }

    const saved = {
      ...mapRowToCampaign(data as unknown as CampaignQueryRow),
      copy: campaign.copy,
      presentation: campaign.presentation,
    };
    await this.persistContent(organizationId, saved);
    return saved;
  }

  /** Explicit operation selection avoids guessing from client ID prefixes. */
  public static async saveCampaign(
    organizationId: string,
    campaign: Campaign,
    userId?: string,
    operation: 'create' | 'update' = 'update'
  ): Promise<Campaign> {
    return operation === 'create'
      ? this.createCampaign(organizationId, campaign, userId)
      : this.updateCampaign(organizationId, campaign, userId);
  }

  public static async deleteCampaign(id: string, organizationId?: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      CampaignStore.delete(id);
      return;
    }
    if (!organizationId) throw new ServiceError('forbidden', 'A live organization is required to delete a campaign.');

    const { data, error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('id');
    if (error) throw new ServiceError('write_failed', 'Campaign deletion failed.', error);
    if (!data || data.length === 0) throw new ServiceError('not_found', 'Campaign was not found.');
  }

  public static async duplicateCampaign(
    id: string,
    organizationId: string,
    userId?: string
  ): Promise<Campaign | null> {
    const original = await this.getCampaignById(id, organizationId);
    if (!original) return null;

    const now = new Date().toISOString();
    const duplicated: Campaign = {
      ...original,
      id: localId(),
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    return this.createCampaign(organizationId, duplicated, userId);
  }
}
