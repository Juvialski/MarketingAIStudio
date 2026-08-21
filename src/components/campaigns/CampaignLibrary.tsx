import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { 
  Plus, 
  Search, 
  Building, 
  Copy, 
  Trash2, 
  ArrowRight, 
  RotateCcw, 
  Download 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { MarketingKitZipExporter } from '../../services/export/marketingKitZip';

interface CampaignLibraryProps {
  campaigns: Campaign[];
  brandKit: BrandKit;
  onSelectCampaign: (campaign: Campaign) => void;
  onNewCampaign: () => void;
  onDuplicateCampaign: (id: string) => void;
  onDeleteCampaign: (id: string) => void;
  onResetSamples: () => void;
}

export const CampaignLibrary: React.FC<CampaignLibraryProps> = ({
  campaigns,
  brandKit,
  onSelectCampaign,
  onNewCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
  onResetSamples,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [zippingId, setZippingId] = useState<string | null>(null);

  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceData.targetMarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceData.property?.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || c.sourceData.campaignType === selectedType;
    return matchesSearch && matchesType;
  });

  const handleQuickZip = async (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    setZippingId(campaign.id);
    try {
      await MarketingKitZipExporter.bundleAndDownloadKit(campaign, brandKit);
    } catch (err) {
      console.error('Quick zip error', err);
    } finally {
      setZippingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Campaign Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage real estate investment marketing campaigns, generated assets, and flyers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onResetSamples}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-subtle"
            title="Reload fictional real estate demonstration campaigns"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Samples</span>
          </button>

          <button
            onClick={onNewCampaign}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by property address, title, or market..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-900 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Types' },
            { id: 'fix_and_flip', label: 'Fix & Flip' },
            { id: 'cash_flow_rental', label: 'Multi-Family / Cash Flow' },
            { id: 'wholesale_deal', label: 'Wholesale' },
            { id: 'market_update', label: 'Market Insights' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedType === type.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((campaign) => {
          const heroImg =
            campaign.sourceData.uploadedImages.find((img) => img.isHero) ||
            campaign.sourceData.uploadedImages[0];
          const prop = campaign.sourceData.property;
          const fin = prop?.financials;

          return (
            <div
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign)}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-400 overflow-hidden shadow-subtle hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between"
            >
              {/* Photo & Badge */}
              <div className="relative h-44 bg-slate-950 overflow-hidden">
                {heroImg ? (
                  <img
                    src={heroImg.url}
                    alt={campaign.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Building className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-white/95 backdrop-blur text-slate-900 text-[10px] font-mono font-bold uppercase rounded shadow">
                    {campaign.sourceData.campaignType.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[10px] font-mono text-amber-300 uppercase tracking-widest">
                    {campaign.sourceData.targetMarket}
                  </p>
                  <h3 className="text-sm font-bold truncate mt-0.5">
                    {campaign.name}
                  </h3>
                </div>
              </div>

              {/* Card Body & Metrics */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Financial Summary */}
                {fin && (
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-400 block">Purchase</span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(fin.purchasePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-400 block">
                        {fin.arv ? 'Est. ARV' : 'Reno Scope'}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {fin.arv ? formatCurrency(fin.arv) : formatCurrency(fin.renovationEstimate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-400 block">
                        {fin.equitySpread ? 'Spread' : fin.capRatePercent ? 'Cap Rate' : 'Profit'}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-600">
                        {fin.equitySpread
                          ? formatCurrency(fin.equitySpread)
                          : fin.capRatePercent
                          ? `${fin.capRatePercent}%`
                          : formatCurrency(fin.projectedProfit)}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {prop?.investmentThesis || campaign.strategy?.valueProposition || 'Value-add investment opportunity ready for marketing.'}
                </p>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateCampaign(campaign.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                      title="Duplicate Campaign"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleQuickZip(e, campaign)}
                      disabled={zippingId === campaign.id}
                      className="p-1.5 text-slate-400 hover:text-amber-700 rounded hover:bg-amber-50"
                      title="Download Full Marketing Kit ZIP"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete campaign "${campaign.name}"?`)) {
                          onDeleteCampaign(campaign.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    <span>Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
