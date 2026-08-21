import React, { useState } from 'react';
import { Campaign, CampaignCopy } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { ProviderManager } from '../../services/providers/aiProvider';
import { AntiSlopCritic } from '../../services/marketing/antiSlopCritic';
import { 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Video, 
  Mail, 
  Share2, 
  Wand2,
  FileText
} from 'lucide-react';

interface CopyWorkspaceProps {
  campaign: Campaign;
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode: 'demo' | 'live';
  onSaveCopy: (copy: CampaignCopy) => void;
}

type PlatformTab = 'linkedin' | 'instagram' | 'facebook' | 'email' | 'video' | 'headlines_ctas';

export const CopyWorkspace: React.FC<CopyWorkspaceProps> = ({
  campaign,
  brandKit,
  organizationId,
  runtimeMode,
  onSaveCopy,
}) => {
  const [activeTab, setActiveTab] = useState<PlatformTab>('linkedin');
  const [copy, setCopy] = useState<CampaignCopy | undefined>(campaign.copy);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  const handleGenerateCopy = async () => {
    if (!campaign.strategy) {
      alert('Please generate the Campaign Strategy first.');
      return;
    }

    setIsGenerating(true);
    setProgressMsg('Writing platform-specific copy packages...');

    try {
      const provider = ProviderManager.getAIProvider(runtimeMode);
      const generated = await provider.generateCopy(
        campaign.sourceData,
        campaign.strategy,
        brandKit,
        (step) => setProgressMsg(step),
        { organizationId, campaignId: campaign.id, runtimeMode }
      );
      setCopy(generated);
      onSaveCopy(generated);
    } catch (err) {
      console.error('Failed to generate copy', err);
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAutoClean = () => {
    if (!copy) return;
    const forbidden = brandKit.forbiddenWords || [];

    const cleanedCopy: CampaignCopy = {
      ...copy,
      headlines: copy.headlines.map((h) => AntiSlopCritic.autoCleanText(h, forbidden)),
      ctas: copy.ctas.map((c) => AntiSlopCritic.autoCleanText(c, forbidden)),
      facebook: {
        ...copy.facebook,
        headline: AntiSlopCritic.autoCleanText(copy.facebook.headline, forbidden),
        body: AntiSlopCritic.autoCleanText(copy.facebook.body, forbidden),
      },
      instagram: {
        ...copy.instagram,
        headline: AntiSlopCritic.autoCleanText(copy.instagram.headline, forbidden),
        body: AntiSlopCritic.autoCleanText(copy.instagram.body, forbidden),
      },
      linkedin: {
        ...copy.linkedin,
        headline: AntiSlopCritic.autoCleanText(copy.linkedin.headline, forbidden),
        body: AntiSlopCritic.autoCleanText(copy.linkedin.body, forbidden),
      },
      emailNewsletter: {
        ...copy.emailNewsletter,
        subjectLines: copy.emailNewsletter.subjectLines.map((s) => AntiSlopCritic.autoCleanText(s, forbidden)),
        bodyMarkdown: AntiSlopCritic.autoCleanText(copy.emailNewsletter.bodyMarkdown, forbidden),
      },
    };

    const newReport = AntiSlopCritic.reviewCampaignCopy(cleanedCopy, campaign.sourceData, brandKit);
    cleanedCopy.qualityReport = newReport;
    setCopy(cleanedCopy);
    onSaveCopy(cleanedCopy);
  };

  if (!copy) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-2xl mx-auto space-y-5">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-serif font-bold text-slate-900">
            No Marketing Copy Generated Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Generate platform-adapted copywriting for LinkedIn, Instagram, Facebook, Email, and a 60-second video script with built-in anti-slop review.
          </p>
        </div>

        <button
          onClick={handleGenerateCopy}
          disabled={isGenerating}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm inline-flex items-center gap-2"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
          <span>{isGenerating ? progressMsg || 'Writing Copy...' : 'Generate Full Copy Package'}</span>
        </button>
      </div>
    );
  }

  const metadata = copy.generationMetadata;
  const quality = copy.qualityReport;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* 1. Header & Anti-Slop Score Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              COPY STUDIO
            </span>
            {metadata && (
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                Model: {metadata.actualModel}
              </span>
            )}
            {quality && (
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                  quality.overallScore >= 90
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : quality.overallScore >= 75
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                Anti-Slop Score: {quality.overallScore}/100 ({quality.slopIndex.replace('_', ' ')})
              </span>
            )}
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-900 mt-1">
            Multi-Platform Copy & Video Scripts
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {quality && quality.issues.length > 0 && (
            <button
              onClick={handleAutoClean}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Auto-Clean {quality.issues.length} Flagged Terms</span>
            </button>
          )}

          <button
            onClick={handleGenerateCopy}
            disabled={isGenerating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Regenerate All'}</span>
          </button>
        </div>
      </div>

      {metadata?.fallbackOccurred && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs">
          Generated using {metadata.actualModel} because {metadata.requestedModel} reached quota limits.
        </div>
      )}

      {/* 2. Platform Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'linkedin', label: 'LinkedIn Underwriting Memo', icon: Share2 },
          { id: 'instagram', label: 'Instagram Caption & Hashtags', icon: Share2 },
          { id: 'facebook', label: 'Facebook Post', icon: Share2 },
          { id: 'email', label: 'Email Newsletter', icon: Mail },
          { id: 'video', label: '60s Video Reel Script', icon: Video },
          { id: 'headlines_ctas', label: 'Headlines & CTAs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PlatformTab)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Copy Area (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeTab === 'linkedin' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                  LinkedIn Post (Institutional Tone)
                </span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `${copy.linkedin.headline}\n\n${copy.linkedin.body}\n\n${copy.linkedin.cta}`,
                      'linkedin'
                    )
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5"
                >
                  {copiedKey === 'linkedin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'linkedin' ? 'Copied' : 'Copy Full Post'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Headline</label>
                <input
                  type="text"
                  value={copy.linkedin.headline}
                  onChange={(e) => {
                    const updated = { ...copy, linkedin: { ...copy.linkedin, headline: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 uppercase mb-1">
                  <span>Body</span>
                  <span className="font-mono">{copy.linkedin.body.length} chars</span>
                </div>
                <textarea
                  rows={10}
                  value={copy.linkedin.body}
                  onChange={(e) => {
                    const updated = { ...copy, linkedin: { ...copy.linkedin, body: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Call to Action</label>
                <input
                  type="text"
                  value={copy.linkedin.cta}
                  onChange={(e) => {
                    const updated = { ...copy, linkedin: { ...copy.linkedin, cta: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-800 font-medium"
                />
              </div>
            </div>
          )}

          {activeTab === 'instagram' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Instagram Caption
                </span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `${copy.instagram.headline}\n\n${copy.instagram.body}\n\n${copy.instagram.cta}\n\n${(copy.instagram.hashtags || []).join(' ')}`,
                      'instagram'
                    )
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5"
                >
                  {copiedKey === 'instagram' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'instagram' ? 'Copied' : 'Copy Caption'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Headline</label>
                <input
                  type="text"
                  value={copy.instagram.headline}
                  onChange={(e) => {
                    const updated = { ...copy, instagram: { ...copy.instagram, headline: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 uppercase mb-1">
                  <span>Body Caption</span>
                  <span className="font-mono">{copy.instagram.body.length} chars</span>
                </div>
                <textarea
                  rows={9}
                  value={copy.instagram.body}
                  onChange={(e) => {
                    const updated = { ...copy, instagram: { ...copy.instagram, body: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Hashtags</label>
                <input
                  type="text"
                  value={(copy.instagram.hashtags || []).join(' ')}
                  onChange={(e) => {
                    const updated = {
                      ...copy,
                      instagram: { ...copy.instagram, hashtags: e.target.value.split(' ').filter(Boolean) },
                    };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-600 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'facebook' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Facebook Post
                </span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `${copy.facebook.headline}\n\n${copy.facebook.body}\n\n${copy.facebook.cta}`,
                      'facebook'
                    )
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5"
                >
                  {copiedKey === 'facebook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'facebook' ? 'Copied' : 'Copy Post'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Headline</label>
                <input
                  type="text"
                  value={copy.facebook.headline}
                  onChange={(e) => {
                    const updated = { ...copy, facebook: { ...copy.facebook, headline: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 uppercase mb-1">
                  <span>Body</span>
                  <span className="font-mono">{copy.facebook.body.length} chars</span>
                </div>
                <textarea
                  rows={9}
                  value={copy.facebook.body}
                  onChange={(e) => {
                    const updated = { ...copy, facebook: { ...copy.facebook, body: e.target.value } };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                  Email Newsletter / Deal Broadcast
                </span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `SUBJECT: ${copy.emailNewsletter.subjectLines[0]}\nPREVIEW: ${copy.emailNewsletter.previewText}\n\n${copy.emailNewsletter.bodyMarkdown}`,
                      'email'
                    )
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5"
                >
                  {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'email' ? 'Copied' : 'Copy Email'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Subject Line Options
                </label>
                <div className="space-y-1.5">
                  {copy.emailNewsletter.subjectLines.map((sub, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={sub}
                      onChange={(e) => {
                        const newSubs = [...copy.emailNewsletter.subjectLines];
                        newSubs[idx] = e.target.value;
                        const updated = {
                          ...copy,
                          emailNewsletter: { ...copy.emailNewsletter, subjectLines: newSubs },
                        };
                        setCopy(updated);
                        onSaveCopy(updated);
                      }}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-medium"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Preview Snippet
                </label>
                <input
                  type="text"
                  value={copy.emailNewsletter.previewText}
                  onChange={(e) => {
                    const updated = {
                      ...copy,
                      emailNewsletter: { ...copy.emailNewsletter, previewText: e.target.value },
                    };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Email Body (Markdown Format)
                </label>
                <textarea
                  rows={10}
                  value={copy.emailNewsletter.bodyMarkdown}
                  onChange={(e) => {
                    const updated = {
                      ...copy,
                      emailNewsletter: { ...copy.emailNewsletter, bodyMarkdown: e.target.value },
                    };
                    setCopy(updated);
                    onSaveCopy(updated);
                  }}
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg font-mono text-[11px] leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    60-Second Vertical Video Script (Reels / TikTok)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hook (0-5s) ➔ Problem/Scope (5-25s) ➔ Comps/Spread (25-45s) ➔ Call to Action (45-60s)
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleCopyText(
                      `HOOK: ${copy.videoScript.hook}\n\nSCENES:\n${copy.videoScript.scenes
                        .map((s) => `[${s.timeframe}] ${s.spokenAudio}`)
                        .join('\n\n')}\n\nCTA: ${copy.videoScript.callToAction}`,
                      'video'
                    )
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === 'video' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'video' ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[9px] font-mono uppercase text-amber-900 font-bold block">
                  OPENING HOOK (0:00 - 0:05)
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-serif">
                  "{copy.videoScript.hook}"
                </p>
              </div>

              <div className="space-y-3">
                {copy.videoScript.scenes.map((scene, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span className="font-bold text-slate-800">SCENE #{idx + 1}</span>
                      <span className="bg-slate-200 px-1.5 py-0.5 rounded">{scene.timeframe}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-500 font-medium">Visual:</span>{' '}
                      <span className="text-slate-700">{scene.visualDirection}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 bg-white p-2 rounded border border-slate-200">
                      "{scene.spokenAudio}"
                    </div>
                    {scene.onScreenText && (
                      <div className="text-[10px] text-amber-700 font-mono">
                        TEXT OVERLAY: [{scene.onScreenText}]
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'headlines_ctas' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-6">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-700 mb-3">
                  Headline Options
                </h3>
                <div className="space-y-2">
                  {copy.headlines.map((h, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                      <div className="text-xs font-bold text-slate-900">{h}</div>
                      <button
                        onClick={() => handleCopyText(h, `h-${i}`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700"
                      >
                        {copiedKey === `h-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-slate-700 mb-3">
                  Call to Action (CTA) Options
                </h3>
                <div className="space-y-2">
                  {copy.ctas.map((c, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-slate-800">{c}</div>
                      <button
                        onClick={() => handleCopyText(c, `c-${i}`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700"
                      >
                        {copiedKey === `c-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Quality Critic Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Anti-Slop Quality Audit
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Live Rule Engine</span>
            </div>

            {quality ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-mono">Quality Score</div>
                    <div className="text-2xl font-black font-mono text-slate-900">{quality.overallScore}/100</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500 font-mono">Slop Index</div>
                    <div className="text-xs font-bold uppercase text-emerald-600">{quality.slopIndex}</div>
                  </div>
                </div>

                {quality.issues.length === 0 ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Zero AI cliches or unverified claims detected.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-700">
                      {quality.issues.length} Flagged Cliche{quality.issues.length > 1 ? 's' : ''}:
                    </div>
                    {quality.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-2.5 rounded-lg border text-xs space-y-1 bg-amber-50/50 border-amber-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 text-[10px] font-mono uppercase">
                            {issue.platform || 'Text'}
                          </span>
                          <span className="text-[9px] text-amber-700 uppercase font-mono">{issue.severity}</span>
                        </div>
                        <p className="text-slate-800 text-[11px]">
                          Matched: <span className="line-through text-red-600 font-medium">"{issue.matchedText}"</span>
                        </p>
                        <p className="text-[10px] text-slate-500">{issue.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Run copy generation to see quality diagnostics.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
