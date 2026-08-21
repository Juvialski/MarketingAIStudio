import React, { useEffect, useState } from 'react';
import { Campaign, CampaignSourceData, CampaignStrategy, CampaignCopy, GraphicDesignConfig, OutputAspectRatio } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { StrategyWorkspace } from './StrategyWorkspace';
import { CopyWorkspace } from './CopyWorkspace';
import { DesignEditor } from '../designs/DesignEditor';
import { FullMarketingKitView } from './FullMarketingKitView';
import { SourceIntakeForm } from './SourceIntakeForm';
import { PresentationWorkspace } from '../../features/presentations/components/PresentationWorkspace';
import { ShareReviewWorkspace } from './ShareReviewWorkspace';
import {
  Compass,
  FileText,
  Image as ImageIcon,
  Package,
  SlidersHorizontal,
  ArrowLeft,
  MapPin,
  Presentation,
  Share2
} from 'lucide-react';
import {
  isWorkspaceTab,
  readWorkspaceNavigation,
  rememberAppView,
  rememberWorkspace,
  rememberWorkspaceTab,
} from '../../services/storage/workspaceNavigation';

interface CampaignWorkspaceProps {
  campaign: Campaign;
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode: 'demo' | 'live';
  onUpdateCampaign: (campaign: Campaign) => void;
  onBack: () => void;
}

type WorkspaceTab = 'kit' | 'strategy' | 'copy' | 'designs' | 'presentation' | 'review' | 'intake';

const getInitialTab = (campaignId: string): WorkspaceTab => {
  const saved = readWorkspaceNavigation();
  if (
    saved?.view === 'workspace' &&
    saved.campaignId === campaignId &&
    isWorkspaceTab(saved.workspaceTab)
  ) {
    return saved.workspaceTab;
  }
  return 'kit';
};

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  campaign,
  brandKit,
  organizationId,
  runtimeMode,
  onUpdateCampaign,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => getInitialTab(campaign.id));

  useEffect(() => {
    const nextTab = getInitialTab(campaign.id);
    setActiveTab(nextTab);
    rememberWorkspace(campaign.id, nextTab);
  }, [campaign.id]);

  const selectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    rememberWorkspaceTab(campaign.id, tab);
  };

  const handleBack = () => {
    rememberAppView('campaigns');
    onBack();
  };

  const handleSaveSource = (sourceData: CampaignSourceData) => {
    const updated: Campaign = {
      ...campaign,
      name: sourceData.title || campaign.name,
      sourceData,
    };
    onUpdateCampaign(updated);
    selectTab('strategy');
  };

  const handleSaveStrategy = (strategy: CampaignStrategy) => {
    const updated: Campaign = {
      ...campaign,
      status: campaign.status === 'draft' ? 'strategy_ready' : campaign.status,
      strategy,
    };
    onUpdateCampaign(updated);
  };

  const handleSaveCopy = (copy: CampaignCopy) => {
    const updated: Campaign = {
      ...campaign,
      status: 'copy_ready',
      copy,
    };
    onUpdateCampaign(updated);
  };

  const handleSaveDesignConfig = (aspectRatio: OutputAspectRatio, config: GraphicDesignConfig) => {
    const updated: Campaign = {
      ...campaign,
      designConfigs: {
        ...campaign.designConfigs,
        [aspectRatio]: config,
      },
    };
    onUpdateCampaign(updated);
  };

  return (
    <div className="space-y-6">
      {/* 1. Workspace Header & Pipeline Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {/* Top Breadcrumb & Metadata Row */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <button
                onClick={handleBack}
                aria-label="Back to campaign library"
                className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Campaigns</span>
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md font-semibold">
                {campaign.sourceData.campaignType.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {campaign.sourceData.targetMarket}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {campaign.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Campaign Title & Thesis Row */}
          <div className="mt-3.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {campaign.name}
            </h1>
            {campaign.sourceData.property?.investmentThesis && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-1 max-w-3xl">
                {campaign.sourceData.property.investmentThesis}
              </p>
            )}
          </div>
        </div>

        {/* Tab Navigation - Dedicated Horizontal Pipeline Tabs */}
        <div className="bg-slate-50/80 px-4 sm:px-6 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'kit', label: 'Full Marketing Kit', icon: Package },
              { id: 'strategy', label: 'Strategy', icon: Compass },
              { id: 'copy', label: 'Copy Studio', icon: FileText },
              { id: 'designs', label: 'Design & Flyers', icon: ImageIcon },
              { id: 'presentation', label: 'Investment Deck', icon: Presentation },
              { id: 'review', label: 'Share & Review', icon: Share2 },
              { id: 'intake', label: 'Property Data', icon: SlidersHorizontal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => selectTab(tab.id as WorkspaceTab)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent hover:border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Workspace Viewport */}
      <div>
        {activeTab === 'kit' && (
          <FullMarketingKitView
            campaign={campaign}
            brandKit={brandKit}
            organizationId={organizationId}
            runtimeMode={runtimeMode}
            onUpdateCampaign={onUpdateCampaign}
            onOpenReview={() => selectTab('review')}
          />
        )}

        {activeTab === 'strategy' && (
          <StrategyWorkspace
            campaign={campaign}
            brandKit={brandKit}
            organizationId={organizationId}
            runtimeMode={runtimeMode}
            onSaveStrategy={handleSaveStrategy}
            onProceedToCopy={() => selectTab('copy')}
          />
        )}

        {activeTab === 'copy' && (
          <CopyWorkspace
            campaign={campaign}
            brandKit={brandKit}
            organizationId={organizationId}
            runtimeMode={runtimeMode}
            onSaveCopy={handleSaveCopy}
          />
        )}

        {activeTab === 'designs' && (
          <DesignEditor
            campaign={campaign}
            brandKit={brandKit}
            onSaveConfig={handleSaveDesignConfig}
          />
        )}

        {activeTab === 'presentation' && (
          <PresentationWorkspace
            campaign={campaign}
            brandKit={brandKit}
            organizationId={organizationId}
            runtimeMode={runtimeMode}
            onUpdateCampaign={onUpdateCampaign}
          />
        )}

        {activeTab === 'review' && (
          <ShareReviewWorkspace
            campaign={campaign}
            brandKit={brandKit}
            organizationId={organizationId}
            runtimeMode={runtimeMode}
            onUpdateCampaign={onUpdateCampaign}
          />
        )}

        {activeTab === 'intake' && (
          <SourceIntakeForm
            initialData={campaign.sourceData}
            organizationId={organizationId}
            campaignId={campaign.id}
            runtimeMode={runtimeMode}
            onSave={handleSaveSource}
          />
        )}
      </div>
    </div>
  );
};
