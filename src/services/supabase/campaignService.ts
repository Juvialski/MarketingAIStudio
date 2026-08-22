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
import { RuntimeMode } from '../../types/runtime';

import {
  hydrateCampaignAssets,
  sanitizeCampaignForPersistence,
} from './assetResolver';
import { StorageService } from './storageService';

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
): CampaignInsert => {
  const sanitized = sanitizeCampaignForPersistence(campaign);
  return {
    organization_id: organizationId,
    created_by: userId || null,
    name: sanitized.name,
    campaign_type: sanitized.sourceData.campaignType,
    target_market: sanitized.sourceData.targetMarket,
    status: sanitized.status,
    source_data: asJson(sanitized.sourceData),
    strategy: sanitized.strategy ? asJson(sanitized.strategy) : null,
    design_configs: asJson(sanitized.designConfigs),
    tags: sanitized.tags || [],
  };
};

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
  return hydrateCampaignAssets(campaign);
};

export class CampaignService {
  private static isDemoContext(
    runtimeMode: RuntimeMode | undefined,
    organizationId?: string,
    campaignId?: string
  ): boolean {
    if (runtimeMode) return runtimeMode === 'demo';
    // Keep direct, unconfigured unit-test callers backwards compatible. All
    // application callers pass the explicit runtime mode below.
    if (!isSupabaseConfigured()) return true;
    return Boolean(
      organizationId === 'demo-org' ||
      organizationId === 'test-org-1' ||
      campaignId?.startsWith('campaign-') ||
      campaignId?.startsWith('demo-') ||
      campaignId?.startsWith('test-') ||
      campaignId?.startsWith('camp-')
    );
  }

  private static requireOrganization(organizationId: string): void {
    if (!isSupabaseConfigured()) {
      throw new ServiceError('not_configured', 'The live campaign backend is not configured.');
    }
    if (!organizationId) {
      throw new ServiceError('forbidden', 'A live organization is required for this operation.');
    }
  }

  public static async getCampaigns(organizationId: string, runtimeMode?: RuntimeMode): Promise<Campaign[]> {
    if (this.isDemoContext(runtimeMode, organizationId)) {
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

  public static async getCampaignById(
    id: string,
    organizationId?: string,
    runtimeMode?: RuntimeMode
  ): Promise<Campaign | null> {
    if (this.isDemoContext(runtimeMode, organizationId, id)) {
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
    const contentTypes = ['all_package', 'presentation_deck'] as const;
    const desired: CampaignContentInsert[] = [];
    if (campaign.copy) {
      desired.push({
        campaign_id: campaign.id,
        organization_id: organizationId,
        content_type: 'all_package',
        content: asJson(campaign.copy),
        quality_report: campaign.copy.qualityReport ? asJson(campaign.copy.qualityReport) : null,
        is_accepted: true,
        version: 1,
      });
    }
    if (campaign.presentation) {
      desired.push({
        campaign_id: campaign.id,
        organization_id: organizationId,
        content_type: 'presentation_deck',
        content: asJson(campaign.presentation),
        is_accepted: true,
        version: 1,
      });
    }

    const { data: existingRows, error: lookupError } = await supabase
      .from('campaign_content')
      .select('id, content_type, version')
      .eq('campaign_id', campaign.id)
      .eq('organization_id', organizationId)
      .in('content_type', [...contentTypes])
      .eq('version', 1);
    if (lookupError) {
      throw new ServiceError('write_failed', 'Campaign content could not be inspected before saving.', lookupError);
    }

    const existingByType = new Map(
      (existingRows || []).map((row) => [row.content_type, row.id])
    );
    await Promise.all(desired.map(async (payload) => {
      const existingId = existingByType.get(payload.content_type);
      const write = existingId
        ? await supabase.from('campaign_content').update(payload).eq('id', existingId).eq('organization_id', organizationId)
        : await supabase.from('campaign_content').insert(payload);
      if (write.error) {
        throw new ServiceError('write_failed', `Campaign ${payload.content_type} content could not be saved.`, write.error);
      }
    }));

    const staleTypes = contentTypes.filter((contentType) => !desired.some((payload) => payload.content_type === contentType));
    if (staleTypes.length > 0) {
      const { error: deleteError } = await supabase
        .from('campaign_content')
        .delete()
        .eq('campaign_id', campaign.id)
        .eq('organization_id', organizationId)
        .in('content_type', [...staleTypes]);
      if (deleteError) {
        throw new ServiceError('write_failed', 'Obsolete campaign content could not be removed.', deleteError);
      }
    }
  }

  /** Inserts without a client-generated ID; Supabase returns the canonical UUID row. */
  public static async createCampaign(
    organizationId: string,
    draft: Campaign,
    userId?: string,
    runtimeMode?: RuntimeMode
  ): Promise<Campaign> {
    if (this.isDemoContext(runtimeMode, organizationId, draft.id)) {
      const localCampaign = { ...draft, id: draft.id || localId() };
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
    const registeredImages = await StorageService.registerCampaignAssets(
      organizationId,
      saved.id,
      saved.sourceData.uploadedImages
    );
    const savedWithAssets = registeredImages === saved.sourceData.uploadedImages
      ? saved
      : {
          ...saved,
          sourceData: { ...saved.sourceData, uploadedImages: registeredImages },
        };
    if (savedWithAssets !== saved) {
      const { error: assetRefError } = await supabase
        .from('campaigns')
        .update({ source_data: asJson(savedWithAssets.sourceData) })
        .eq('id', saved.id)
        .eq('organization_id', organizationId);
      if (assetRefError) {
        throw new ServiceError('asset_persist_failed', 'Campaign assets were stored, but their campaign references could not be finalized.', assetRefError);
      }
    }
    await this.persistContent(organizationId, savedWithAssets);
    return hydrateSignedAssetUrls(savedWithAssets);
  }

  public static async updateCampaign(
    organizationId: string,
    campaign: Campaign,
    userId?: string,
    runtimeMode?: RuntimeMode
  ): Promise<Campaign> {
    if (!campaign.id) throw new ServiceError('not_found', 'A campaign ID is required for an update.');
    if (this.isDemoContext(runtimeMode, organizationId, campaign.id)) return CampaignStore.save(campaign, { allowDemoFixtures: true });
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
    const registeredImages = await StorageService.registerCampaignAssets(
      organizationId,
      saved.id,
      saved.sourceData.uploadedImages
    );
    const savedWithAssets = registeredImages === saved.sourceData.uploadedImages
      ? saved
      : {
          ...saved,
          sourceData: { ...saved.sourceData, uploadedImages: registeredImages },
        };
    if (savedWithAssets !== saved) {
      const { error: assetRefError } = await supabase
        .from('campaigns')
        .update({ source_data: asJson(savedWithAssets.sourceData) })
        .eq('id', saved.id)
        .eq('organization_id', organizationId);
      if (assetRefError) {
        throw new ServiceError('asset_persist_failed', 'Campaign assets were stored, but their campaign references could not be finalized.', assetRefError);
      }
    }
    await this.persistContent(organizationId, savedWithAssets);
    return hydrateSignedAssetUrls(savedWithAssets);
  }

  /** Explicit operation selection avoids guessing from client ID prefixes. */
  public static async saveCampaign(
    organizationId: string,
    campaign: Campaign,
    userId?: string,
    operation: 'create' | 'update' = 'update',
    runtimeMode?: RuntimeMode
  ): Promise<Campaign> {
    return operation === 'create'
      ? this.createCampaign(organizationId, campaign, userId, runtimeMode)
      : this.updateCampaign(organizationId, campaign, userId, runtimeMode);
  }

  public static async deleteCampaign(id: string, organizationId?: string, runtimeMode?: RuntimeMode): Promise<void> {
    if (this.isDemoContext(runtimeMode, organizationId, id)) {
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
    userId?: string,
    runtimeMode?: RuntimeMode
  ): Promise<Campaign | null> {
    const original = await this.getCampaignById(id, organizationId, runtimeMode);
    if (!original) return null;

    const now = new Date().toISOString();
    const duplicated: Campaign = {
      ...original,
      id: localId(),
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    return this.createCampaign(organizationId, duplicated, userId, runtimeMode);
  }
}
