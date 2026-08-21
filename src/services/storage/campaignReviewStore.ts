/**
 * Local Storage Store for Campaign Review Links, Versions, and Reviewer Feedback (Demo / Offline Workspaces)
 */

import { ReviewLink, ReviewVersion, ReviewFeedback, ReviewLinkPermissions, PublicReviewPortalResponse, ReviewStatus } from '../../types/review';
import { Campaign } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { generateSecureReviewToken, hashReviewToken } from '../review/reviewCrypto';
import { buildReviewSnapshot, SnapshotBuildOptions, getEffectiveReviewMaterials } from '../review/reviewSnapshotBuilder';

const LINKS_KEY = 'zaw_review_links_v1';
const VERSIONS_KEY = 'zaw_review_versions_v1';
const FEEDBACK_KEY = 'zaw_review_feedback_v1';

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return null;
  } catch {
    return null;
  }
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class CampaignReviewStore {
  // ---------------- Links ----------------
  public static getAllLinks(): ReviewLink[] {
    const s = getStorage();
    if (!s) return [];
    try {
      const data = s.getItem(LINKS_KEY);
      return data ? (JSON.parse(data) as ReviewLink[]) : [];
    } catch {
      return [];
    }
  }

  private static saveLinks(links: ReviewLink[]): void {
    const s = getStorage();
    if (!s) return;
    try {
      s.setItem(LINKS_KEY, JSON.stringify(links));
    } catch (e) {
      console.error('Failed to save review links', e);
    }
  }

  public static getLinksByCampaign(campaignId: string): ReviewLink[] {
    return this.getAllLinks().filter((l) => l.campaignId === campaignId);
  }

  public static getActiveLinkByCampaign(campaignId: string): ReviewLink | undefined {
    return this.getLinksByCampaign(campaignId).find((l) => l.isActive);
  }

  public static async getLinkByRawTokenOrHash(tokenOrHash: string): Promise<ReviewLink | undefined> {
    const links = this.getAllLinks();
    const directMatch = links.find((l) => l.rawToken === tokenOrHash || l.tokenHash === tokenOrHash);
    if (directMatch) return directMatch;

    try {
      const computedHash = await hashReviewToken(tokenOrHash);
      return links.find((l) => l.tokenHash === computedHash);
    } catch {
      return undefined;
    }
  }

  public static async createReviewLink(
    campaign: Campaign,
    brandKit: BrandKit,
    permissions?: Partial<ReviewLinkPermissions>,
    expiresAt: string | null = null,
    snapshotOptions?: SnapshotBuildOptions
  ): Promise<{ link: ReviewLink; rawToken: string; version: ReviewVersion }> {
    const effective = getEffectiveReviewMaterials(campaign, snapshotOptions);
    if (effective.totalCount === 0) {
      throw new Error('Cannot create a review package with no effective materials. Ensure at least one graphic format, presentation deck, or copy item is available and selected.');
    }

    const rawToken = generateSecureReviewToken();
    const tokenHash = await hashReviewToken(rawToken);
    const linkId = `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const fullPermissions: ReviewLinkPermissions = {
      allowComments: permissions?.allowComments ?? true,
      allowSelection: permissions?.allowSelection ?? true,
      allowApproval: permissions?.allowApproval ?? true,
      allowDownloads: permissions?.allowDownloads ?? false,
    };

    const link: ReviewLink = {
      id: linkId,
      organizationId: 'demo-org',
      campaignId: campaign.id,
      tokenHash,
      rawToken,
      isActive: true,
      expiresAt,
      permissions: fullPermissions,
      currentVersionNumber: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Build initial snapshot version with selected materials
    const snapshot = buildReviewSnapshot(campaign, brandKit, snapshotOptions);
    const version: ReviewVersion = {
      id: `ver-${linkId}-1`,
      reviewLinkId: linkId,
      versionNumber: 1,
      title: 'Review Package v1',
      publishedAt: now,
      snapshot,
    };

    const links = this.getAllLinks();
    // Deactivate previous links for this campaign atomically
    const updatedLinks = links.map((l) => (l.campaignId === campaign.id ? { ...l, isActive: false } : l));
    updatedLinks.unshift(link);
    this.saveLinks(updatedLinks);

    const versions = this.getAllVersions();
    versions.unshift(version);
    this.saveVersions(versions);

    return { link: clone(link), rawToken, version: clone(version) };
  }

  public static async rotateReviewLink(
    linkId: string,
    campaign: Campaign,
    brandKit: BrandKit,
    snapshotOptions?: SnapshotBuildOptions
  ): Promise<{ link: ReviewLink; rawToken: string }> {
    const rawToken = generateSecureReviewToken();
    const tokenHash = await hashReviewToken(rawToken);
    const now = new Date().toISOString();

    const links = this.getAllLinks();
    const targetIndex = links.findIndex((l) => l.id === linkId);
    if (targetIndex < 0) {
      return this.createReviewLink(campaign, brandKit, undefined, null, snapshotOptions);
    }

    const currentLink = links[targetIndex];
    const updatedLink: ReviewLink = {
      ...currentLink,
      tokenHash,
      rawToken,
      isActive: true,
      updatedAt: now,
    };

    links[targetIndex] = updatedLink;
    this.saveLinks(links);

    return { link: clone(updatedLink), rawToken };
  }

  public static revokeReviewLink(linkId: string): boolean {
    const links = this.getAllLinks();
    const target = links.find((l) => l.id === linkId);
    if (!target) return false;
    target.isActive = false;
    target.updatedAt = new Date().toISOString();
    this.saveLinks(links);
    return true;
  }

  public static updatePermissions(
    linkId: string,
    permissions: ReviewLinkPermissions,
    expiresAt?: string | null
  ): ReviewLink | null {
    const links = this.getAllLinks();
    const targetIndex = links.findIndex((l) => l.id === linkId);
    if (targetIndex < 0) return null;

    const currentLink = links[targetIndex];
    const updatedLink: ReviewLink = {
      ...currentLink,
      permissions: { ...currentLink.permissions, ...permissions },
      expiresAt: expiresAt !== undefined ? expiresAt : currentLink.expiresAt,
      updatedAt: new Date().toISOString(),
    };

    links[targetIndex] = updatedLink;
    this.saveLinks(links);
    return clone(updatedLink);
  }

  // ---------------- Versions ----------------
  public static getAllVersions(): ReviewVersion[] {
    const s = getStorage();
    if (!s) return [];
    try {
      const data = s.getItem(VERSIONS_KEY);
      return data ? (JSON.parse(data) as ReviewVersion[]) : [];
    } catch {
      return [];
    }
  }

  private static saveVersions(versions: ReviewVersion[]): void {
    const s = getStorage();
    if (!s) return;
    try {
      s.setItem(VERSIONS_KEY, JSON.stringify(versions));
    } catch (e) {
      console.error('Failed to save review versions', e);
    }
  }

  public static getVersionsByLinkId(linkId: string): ReviewVersion[] {
    return this.getAllVersions()
      .filter((v) => v.reviewLinkId === linkId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public static getLatestVersion(linkId: string): ReviewVersion | undefined {
    return this.getVersionsByLinkId(linkId)[0];
  }

  public static async publishNewVersion(
    linkId: string,
    campaign: Campaign,
    brandKit: BrandKit,
    title?: string,
    notes?: string,
    snapshotOptions?: SnapshotBuildOptions
  ): Promise<ReviewVersion | null> {
    const effective = getEffectiveReviewMaterials(campaign, snapshotOptions);
    if (effective.totalCount === 0) {
      throw new Error('Cannot publish a review version with no effective materials. Ensure at least one graphic format, presentation deck, or copy item is available and selected.');
    }

    const links = this.getAllLinks();
    const linkIndex = links.findIndex((l) => l.id === linkId);
    if (linkIndex < 0) return null;

    const link = links[linkIndex];
    const nextVersionNumber = (link.currentVersionNumber || 1) + 1;
    const now = new Date().toISOString();

    const snapshot = buildReviewSnapshot(campaign, brandKit, snapshotOptions);
    const newVersion: ReviewVersion = {
      id: `ver-${linkId}-${nextVersionNumber}`,
      reviewLinkId: linkId,
      versionNumber: nextVersionNumber,
      title: title || `Review Package v${nextVersionNumber}`,
      notes,
      publishedAt: now,
      snapshot,
    };

    // Save version
    const versions = this.getAllVersions();
    versions.unshift(newVersion);
    this.saveVersions(versions);

    // Update link version number
    link.currentVersionNumber = nextVersionNumber;
    link.updatedAt = now;
    this.saveLinks(links);

    return clone(newVersion);
  }

  // ---------------- Feedback ----------------
  public static getAllFeedback(): ReviewFeedback[] {
    const s = getStorage();
    if (!s) return [];
    try {
      const data = s.getItem(FEEDBACK_KEY);
      return data ? (JSON.parse(data) as ReviewFeedback[]) : [];
    } catch {
      return [];
    }
  }

  private static saveFeedback(feedbackList: ReviewFeedback[]): void {
    const s = getStorage();
    if (!s) return;
    try {
      s.setItem(FEEDBACK_KEY, JSON.stringify(feedbackList));
    } catch (e) {
      console.error('Failed to save review feedback', e);
    }
  }

  public static getFeedbackByLinkId(linkId: string, reviewVersionId?: string): ReviewFeedback[] {
    return this.getAllFeedback().filter((f) => {
      if (f.reviewLinkId !== linkId) return false;
      if (reviewVersionId) return f.reviewVersionId === reviewVersionId;
      return true;
    });
  }

  // ---------------- Public Access & RPC Simulation ----------------
  public static async getPublicSnapshot(rawToken: string): Promise<PublicReviewPortalResponse> {
    const link = await this.getLinkByRawTokenOrHash(rawToken);
    if (!link) {
      return { status: 'not_found', error: 'This review link does not exist or is invalid.' };
    }

    if (!link.isActive) {
      return { status: 'revoked', error: 'This review link is no longer active.' };
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return { status: 'expired', error: 'This review link has expired.' };
    }

    const latestVersion = this.getLatestVersion(link.id);
    if (!latestVersion) {
      return { status: 'no_version', error: 'No published review package is available.' };
    }

    // Feedback is strictly version-bound
    const feedback = this.getAllFeedback().filter(
      (f) => f.reviewLinkId === link.id && (f.reviewVersionId === latestVersion.id || !f.reviewVersionId)
    );

    return {
      status: 'active',
      versionNumber: latestVersion.versionNumber,
      versionTitle: latestVersion.title,
      publishedAt: latestVersion.publishedAt,
      snapshot: clone(latestVersion.snapshot),
      permissions: clone(link.permissions),
      feedback: clone(feedback),
    };
  }

  public static async submitFeedback(
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

    const link = await this.getLinkByRawTokenOrHash(rawToken);
    if (!link || !link.isActive || (link.expiresAt && new Date(link.expiresAt) < new Date())) {
      return { success: false, error: 'This review link is not active or has expired.' };
    }

    const latestVersion = this.getLatestVersion(link.id);
    if (!latestVersion || !latestVersion.snapshot) {
      return { success: false, error: 'No active review version found.' };
    }

    const snapshot = latestVersion.snapshot;

    // Validate material key bounds & prohibit campaign_overall through item feedback
    if (!materialKey || materialKey.length > 64 || !materialKey.trim()) {
      return { success: false, error: 'Invalid or missing material key.' };
    }

    if (materialKey.trim().toLowerCase() === 'campaign_overall') {
      return { success: false, error: 'Campaign overall approval must be submitted through the dedicated approval endpoint.' };
    }

    if (variantKey !== undefined && variantKey !== null && (variantKey.length > 64 || !variantKey.trim())) {
      return { success: false, error: 'Invalid variant key.' };
    }

    // Inspect published snapshot for material existence
    let isValidMaterial = false;

    if (materialKey === 'presentation') {
      if (snapshot.presentation) {
        isValidMaterial = true;
        if (variantKey && variantKey.trim()) {
          return { success: false, error: 'Variants are not supported for presentation material.' };
        }
      }
    } else if (materialKey === 'video_script' || materialKey === 'copy_video_script') {
      if (snapshot.videoScript) {
        isValidMaterial = true;
        if (variantKey && variantKey.trim()) {
          return { success: false, error: 'Variants are not supported for video script.' };
        }
      }
    } else if (materialKey === 'email_newsletter' || materialKey === 'copy_email') {
      if (snapshot.emailNewsletter) {
        isValidMaterial = true;
        if (variantKey && variantKey.trim()) {
          return { success: false, error: 'Variants are not supported for email newsletter.' };
        }
      }
    } else if (snapshot.copyChannels && Array.isArray(snapshot.copyChannels)) {
      const copyMatch = snapshot.copyChannels.find((ch) => ch.id === materialKey);
      if (copyMatch) {
        isValidMaterial = true;
        if (variantKey && variantKey.trim()) {
          return { success: false, error: 'Variants are not supported for copy channels.' };
        }
      }
    }

    let isGraphic = false;
    if (!isValidMaterial && snapshot.graphicMaterials && Array.isArray(snapshot.graphicMaterials)) {
      const graphicMatch = snapshot.graphicMaterials.find((gm) => gm.id === materialKey);
      if (graphicMatch) {
        isValidMaterial = true;
        isGraphic = true;
        if (variantKey && variantKey.trim()) {
          const variantMatch = graphicMatch.variants?.some((v) => v.id === variantKey.trim());
          if (!variantMatch) {
            return { success: false, error: 'Specified variant does not exist for this material.' };
          }
        }
      }
    }

    if (!isValidMaterial) {
      return { success: false, error: 'Material key does not exist in the published review package.' };
    }

    // Graphic material integrity check: preferred status requires a valid non-empty variant key
    if (isGraphic && status === 'preferred') {
      if (!variantKey || !variantKey.trim()) {
        return { success: false, error: 'Preferred status for graphic materials requires a valid variant key.' };
      }
    }

    // Validate permissions
    if (status === 'preferred' && !link.permissions.allowSelection) {
      return { success: false, error: 'Variant selection is disabled for this review link.' };
    }
    if ((status === 'approved' || status === 'needs_changes') && !link.permissions.allowApproval) {
      return { success: false, error: 'Approvals are disabled for this review link.' };
    }
    if (comment && comment.trim() && !link.permissions.allowComments) {
      return { success: false, error: 'Comments are disabled for this review link.' };
    }

    const sanitizedName = (reviewerName && reviewerName.trim()) ? reviewerName.trim().slice(0, 100) : 'Reviewer';
    const sanitizedComment = (comment || '').trim().slice(0, 2000);
    const sanitizedVariant = variantKey && variantKey.trim() ? variantKey.trim() : undefined;
    const now = new Date().toISOString();
    const allFeedback = this.getAllFeedback();

    // Deterministic uniqueness per (reviewLinkId, reviewVersionId, materialKey, reviewerName)
    const existingIndex = allFeedback.findIndex(
      (f) =>
        f.reviewLinkId === link.id &&
        f.reviewVersionId === latestVersion.id &&
        f.materialKey === materialKey &&
        f.reviewerName === sanitizedName
    );

    let feedbackItem: ReviewFeedback;
    if (existingIndex >= 0) {
      allFeedback[existingIndex] = {
        ...allFeedback[existingIndex],
        variantKey: sanitizedVariant !== undefined ? sanitizedVariant : allFeedback[existingIndex].variantKey,
        status,
        comment: sanitizedComment ? sanitizedComment : undefined,
        updatedAt: now,
      };
      feedbackItem = allFeedback[existingIndex];
    } else {
      feedbackItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        reviewLinkId: link.id,
        reviewVersionId: latestVersion.id,
        materialKey,
        variantKey: sanitizedVariant,
        reviewerName: sanitizedName,
        status,
        comment: sanitizedComment ? sanitizedComment : undefined,
        updatedAt: now,
      };
      allFeedback.unshift(feedbackItem);
    }

    this.saveFeedback(allFeedback);
    return { success: true, feedback: clone(feedbackItem) };
  }

  public static async submitCampaignApproval(
    rawToken: string,
    status: 'approved' | 'needs_changes' = 'approved',
    notes?: string,
    reviewerName: string = 'Reviewer'
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    const link = await this.getLinkByRawTokenOrHash(rawToken);
    if (!link || !link.isActive || (link.expiresAt && new Date(link.expiresAt) < new Date())) {
      return { success: false, error: 'This review link is not active or has expired.' };
    }

    if (!link.permissions.allowApproval) {
      return { success: false, error: 'Campaign approval is disabled for this link.' };
    }

    const latestVersion = this.getLatestVersion(link.id);
    const now = new Date().toISOString();
    const allFeedback = this.getAllFeedback();
    const sanitizedName = (reviewerName && reviewerName.trim()) ? reviewerName.trim().slice(0, 100) : 'Reviewer';

    const existingIndex = allFeedback.findIndex(
      (f) =>
        f.reviewLinkId === link.id &&
        f.reviewVersionId === latestVersion?.id &&
        f.materialKey === 'campaign_overall' &&
        f.reviewerName === sanitizedName
    );

    if (existingIndex >= 0) {
      allFeedback[existingIndex] = {
        ...allFeedback[existingIndex],
        status,
        comment: notes !== undefined ? notes : allFeedback[existingIndex].comment,
        updatedAt: now,
      };
    } else {
      const approvalItem: ReviewFeedback = {
        id: `fb-campaign-${Date.now()}`,
        reviewLinkId: link.id,
        reviewVersionId: latestVersion?.id,
        materialKey: 'campaign_overall',
        reviewerName: sanitizedName,
        status,
        comment: notes,
        updatedAt: now,
      };
      allFeedback.unshift(approvalItem);
    }

    this.saveFeedback(allFeedback);
    return { success: true, status };
  }
}
