import { supabase, isSupabaseConfigured } from './client';
import { 
  ReviewLink, 
  ReviewVersion, 
  ReviewFeedback, 
  ReviewLinkPermissions, 
  PublicReviewPortalResponse, 
  ReviewStatus 
} from '../../types/review';
import { Campaign } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { generateSecureReviewToken, hashReviewToken } from '../review/reviewCrypto';
import { buildReviewSnapshot, SnapshotBuildOptions, getEffectiveReviewMaterials } from '../review/reviewSnapshotBuilder';
import { CampaignReviewStore } from '../storage/campaignReviewStore';
import { ServiceError } from './serviceError';

const isDemoContext = (organizationId?: string, campaignId?: string): boolean => {
  if (!isSupabaseConfigured()) return true;
  if (!organizationId || organizationId === 'demo-org' || organizationId.startsWith('demo-')) return true;
  if (campaignId && (campaignId.startsWith('campaign-') || campaignId.startsWith('demo-'))) return true;
  return false;
};

export class CampaignReviewService {
  // ---------------- Owner Workspace Methods ----------------

  public static async getReviewLinks(
    organizationId: string,
    campaignId: string
  ): Promise<ReviewLink[]> {
    if (isDemoContext(organizationId, campaignId)) {
      return CampaignReviewStore.getLinksByCampaign(campaignId);
    }

    const { data, error } = await supabase
      .from('campaign_review_links')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ServiceError('write_failed', `Failed to load review links: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      campaignId: row.campaign_id,
      tokenHash: row.token_hash,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      permissions: {
        allowComments: row.allow_comments,
        allowSelection: row.allow_selection,
        allowApproval: row.allow_approval,
        allowDownloads: row.allow_downloads,
      },
      currentVersionNumber: row.current_version_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  public static async createReviewLink(
    organizationId: string,
    campaign: Campaign,
    brandKit: BrandKit,
    permissions?: Partial<ReviewLinkPermissions>,
    expiresAt: string | null = null,
    userId?: string,
    snapshotOptions?: SnapshotBuildOptions
  ): Promise<{ link: ReviewLink; rawToken: string; version: ReviewVersion }> {
    const effective = getEffectiveReviewMaterials(campaign, snapshotOptions);
    if (effective.totalCount === 0) {
      throw new ServiceError('write_failed', 'Cannot create a review package with no effective materials. Ensure at least one graphic format, presentation deck, or copy item is available and selected.');
    }

    if (isDemoContext(organizationId, campaign.id)) {
      return CampaignReviewStore.createReviewLink(campaign, brandKit, permissions, expiresAt, snapshotOptions);
    }

    const rawToken = generateSecureReviewToken();
    const tokenHash = await hashReviewToken(rawToken);
    const snapshot = buildReviewSnapshot(campaign, brandKit, snapshotOptions);

    const permissionsPayload: ReviewLinkPermissions = {
      allowComments: permissions?.allowComments ?? true,
      allowSelection: permissions?.allowSelection ?? true,
      allowApproval: permissions?.allowApproval ?? true,
      allowDownloads: permissions?.allowDownloads ?? false,
    };

    // Atomic transaction RPC
    const { data, error } = await supabase.rpc('create_campaign_review_link_atomic', {
      p_organization_id: organizationId,
      p_campaign_id: campaign.id,
      p_token_hash: tokenHash,
      p_snapshot: snapshot as any,
      p_permissions: permissionsPayload as any,
      p_expires_at: expiresAt,
      p_user_id: userId || (null as any),
    });

    if (error || !data) {
      throw new ServiceError('write_failed', `Failed to create review link: ${error?.message || 'Unknown error'}`);
    }

    const res = data as any;
    const link: ReviewLink = {
      id: res.link_id,
      organizationId,
      campaignId: campaign.id,
      tokenHash,
      rawToken,
      isActive: true,
      expiresAt,
      permissions: permissionsPayload,
      currentVersionNumber: res.version_number || 1,
      createdAt: res.created_at || new Date().toISOString(),
      updatedAt: res.created_at || new Date().toISOString(),
    };

    const version: ReviewVersion = {
      id: res.version_id,
      reviewLinkId: res.link_id,
      versionNumber: res.version_number || 1,
      title: 'Review Package v1',
      publishedAt: res.created_at || new Date().toISOString(),
      snapshot,
    };

    return { link, rawToken, version };
  }

  public static async publishNewVersion(
    organizationId: string,
    reviewLinkId: string,
    campaign: Campaign,
    brandKit: BrandKit,
    title?: string,
    notes?: string,
    snapshotOptions?: SnapshotBuildOptions
  ): Promise<ReviewVersion> {
    const effective = getEffectiveReviewMaterials(campaign, snapshotOptions);
    if (effective.totalCount === 0) {
      throw new ServiceError('write_failed', 'Cannot publish a review version with no effective materials. Ensure at least one graphic format, presentation deck, or copy item is available and selected.');
    }

    if (isDemoContext(organizationId, campaign.id)) {
      const res = await CampaignReviewStore.publishNewVersion(reviewLinkId, campaign, brandKit, title, notes, snapshotOptions);
      if (!res) throw new ServiceError('write_failed', 'Failed to publish new review version in store.');
      return res;
    }

    const snapshot = buildReviewSnapshot(campaign, brandKit, snapshotOptions);

    // Atomic version allocation & publication RPC
    const { data, error } = await supabase.rpc('publish_campaign_review_version_atomic', {
      p_organization_id: organizationId,
      p_review_link_id: reviewLinkId,
      p_snapshot: snapshot as any,
      p_title: title || (null as any),
      p_notes: notes || (null as any),
    });

    if (error || !data) {
      throw new ServiceError('write_failed', `Failed to publish review version: ${error?.message || 'Unknown error'}`);
    }

    const res = data as any;
    return {
      id: res.version_id,
      reviewLinkId,
      versionNumber: res.version_number,
      title: res.title,
      notes: notes || undefined,
      publishedAt: res.published_at,
      snapshot,
    };
  }

  public static async rotateReviewLink(
    organizationId: string,
    reviewLinkId: string,
    campaign: Campaign,
    brandKit: BrandKit,
    snapshotOptions?: SnapshotBuildOptions
  ): Promise<{ link: ReviewLink; rawToken: string }> {
    if (isDemoContext(organizationId, campaign.id)) {
      const res = await CampaignReviewStore.rotateReviewLink(reviewLinkId, campaign, brandKit, snapshotOptions);
      if (!res) throw new ServiceError('write_failed', 'Failed to rotate review link in store.');
      return res;
    }

    const rawToken = generateSecureReviewToken();
    const tokenHash = await hashReviewToken(rawToken);

    const { data: linkRow, error } = await supabase
      .from('campaign_review_links')
      .update({
        token_hash: tokenHash,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewLinkId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !linkRow) {
      throw new ServiceError('write_failed', `Failed to rotate review link: ${error?.message}`);
    }

    return {
      link: {
        id: linkRow.id,
        organizationId: linkRow.organization_id,
        campaignId: linkRow.campaign_id,
        tokenHash: linkRow.token_hash,
        rawToken,
        isActive: linkRow.is_active,
        expiresAt: linkRow.expires_at,
        permissions: {
          allowComments: linkRow.allow_comments,
          allowSelection: linkRow.allow_selection,
          allowApproval: linkRow.allow_approval,
          allowDownloads: linkRow.allow_downloads,
        },
        currentVersionNumber: linkRow.current_version_number,
        createdAt: linkRow.created_at,
        updatedAt: linkRow.updated_at,
      },
      rawToken,
    };
  }

  public static async revokeReviewLink(
    organizationId: string,
    reviewLinkId: string
  ): Promise<boolean> {
    if (isDemoContext(organizationId)) {
      return CampaignReviewStore.revokeReviewLink(reviewLinkId);
    }

    const { error } = await supabase
      .from('campaign_review_links')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewLinkId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ServiceError('write_failed', `Failed to revoke review link: ${error.message}`);
    }
    return true;
  }

  public static async updatePermissions(
    organizationId: string,
    reviewLinkId: string,
    permissions: ReviewLinkPermissions,
    expiresAt?: string | null
  ): Promise<ReviewLink> {
    if (isDemoContext(organizationId)) {
      const res = CampaignReviewStore.updatePermissions(reviewLinkId, permissions, expiresAt);
      if (!res) throw new ServiceError('write_failed', 'Failed to update permissions in store.');
      return res;
    }

    const updatePayload: any = {
      allow_comments: permissions.allowComments,
      allow_selection: permissions.allowSelection,
      allow_approval: permissions.allowApproval,
      allow_downloads: permissions.allowDownloads,
      updated_at: new Date().toISOString(),
    };
    if (expiresAt !== undefined) updatePayload.expires_at = expiresAt;

    const { data: linkRow, error } = await supabase
      .from('campaign_review_links')
      .update(updatePayload)
      .eq('id', reviewLinkId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !linkRow) {
      throw new ServiceError('write_failed', `Failed to update permissions: ${error?.message}`);
    }

    return {
      id: linkRow.id,
      organizationId: linkRow.organization_id,
      campaignId: linkRow.campaign_id,
      tokenHash: linkRow.token_hash,
      isActive: linkRow.is_active,
      expiresAt: linkRow.expires_at,
      permissions: {
        allowComments: linkRow.allow_comments,
        allowSelection: linkRow.allow_selection,
        allowApproval: linkRow.allow_approval,
        allowDownloads: linkRow.allow_downloads,
      },
      currentVersionNumber: linkRow.current_version_number,
      createdAt: linkRow.created_at,
      updatedAt: linkRow.updated_at,
    };
  }

  public static async getVersions(
    organizationId: string,
    reviewLinkId: string
  ): Promise<ReviewVersion[]> {
    if (isDemoContext(organizationId)) {
      return CampaignReviewStore.getVersionsByLinkId(reviewLinkId);
    }

    const { data, error } = await supabase
      .from('campaign_review_versions')
      .select('*')
      .eq('review_link_id', reviewLinkId)
      .order('version_number', { ascending: false });

    if (error) {
      throw new ServiceError('write_failed', `Failed to load review versions: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      reviewLinkId: row.review_link_id,
      versionNumber: row.version_number,
      title: row.title,
      notes: row.notes || undefined,
      publishedAt: row.published_at,
      snapshot: row.published_snapshot as any,
    }));
  }

  public static async getFeedback(
    organizationId: string,
    reviewLinkId: string,
    reviewVersionId?: string
  ): Promise<ReviewFeedback[]> {
    if (isDemoContext(organizationId)) {
      return CampaignReviewStore.getFeedbackByLinkId(reviewLinkId, reviewVersionId);
    }

    let query = supabase
      .from('campaign_review_feedback')
      .select('*')
      .eq('review_link_id', reviewLinkId);

    if (reviewVersionId) {
      query = query.eq('review_version_id', reviewVersionId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      throw new ServiceError('write_failed', `Failed to load review feedback: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      reviewLinkId: row.review_link_id,
      reviewVersionId: row.review_version_id || undefined,
      materialKey: row.material_key,
      variantKey: row.variant_key || undefined,
      reviewerName: row.reviewer_name || 'Reviewer',
      status: row.status as ReviewStatus,
      comment: row.comment || undefined,
      updatedAt: row.updated_at,
    }));
  }

  // ---------------- Public Review Portal Methods ----------------

  public static async getPublicSnapshot(
    rawToken: string
  ): Promise<PublicReviewPortalResponse> {
    if (!rawToken || !rawToken.trim()) {
      return { status: 'not_found', error: 'Invalid review token.' };
    }

    // Check store first for demo/offline links
    const storeLink = await CampaignReviewStore.getLinkByRawTokenOrHash(rawToken);
    if (storeLink || !isSupabaseConfigured()) {
      return CampaignReviewStore.getPublicSnapshot(rawToken);
    }

    // Public RPC: sends raw token over HTTPS; RPC performs server-side SHA-256 digest lookup
    const { data, error } = await supabase.rpc('get_public_review_snapshot', {
      p_raw_token: rawToken.trim(),
    });

    if (error || !data) {
      return { status: 'not_found', error: error?.message || 'Failed to connect to review service.' };
    }

    const res = data as any;
    if (res.status !== 'active') {
      return { status: res.status, error: res.error };
    }

    return {
      status: 'active',
      versionNumber: res.version_number,
      versionTitle: res.version_title,
      publishedAt: res.published_at,
      snapshot: res.snapshot,
      permissions: res.permissions,
      feedback: (res.feedback || []).map((f: any) => ({
        id: f.id,
        reviewLinkId: '',
        materialKey: f.material_key,
        variantKey: f.variant_key,
        reviewerName: f.reviewer_name || 'Reviewer',
        status: f.status,
        comment: f.comment,
        updatedAt: f.updated_at,
      })),
    };
  }

  public static async submitPublicFeedback(
    rawToken: string,
    materialKey: string,
    variantKey?: string,
    status: ReviewStatus = 'preferred',
    comment?: string,
    reviewerName: string = 'Reviewer'
  ): Promise<{ success: boolean; feedback?: ReviewFeedback; error?: string }> {
    if (!rawToken || !rawToken.trim()) {
      return { success: false, error: 'Invalid review token.' };
    }

    const sanitizedReviewerName = (reviewerName && reviewerName.trim()) ? reviewerName.trim().slice(0, 100) : 'Reviewer';
    const sanitizedVariantKey = variantKey && variantKey.trim() ? variantKey.trim() : undefined;

    // Graphic material integrity check: preferred status requires a valid non-empty variant key
    const isGraphic = materialKey.startsWith('graphic_') || materialKey.includes('graphic');
    if (isGraphic && status === 'preferred') {
      if (!sanitizedVariantKey) {
        return { success: false, error: 'Preferred status for graphic materials requires a valid variant key.' };
      }
    }

    // Check store first for demo/offline links
    const storeLink = await CampaignReviewStore.getLinkByRawTokenOrHash(rawToken);
    if (storeLink || !isSupabaseConfigured()) {
      return CampaignReviewStore.submitFeedback(rawToken, materialKey, sanitizedVariantKey, status, comment, sanitizedReviewerName);
    }

    const { data, error } = await supabase.rpc('submit_public_review_feedback', {
      p_raw_token: rawToken.trim(),
      p_material_key: materialKey,
      p_variant_key: sanitizedVariantKey || (null as any),
      p_status: status,
      p_comment: comment || (null as any),
      p_reviewer_name: sanitizedReviewerName,
    });

    if (error || !data) {
      return { success: false, error: error?.message || 'Feedback submission failed.' };
    }

    const res = data as any;
    return {
      success: Boolean(res.success),
      error: res.error,
      feedback: res.feedback
        ? {
            id: res.feedback.id,
            reviewLinkId: '',
            materialKey: res.feedback.material_key,
            variantKey: res.feedback.variant_key,
            reviewerName: res.feedback.reviewer_name || 'Reviewer',
            status: res.feedback.status,
            comment: res.feedback.comment,
            updatedAt: res.feedback.updated_at,
          }
        : undefined,
    };
  }

  public static async submitPublicCampaignApproval(
    rawToken: string,
    status: 'approved' | 'needs_changes' = 'approved',
    notes?: string,
    reviewerName: string = 'Reviewer'
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    if (!rawToken || !rawToken.trim()) {
      return { success: false, error: 'Invalid review token.' };
    }

    const sanitizedReviewerName = (reviewerName && reviewerName.trim()) ? reviewerName.trim().slice(0, 100) : 'Reviewer';

    // Check store first for demo/offline links
    const storeLink = await CampaignReviewStore.getLinkByRawTokenOrHash(rawToken);
    if (storeLink || !isSupabaseConfigured()) {
      return CampaignReviewStore.submitCampaignApproval(rawToken, status, notes, sanitizedReviewerName);
    }

    const { data, error } = await supabase.rpc('submit_public_campaign_approval', {
      p_raw_token: rawToken.trim(),
      p_status: status,
      p_notes: notes || (null as any),
      p_reviewer_name: sanitizedReviewerName,
    });

    if (error || !data) {
      return { success: false, error: error?.message || 'Campaign approval submission failed.' };
    }

    const res = data as any;
    return {
      success: Boolean(res.success),
      status: res.status,
      error: res.error,
    };
  }
}
