import React, { useState } from 'react';
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

interface CampaignWorkspaceProps {
  campaign: Campaign;
  brandKit: BrandKit;
  organizationId?: string;
  runtimeMode: 'demo' | 'live';
  onUpdateCampaign: (campaign: Campaign) => void;
  onBack: () => void;
}

type WorkspaceTab = 'kit' | 'strategy' | 'copy' | 'designs' | 'presentation' | 'review' | 'intake';

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  campaign,
  brandKit,
  organizationId,
  runtimeMode,
  onUpdateCampaign,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('kit');

  const handleSaveSource = (sourceData: CampaignSourceData) => {
    const updated: Campaign = {
      ...campaign,
      name: sourceData.title || campaign.name,
      sourceData,
    };
    onUpdateCampaign(updated);
    setActiveTab('strategy');
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
      {/* 1. Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            aria-label="Back to campaign library"
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-900 transition-colors shadow-subtle cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md font-semibold">
                {campaign.sourceData.campaignType.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {campaign.sourceData.targetMarket}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-1">
              {campaign.name}
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex max-w-full overflow-x-auto items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/90 shadow-subtle gap-1">
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
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
            onOpenReview={() => setActiveTab('review')}
          />
        )}

        {activeTab === 'strategy' && (
          <StrategyWorkspace
            campaign={campaign}
            brandKit={brandKit}
            organizationId={organizationId}
            runtimeMode={runtimeMode}
            onSaveStrategy={handleSaveStrategy}
            onProceedToCopy={() => setActiveTab('copy')}
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
