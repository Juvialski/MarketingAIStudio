import React, { useState } from 'react';
import { Lead, LeadSearchParams } from '../../types/leads';
import { LeadResearchService, SAMPLE_LEADS } from '../../services/leads/leadResearchService';
import { 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Target
} from 'lucide-react';
import { saveAs } from 'file-saver';

export const LeadFinder: React.FC = () => {
  const [metroArea, setMetroArea] = useState('Dallas-Fort Worth, TX');
  const [targetCategory, setTargetCategory] = useState<LeadSearchParams['targetCategory']>('real_estate_investors');
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(SAMPLE_LEADS[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const results = await LeadResearchService.searchLeads({
        metroArea,
        targetCategory,
      });
      setLeads(results);
      if (results.length > 0) setSelectedLead(results[0]);
    } catch (err) {
      console.error('Lead search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyDraft = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCsv = () => {
    const headers = ['Company Name', 'Category', 'Metro Area', 'Public Email', 'Public Phone', 'Website', 'Lead Score', 'Outreach Hook'];
    const rows = leads.map((l) => [
      `"${l.companyName}"`,
      `"${l.category}"`,
      `"${l.metroArea}"`,
      `"${l.publicContactEmail || ''}"`,
      `"${l.publicPhone || ''}"`,
      `"${l.website}"`,
      l.leadScore,
      `"${l.outreachAngle.hook}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `real-estate-leads-${metroArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* 1. Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
              PUBLIC BUSINESS RESEARCH
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 mt-1">
            Investor & Capital Lead Finder
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover active real estate operators, multi-family syndicators, and private lenders in target metros with tailored outreach hooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-subtle flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({leads.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Criteria Bar */}
      <form onSubmit={handleSearch} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Metro Area</label>
          <input
            type="text"
            value={metroArea}
            onChange={(e) => setMetroArea(e.target.value)}
            placeholder="e.g. Dallas-Fort Worth, TX or Phoenix, AZ"
            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Buyer Category</label>
          <select
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value as any)}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
          >
            <option value="real_estate_investors">Real Estate Investment Firms</option>
            <option value="fix_and_flip_operators">Fix & Flip Funds / Operators</option>
            <option value="commercial_brokers">Commercial Multi-Family Buyers</option>
            <option value="hard_money_lenders">Private Lenders & Debt Funds</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2"
        >
          {isSearching ? <Sparkles className="w-4 h-4 animate-spin text-amber-400" /> : <Search className="w-4 h-4 text-amber-400" />}
          <span>{isSearching ? 'Searching...' : 'Find Qualified Leads'}</span>
        </button>
      </form>

      {/* 3. Results Layout (List 5 cols, Detail 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Leads List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1">
            <span>DISCOVERED ENTITIES ({leads.length})</span>
            <span>SORTED BY RELEVANCE SCORE</span>
          </div>

          <div className="space-y-2.5">
            {leads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 bg-white shadow-elevated ring-1 ring-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{lead.companyName}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      SCORE: {lead.leadScore}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-1">{lead.category}</div>

                  <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {lead.relevanceReason}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    <span>{lead.metroArea}</span>
                    <span className="text-amber-700 font-semibold">View Outreach Angle ➔</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Detail & Outreach Angle */}
        <div className="lg:col-span-7">
          {selectedLead ? (
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-subtle space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedLead.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedLead.metroArea}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedLead.companyName}</h3>
                </div>

                <a
                  href={selectedLead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <span>Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Public Contact Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Public Email</span>
                  <span className="font-semibold text-slate-800">{selectedLead.publicContactEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Public Phone</span>
                  <span className="font-semibold text-slate-800">{selectedLead.publicPhone || 'N/A'}</span>
                </div>
              </div>

              {/* Relevance & Portfolio Analysis */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-slate-700 tracking-wider">
                  Acquisition Criteria & Fit Analysis
                </span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedLead.relevanceReason}
                </p>
              </div>

              {/* Tailored Outreach Angle */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-700" />
                    Recommended Outreach Angle & Hook
                  </span>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="text-xs font-bold text-slate-900">
                    "{selectedLead.outreachAngle.headline}"
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-amber-900">Suggested Angle:</span>{' '}
                    {selectedLead.outreachAngle.suggestedAngle}
                  </p>
                </div>

                {/* Email Starter Draft */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Email Starter Draft</span>
                    <button
                      onClick={() => handleCopyDraft(selectedLead.outreachAngle.emailStarterDraft, selectedLead.id)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-1.5"
                    >
                      {copiedKey === selectedLead.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === selectedLead.id ? 'Copied' : 'Copy Email Draft'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    readOnly
                    value={selectedLead.outreachAngle.emailStarterDraft}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Select a lead from the list to inspect criteria and tailored outreach hooks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
