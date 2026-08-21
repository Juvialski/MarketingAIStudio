import React, { useState, useEffect, useMemo } from 'react';
import { Campaign, OutputAspectRatio, DesignTemplateFamily } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { 
  ReviewLink, 
  ReviewVersion, 
  ReviewFeedback, 
  ReviewLinkPermissions 
} from '../../types/review';
import { CampaignReviewService } from '../../services/supabase/campaignReviewService';
import { MarketingKitZipExporter } from '../../services/export/marketingKitZip';
import { getEffectiveReviewMaterials } from '../../services/review/reviewSnapshotBuilder';
import { 
  Share2, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  MessageSquare, 
  Star, 
  Layers, 
  Download, 
  Sparkles,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sliders
} from 'lucide-react';

interface ShareReviewWorkspaceProps {
  campaign: Campaign;
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode: 'demo' | 'live';
  onUpdateCampaign: (updated: Campaign) => void;
}

export const ShareReviewWorkspace: React.FC<ShareReviewWorkspaceProps> = ({
  campaign,
  brandKit,
  organizationId = 'demo-org',
  runtimeMode: _runtimeMode,
  onUpdateCampaign,
}) => {
  const [activeLink, setActiveLink] = useState<ReviewLink | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [versions, setVersions] = useState<ReviewVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReviewFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Material Selection Options for Published Snapshot
  const [includedFormats, setIncludedFormats] = useState<OutputAspectRatio[]>([
    'square',
    'portrait',
    'story',
    'landscape',
    'flyer_letter',
    'flyer_a4',
  ]);
  const [includePresentation, setIncludePresentation] = useState(true);
  const [includeCopy, setIncludeCopy] = useState(true);
  const [showMaterialOptions, setShowMaterialOptions] = useState(false);

  // Permission settings
  const [permissions, setPermissions] = useState<ReviewLinkPermissions>({
    allowComments: true,
    allowSelection: true,
    allowApproval: true,
    allowDownloads: false,
  });
  const [expirationOption] = useState<'never' | '24h' | '7d' | '30d'>('30d');

  // Final Kit Packaging
  const [isPackagingFinalKit, setIsPackagingFinalKit] = useState(false);
  const [packageMessage, setPackageMessage] = useState('');

  const getSnapshotBuildOptions = () => ({
    includedFormats,
    includePresentation,
    includeCopy,
  });

  const effectiveMaterials = useMemo(() => {
    return getEffectiveReviewMaterials(campaign, getSnapshotBuildOptions());
  }, [campaign, includedFormats, includePresentation, includeCopy]);

  const hasEffectiveMaterials = effectiveMaterials.totalCount > 0;

  // Load Review state
  const loadReviewData = async (targetVersionId?: string) => {
    setLoading(true);
    try {
      const linkList = await CampaignReviewService.getReviewLinks(organizationId, campaign.id);
      const active = linkList.find((l) => l.isActive) || linkList[0] || null;
      setActiveLink(active);

      if (active) {
        setPermissions(active.permissions);
        const vers = await CampaignReviewService.getVersions(organizationId, active.id);
        setVersions(vers);

        const versionToLoad = targetVersionId
          ? vers.find((v) => v.id === targetVersionId) || vers[0]
          : (selectedVersionId ? vers.find((v) => v.id === selectedVersionId) : null) || vers[0];

        setSelectedVersionId(versionToLoad?.id || null);

        const fbs = versionToLoad
          ? await CampaignReviewService.getFeedback(organizationId, active.id, versionToLoad.id)
          : [];
        setFeedback(fbs);
      } else {
        setVersions([]);
        setSelectedVersionId(null);
        setFeedback([]);
      }
    } catch (e) {
      console.warn('Failed to load review data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviewData();
  }, [campaign.id, organizationId]);

  // Expiration calculation helper
  const calculateExpiresAt = (option: 'never' | '24h' | '7d' | '30d'): string | null => {
    if (option === 'never') return null;
    const now = new Date();
    if (option === '24h') now.setDate(now.getDate() + 1);
    if (option === '7d') now.setDate(now.getDate() + 7);
    if (option === '30d') now.setDate(now.getDate() + 30);
    return now.toISOString();
  };

  // Create or Publish Link
  const handleCreateOrPublishLink = async () => {
    if (!hasEffectiveMaterials) {
      alert('Cannot create review package: no materials are available. Please ensure at least one graphic format, presentation deck, or copy item is available and selected.');
      return;
    }
    setActionLoading(true);
    try {
      const expiresAt = calculateExpiresAt(expirationOption);
      const result = await CampaignReviewService.createReviewLink(
        organizationId,
        campaign,
        brandKit,
        permissions,
        expiresAt,
        undefined,
        getSnapshotBuildOptions()
      );

      setActiveLink(result.link);
      setRawToken(result.rawToken);
      setVersions([result.version]);
      setSelectedVersionId(result.version.id);
      setFeedback([]);
      void loadReviewData(result.version.id);
    } catch (e: any) {
      alert(`Failed to create review link: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Publish New Version Snapshot
  const handlePublishNewVersion = async () => {
    if (!activeLink) return;
    if (!hasEffectiveMaterials) {
      alert('Cannot publish review package: no materials are available. Please ensure at least one graphic format, presentation deck, or copy item is available and selected.');
      return;
    }
    setActionLoading(true);
    try {
      const newVersion = await CampaignReviewService.publishNewVersion(
        organizationId,
        activeLink.id,
        campaign,
        brandKit,
        `Review Package v${(activeLink.currentVersionNumber || 1) + 1}`,
        undefined,
        getSnapshotBuildOptions()
      );
      setVersions((prev) => [newVersion, ...prev]);
      setSelectedVersionId(newVersion.id);
      void loadReviewData(newVersion.id);
      alert(`Review Package v${newVersion.versionNumber} published! Public URL now reflects these latest changes.`);
    } catch (e: any) {
      alert(`Failed to publish version: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Rotate Link
  const handleRotateLink = async () => {
    if (!activeLink) return;
    if (!confirm('Generating a new link will immediately invalidate the previous review URL. Continue?')) return;
    setActionLoading(true);
    try {
      const result = await CampaignReviewService.rotateReviewLink(
        organizationId,
        activeLink.id,
        campaign,
        brandKit,
        getSnapshotBuildOptions()
      );
      setActiveLink(result.link);
      setRawToken(result.rawToken);
      void loadReviewData();
    } catch (e: any) {
      alert(`Failed to rotate link: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke Link
  const handleRevokeLink = async () => {
    if (!activeLink) return;
    if (!confirm('Revoking this review link will immediately stop all client access. Continue?')) return;
    setActionLoading(true);
    try {
      await CampaignReviewService.revokeReviewLink(organizationId, activeLink.id);
      setActiveLink((prev) => (prev ? { ...prev, isActive: false } : null));
      setRawToken(null);
      void loadReviewData();
    } catch (e: any) {
      alert(`Failed to revoke link: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Permissions
  const handleTogglePermission = async (key: keyof ReviewLinkPermissions) => {
    if (!activeLink) return;
    const nextPerms = { ...permissions, [key]: !permissions[key] };
    setPermissions(nextPerms);
    try {
      await CampaignReviewService.updatePermissions(organizationId, activeLink.id, nextPerms);
    } catch (e) {
      console.warn('Failed to update permissions', e);
    }
  };

  // Explicit Owner Final Selection action (Reviewer feedback is advisory; owner decides final)
  const handleSetFinalDirection = (format: OutputAspectRatio, family: DesignTemplateFamily) => {
    const currentConfig = campaign.designConfigs[format] || {
      templateFamily: 'editorial' as DesignTemplateFamily,
      aspectRatio: format,
      headline: campaign.sourceData.title || campaign.name,
      imageCropY: 50,
      imageZoom: 1.0,
      activeMetricIds: ['purchase', 'arv', 'spread'],
      showDisclaimer: true,
    };
    const updatedCampaign: Campaign = {
      ...campaign,
      designConfigs: {
        ...campaign.designConfigs,
        [format]: {
          ...currentConfig,
          templateFamily: family,
        },
      },
    };
    onUpdateCampaign(updatedCampaign);
  };

  // Build public link URL (ONLY when rawToken is available — never slice stored token hash!)
  const publicReviewUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const tokenToUse = rawToken || (activeLink?.rawToken ?? null);
    if (!tokenToUse) return '';
    return `${window.location.origin}/review/${tokenToUse}`;
  }, [rawToken, activeLink]);

  const handleCopyLink = () => {
    if (!publicReviewUrl) return;
    navigator.clipboard.writeText(publicReviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Build Final Approved Kit strictly using owner final selections (campaign.designConfigs)
  const handleBuildFinalApprovedKit = async () => {
    setIsPackagingFinalKit(true);
    setPackageMessage('Assembling final approved kit with owner-confirmed designs...');
    try {
      // Marketing kit is generated from campaign's confirmed design configs (owner final selections)
      // Reviewer feedback is strictly advisory and does NOT automatically override owner selections
      await MarketingKitZipExporter.bundleAndDownloadKit(
        campaign,
        brandKit,
        (msg, pct) => {
          setPackageMessage(`${msg} (${pct}%)`);
        }
      );
    } catch (e: any) {
      alert(`Final kit export failed: ${e.message}`);
    } finally {
      setIsPackagingFinalKit(false);
      setPackageMessage('');
    }
  };

  const toggleFormat = (fmt: OutputAspectRatio) => {
    setIncludedFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  };

  // Calculate review metrics
  const preferredFeedback = feedback.filter((f) => f.status === 'preferred');
  const approvalFeedback = feedback.filter((f) => f.status === 'approved');
  const needsChangesFeedback = feedback.filter((f) => f.status === 'needs_changes');
  const commentsFeed = feedback.filter((f) => f.comment && f.comment.trim() !== '');

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs font-mono flex flex-col items-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
        <span>Loading review activity and link status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              CLIENT REVIEW & APPROVAL PORTAL
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Status: {activeLink?.isActive ? 'ACTIVE LINK' : 'NO ACTIVE LINK'}
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mt-2">
            Shareable Campaign Review Room
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Send a private, polished presentation room to decision-makers, clients, or investors. Reviewers can fullscreen graphics, present the 16:9 deck, compare creative directions, mark preferred versions, and approve materials without a ZawMarketing account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setShowMaterialOptions((v) => !v)}
            className="px-3.5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Customize Shared Materials</span>
          </button>

          {!activeLink || !activeLink.isActive ? (
            <button
              onClick={handleCreateOrPublishLink}
              disabled={actionLoading || !hasEffectiveMaterials}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>{actionLoading ? 'Creating Link...' : 'Create Secure Review Link'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={handlePublishNewVersion}
                disabled={actionLoading || !hasEffectiveMaterials}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Publish latest workspace edits to the review portal as a new version"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Publish Latest Changes (v{(activeLink.currentVersionNumber || 1) + 1})</span>
              </button>

              <button
                onClick={handleBuildFinalApprovedKit}
                disabled={isPackagingFinalKit}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isPackagingFinalKit ? packageMessage || 'Packaging...' : 'Build Final Approved Kit'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* No Effective Materials Warning Banner */}
      {!hasEffectiveMaterials && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-bold">No Effective Materials Available</div>
            <div className="text-amber-800 mt-0.5">
              Cannot create or publish an empty review package. Ensure at least one graphic format is selected, or generate presentation/copy content before publishing.
            </div>
          </div>
        </div>
      )}

      {/* Material Selection Customization Panel */}
      {showMaterialOptions && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Select Materials to Include in Review Package</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Changes apply on next link creation or version publish
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={includePresentation}
                onChange={(e) => setIncludePresentation(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>16:9 Presentation Deck {campaign.presentation ? '(Available)' : '(Not created yet)'}</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={includeCopy}
                onChange={(e) => setIncludeCopy(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Platform Copy & Scripts {campaign.copy ? '(Available)' : '(Not created yet)'}</span>
            </label>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-700">Graphic Formats:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { format: 'square' as const, label: 'Square (1:1)' },
                { format: 'portrait' as const, label: 'Portrait (4:5)' },
                { format: 'story' as const, label: 'Story/Reel (9:16)' },
                { format: 'landscape' as const, label: 'Landscape (16:9)' },
                { format: 'flyer_letter' as const, label: 'Print Flyer (Letter)' },
                { format: 'flyer_a4' as const, label: 'Print Flyer (A4)' },
              ].map(({ format, label }) => (
                <label key={format} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includedFormats.includes(format)}
                    onChange={() => toggleFormat(format)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Link Controls & URL Box */}
      {activeLink && activeLink.isActive && (
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-elevated space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono uppercase">
                    Review Link Active · Published Version {activeLink.currentVersionNumber}
                  </span>
                  {activeLink.expiresAt && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Expires: {new Date(activeLink.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Cryptographically secure token with SHA-256 server-side verification
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {publicReviewUrl && (
                <a
                  href={publicReviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preview Reviewer View</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}

              <button
                onClick={handleRotateLink}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Rotate token and generate new URL"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rotate</span>
              </button>

              <button
                onClick={handleRevokeLink}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
            </div>
          </div>

          {/* Share URL Bar or Safe Recovery Prompt */}
          {publicReviewUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div data-testid="review-link-url" className="flex-1 font-mono text-xs text-slate-300 truncate w-full px-2">
                {publicReviewUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-slate-950" />}
                <span>{copied ? 'Copied URL!' : 'Copy Review Link'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Review Link is Active</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                  For security, the raw secret URL is only revealed when created or rotated. To obtain a fresh link URL to share with reviewers, click "Rotate & Get New URL".
                </p>
              </div>

              <button
                onClick={handleRotateLink}
                disabled={actionLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Rotate & Get New URL</span>
              </button>
            </div>
          )}

          {/* Review Permissions Toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {[
              { key: 'allowSelection' as const, label: 'Version Selection', desc: 'Allow client to pick preferred variants' },
              { key: 'allowApproval' as const, label: 'Approvals', desc: 'Allow per-item and package approval' },
              { key: 'allowComments' as const, label: 'Comments', desc: 'Allow short revision notes' },
              { key: 'allowDownloads' as const, label: 'Downloads', desc: 'Allow downloading approved assets' },
            ].map((p) => {
              const enabled = permissions[p.key];
              return (
                <button
                  key={p.key}
                  onClick={() => handleTogglePermission(p.key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    enabled
                      ? 'bg-slate-800/90 border-amber-500/50 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{p.label}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      enabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Review Activity & Decision Dashboard */}
      {activeLink && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  {selectedVersionId && versions[0] && selectedVersionId !== versions[0].id
                    ? `Preferred (${versions.find((v) => v.id === selectedVersionId)?.title || 'Version'})`
                    : `Preferred (v${activeLink.currentVersionNumber || 1})`}
                </div>
                <div className="text-lg font-bold text-slate-900">{preferredFeedback.length} Variants</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  {selectedVersionId && versions[0] && selectedVersionId !== versions[0].id
                    ? `Approvals (${versions.find((v) => v.id === selectedVersionId)?.title || 'Version'})`
                    : `Approvals (v${activeLink.currentVersionNumber || 1})`}
                </div>
                <div className="text-lg font-bold text-slate-900">{approvalFeedback.length} Approved</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700 font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  {selectedVersionId && versions[0] && selectedVersionId !== versions[0].id
                    ? `Changes Requested (${versions.find((v) => v.id === selectedVersionId)?.title || 'Version'})`
                    : `Changes Requested (v${activeLink.currentVersionNumber || 1})`}
                </div>
                <div className="text-lg font-bold text-slate-900">{needsChangesFeedback.length} Items</div>
              </div>
            </div>
          </div>

          {/* Historical Version Viewing Notice */}
          {selectedVersionId && versions[0] && selectedVersionId !== versions[0].id && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Viewing historical feedback for <strong>{versions.find((v) => v.id === selectedVersionId)?.title}</strong>. Selections and notes below reflect this version snapshot.
                </span>
              </div>
              <button
                onClick={() => void loadReviewData(versions[0].id)}
                className="text-xs font-bold text-amber-900 underline hover:text-amber-700 font-mono shrink-0 cursor-pointer"
              >
                Switch to Current ({versions[0].title})
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Owner Final Design Selections & Reviewer Feedback */}
            <div className="lg:col-span-7 space-y-6">
              {/* Owner Final Selection Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      <span>Owner Final Selected Designs</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      The final marketing kit exports these confirmed directions. Reviewer votes are advisory.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                    Authoritative
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    { format: 'square' as const, label: 'Square (1:1)' },
                    { format: 'portrait' as const, label: 'Portrait (4:5)' },
                    { format: 'story' as const, label: 'Story/Reel (9:16)' },
                    { format: 'landscape' as const, label: 'Landscape (16:9)' },
                    { format: 'flyer_letter' as const, label: 'Print Flyer (Letter)' },
                    { format: 'flyer_a4' as const, label: 'Print Flyer (A4)' },
                  ].map(({ format, label }) => {
                    const materialKey = `graphic_${format}`;
                    const currentSelected = campaign.designConfigs[format]?.templateFamily || 'editorial';
                    const formatFeedback = feedback.filter(
                      (f) => f.materialKey === materialKey && f.status === 'preferred' && f.variantKey
                    );

                    return (
                      <div key={format} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">Current Final:</span>
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              {currentSelected.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Reviewer recommendations for this format */}
                        {formatFeedback.length > 0 ? (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                              Reviewer Recommendations (Advisory):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {formatFeedback.map((fb) => {
                                const isCurrent = currentSelected === fb.variantKey;
                                return (
                                  <div
                                    key={fb.id}
                                    className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                      isCurrent
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                        : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div className="truncate">
                                      <span className="font-bold">{fb.reviewerName || 'Reviewer'}: </span>
                                      <span className="font-medium text-amber-800">
                                        {fb.variantKey?.replace(/_/g, ' ').toUpperCase()}
                                      </span>
                                    </div>

                                    {isCurrent ? (
                                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                        Active Final
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          handleSetFinalDirection(format, fb.variantKey as DesignTemplateFamily)
                                        }
                                        className="text-[10px] font-mono font-bold bg-slate-900 hover:bg-slate-800 text-white px-2 py-1 rounded transition-colors shrink-0 cursor-pointer"
                                      >
                                        Use as Final
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic pt-0.5">
                            No reviewer preferences submitted for this format yet.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Version History Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-700" />
                    <span>Published Package Snapshots</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    {versions.length} {versions.length === 1 ? 'Snapshot' : 'Snapshots'}
                  </span>
                </div>

                <div className="space-y-2">
                  {versions.map((ver, idx) => {
                    const isSelected = selectedVersionId === ver.id || (!selectedVersionId && idx === 0);
                    const isLatest = idx === 0;

                    return (
                      <div
                        key={ver.id}
                        onClick={() => void loadReviewData(ver.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{ver.title}</span>
                            {isLatest && (
                              <span className="text-[9px] font-mono uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                Current Active
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 font-mono text-[11px]">
                            Published {new Date(ver.publishedAt).toLocaleDateString()} at {new Date(ver.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                              Viewing Feedback
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              Click to view
                            </span>
                          )}
                          <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                            Immutable
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Reviewer Feedback & Comments Feed */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Client Notes & Revisions</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    {commentsFeed.length} Feedback Notes
                  </span>
                </div>

                {commentsFeed.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">
                    No revision notes submitted yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {commentsFeed.map((fb) => (
                      <div key={fb.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 font-mono">
                            {fb.materialKey.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(fb.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                          "{fb.comment}"
                        </p>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                          <span>Reviewer: {fb.reviewerName || 'Client'}</span>
                          <span className="text-amber-700 font-bold uppercase">{fb.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
