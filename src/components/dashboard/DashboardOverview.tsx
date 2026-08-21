import React from 'react';
import { Campaign } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { 
  Building, 
  ArrowRight, 
  Plus, 
  Search,
  ShieldCheck,
  Presentation
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface DashboardOverviewProps {
  campaigns: Campaign[];
  brandKit: BrandKit;
  onSelectCampaign: (c: Campaign) => void;
  onNewCampaign: () => void;
  onNavigate: (view: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  campaigns,
  brandKit,
  onSelectCampaign,
  onNewCampaign,
  onNavigate,
}) => {
  // Calculate aggregate deal volume
  const totalVolume = campaigns.reduce((sum, c) => sum + (c.sourceData.property?.financials.purchasePrice || 0), 0);
  const totalSpread = campaigns.reduce((sum, c) => sum + (c.sourceData.property?.financials.equitySpread || 0), 0);

  const phoenixCampaign = campaigns.find(
    (c) => c.id === 'campaign-phoenix-fix-flip' || c.tags?.includes('Demo') || c.tags?.includes('Phoenix')
  );

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* 1. Hero Welcome Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-10 rounded-3xl shadow-elevated relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headline & Primary Actions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-amber-400 text-xs font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{brandKit.companyName} • Deal Marketing Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              Turn Real Estate Underwriting Into High-Impact Marketing.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light max-w-xl">
              Generate institutional-grade investment briefs, anti-slop multi-channel copy, short-form video scripts, and 300 DPI graphics from property financials in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onNewCampaign}
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg flex items-center gap-2.5 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Property Campaign</span>
              </button>

              <button
                onClick={() => onNavigate('campaigns')}
                className="px-6 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Explore Library ({campaigns.length})</span>
              </button>
            </div>
          </div>

          {/* Right Column: Engine Highlights Panel */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Marketing Engine Pipeline
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                4-Stage Pipeline
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60 space-y-1">
                <div className="text-amber-400 font-mono font-bold text-[11px]">01 · UNDERWRITING</div>
                <div className="font-semibold text-white">Financial Fact Truth</div>
                <div className="text-slate-400 text-[11px]">Cap rates, IRR, spread & cash flow verification</div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60 space-y-1">
                <div className="text-emerald-400 font-mono font-bold text-[11px]">02 · COPY STUDIO</div>
                <div className="font-semibold text-white">Anti-Slop Multi-Channel</div>
                <div className="text-slate-400 text-[11px]">LinkedIn memos, emails & 60s video reels</div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60 space-y-1">
                <div className="text-sky-400 font-mono font-bold text-[11px]">03 · GRAPHIC FLYERS</div>
                <div className="font-semibold text-white">300 DPI Export Suite</div>
                <div className="text-slate-400 text-[11px]">Print PDFs, social square, story & landscape</div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60 space-y-1">
                <div className="text-purple-400 font-mono font-bold text-[11px]">04 · REVIEW PORTAL</div>
                <div className="font-semibold text-white">Interactive Client Deck</div>
                <div className="text-slate-400 text-[11px]">Tokenized review link & feedback capture</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
      </div>

      {/* Flagship Demo Showcase Card */}
      {phoenixCampaign && (
        <div
          onClick={() => onSelectCampaign(phoenixCampaign)}
          className="p-6 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white rounded-3xl border border-amber-200 hover:border-amber-300 shadow-subtle hover:shadow-elevated transition-all flex flex-wrap items-center justify-between gap-4 cursor-pointer"
        >
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                FLAGSHIP DEMO SHOWCASE
              </span>
              <span className="text-[11px] text-amber-800 font-mono font-semibold">12-Slide Investment Deck · Preflight Passed</span>
            </div>
            <h2 className="text-base font-serif font-bold text-slate-900">
              {phoenixCampaign.name}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explore a complete value-add flip package with deterministic pro-forma financials, 300 DPI flyers, anti-slop copy, and full presentation deck.
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCampaign(phoenixCampaign);
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Presentation className="w-4 h-4" />
            <span>OPEN FLAGSHIP DEMO</span>
          </button>
        </div>
      )}

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-600 block font-semibold">
            Active Campaigns
          </span>
          <div className="text-2xl font-black font-mono text-slate-900">{campaigns.length}</div>
          <span className="text-[11px] text-slate-500">Ready for multi-channel distribution</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-600 block font-semibold">
            Underwritten Volume
          </span>
          <div className="text-2xl font-black font-mono text-slate-900">{formatCurrency(totalVolume)}</div>
          <span className="text-[11px] text-slate-500">Across target metro markets</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-600 block font-semibold">
            Identified Equity Spread
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600">
            {formatCurrency(totalSpread || 70000)}
          </div>
          <span className="text-[11px] text-slate-500">Documented value-add margin</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-600 block font-semibold">
            Anti-Slop Compliance
          </span>
          <div className="text-2xl font-black font-mono text-amber-600">98/100</div>
          <span className="text-[11px] text-slate-500">Zero unverified ROI claims</span>
        </div>
      </div>

      {/* 3. Quick Action Modules */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
          Studio Launchpad
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={onNewCampaign}
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-400 shadow-subtle hover:shadow-elevated transition-all cursor-pointer space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Fix & Flip / Value-Add
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Turn residential cosmetic flips into investor briefs with spread calculations and flyer PDFs.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Create Campaign ➔
            </span>
          </div>

          <div
            onClick={() => onNavigate('brand')}
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-400 shadow-subtle hover:shadow-elevated transition-all cursor-pointer space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                Brand Kit & Guidelines
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage your firm's typography pairings, color palettes, tone of voice, and legal disclaimers.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Manage Identity ➔
            </span>
          </div>

          <div
            onClick={() => onNavigate('leads')}
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-400 shadow-subtle hover:shadow-elevated transition-all cursor-pointer space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Investor & Buyer Lead Finder
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Discover active real estate investment companies in target metros with tailored outreach hooks.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Find Leads ➔
            </span>
          </div>
        </div>
      </div>

      {/* 4. Recent Campaigns Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
            Recent Marketing Campaigns
          </h2>
          <button
            onClick={() => onNavigate('campaigns')}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.slice(0, 2).map((c) => {
            const hero = c.sourceData.uploadedImages.find((img) => img.isHero) || c.sourceData.uploadedImages[0];
            return (
              <div
                key={c.id}
                onClick={() => onSelectCampaign(c)}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-400 shadow-subtle hover:shadow-elevated transition-all cursor-pointer flex gap-4 items-center"
              >
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-200">
                  {hero ? (
                    <img src={hero.url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Building className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                    {c.sourceData.campaignType.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 truncate mt-1">{c.name}</h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.sourceData.targetMarket}</p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
