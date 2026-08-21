import React, { useEffect, useMemo, useState } from 'react';
import { ProviderConfig, AIOperationType, ThinkingLevel, ImageQualityTier } from '../../types/providers';
import { SettingsStore } from '../../services/storage/settingsStore';
import { GEMINI_TEXT_MODELS } from '../../services/providers/modelRegistry';
import { UsageTracker, ModelQuotaSummary } from '../../services/providers/usageTracker';
import { ImageSpendingTracker, SpendingSummary } from '../../services/providers/imageSpendingTracker';
import { AuthService, BackendHealthStatus, ProviderSmokeTestResult } from '../../services/supabase/authService';
import { Activity, AlertTriangle, Check, Cpu, DollarSign, RotateCcw, ShieldCheck, Sliders, Zap, RefreshCw, Sparkles } from 'lucide-react';

const OPERATIONS: Array<{
  op: AIOperationType;
  name: string;
  defaultModel: string;
  defaultThinking: ThinkingLevel;
}> = [
  { op: 'campaign_kit', name: 'Full Marketing Kit', defaultModel: 'backend default', defaultThinking: 'low' },
  { op: 'campaign_strategy', name: 'Strategy & Quantitative Hooks', defaultModel: 'backend default', defaultThinking: 'medium' },
  { op: 'platform_variants', name: 'Platform Copy', defaultModel: 'backend default', defaultThinking: 'low' },
  { op: 'final_review', name: 'Professional Review & Anti-Slop QA', defaultModel: 'backend default', defaultThinking: 'high' },
  { op: 'lead_summary', name: 'Investor Lead Scoring & Synthesis', defaultModel: 'backend default', defaultThinking: 'low' },
];

const healthClass: Record<BackendHealthStatus['status'], string> = {
  live: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  unconfigured: 'bg-amber-50 text-amber-800 border-amber-200',
  unauthenticated: 'bg-amber-50 text-amber-800 border-amber-200',
  unavailable: 'bg-red-50 text-red-800 border-red-200',
};

interface SettingsViewProps {
  organizationId?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ organizationId }) => {
  const [config, setConfig] = useState<ProviderConfig>(() => SettingsStore.get());
  const [savedAlert, setSavedAlert] = useState(false);
  const [quotaSummaries, setQuotaSummaries] = useState<Record<string, ModelQuotaSummary>>({});
  const [spendingSummary, setSpendingSummary] = useState<SpendingSummary>(() =>
    ImageSpendingTracker.getSpendingSummary(SettingsStore.get().imageSpendingLimits)
  );
  const [healthStatus, setHealthStatus] = useState<BackendHealthStatus | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<ProviderSmokeTestResult | null>(null);
  const [nvidiaTestResult, setNvidiaTestResult] = useState<ProviderSmokeTestResult | null>(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingNvidia, setTestingNvidia] = useState(false);

  const textModels = useMemo(() => Object.values(GEMINI_TEXT_MODELS), []);
  const isPaidImageEnabled = config.imageSpendingLimits?.enablePaidGeneration ?? false;

  const refreshQuotaStatus = () => {
    setQuotaSummaries(UsageTracker.getAllModelQuotaStatuses(config.customQuotas));
  };

  const refreshSpendingStatus = () => {
    setSpendingSummary(ImageSpendingTracker.getSpendingSummary(config.imageSpendingLimits));
  };

  useEffect(() => {
    refreshQuotaStatus();
    refreshSpendingStatus();
  }, [config]);

  useEffect(() => {
    void checkBackendHealth();
  }, [organizationId]);

  const handleUpdate = (updates: Partial<ProviderConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    SettingsStore.save(updated);
    setSavedAlert(true);
    window.setTimeout(() => setSavedAlert(false), 2000);
  };

  const handleSpendingLimitsUpdate = (updates: Partial<ProviderConfig['imageSpendingLimits']>) => {
    handleUpdate({ imageSpendingLimits: { ...config.imageSpendingLimits, ...updates } });
  };

  const handleOperationOverride = (op: AIOperationType, modelId: string) => {
    const overrides = { ...(config.operationOverrides || {}) };
    if (modelId) overrides[op] = modelId;
    else delete overrides[op];
    handleUpdate({ operationOverrides: overrides });
  };

  const handleThinkingLevel = (op: AIOperationType, level: ThinkingLevel) => {
    handleUpdate({ thinkingLevels: { ...(config.thinkingLevels || {}), [op]: level } });
  };

  async function checkBackendHealth() {
    setHealthChecking(true);
    try {
      setHealthStatus(await AuthService.checkBackendHealth(organizationId));
    } catch {
      setHealthStatus({
        status: 'unavailable',
        message: 'The authenticated backend health operation could not be completed.',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setHealthChecking(false);
    }
  }

  async function handleTestGemini() {
    setTestingGemini(true);
    try {
      const result = await AuthService.testProvider('gemini', organizationId, config.defaultModelId);
      setGeminiTestResult(result);
    } catch (err: any) {
      setGeminiTestResult({
        ok: false,
        operation: 'test_gemini',
        provider: 'gemini',
        testedAt: new Date().toISOString(),
        error: 'test_failed',
        message: err.message || 'Gemini smoke test failed.',
      });
    } finally {
      setTestingGemini(false);
    }
  }

  async function handleTestNvidia() {
    setTestingNvidia(true);
    try {
      const result = await AuthService.testProvider('nvidia', organizationId, config.nvidiaModelId);
      setNvidiaTestResult(result);
    } catch (err: any) {
      setNvidiaTestResult({
        ok: false,
        operation: 'test_nvidia',
        provider: 'nvidia',
        testedAt: new Date().toISOString(),
        error: 'test_failed',
        message: err.message || 'NVIDIA smoke test failed.',
      });
    } finally {
      setTestingNvidia(false);
    }
  }

  async function handleTestAll() {
    await Promise.all([handleTestGemini(), handleTestNvidia()]);
  }

  const handleResetDefaults = () => {
    if (!window.confirm('Reset client-safe preferences to defaults?')) return;
    SettingsStore.clear();
    setConfig(SettingsStore.get());
    setSavedAlert(true);
    window.setTimeout(() => setSavedAlert(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
            SYSTEM ARCHITECTURE & AI ENGINE
          </span>
          <h2 className="text-xl font-serif font-bold text-slate-900 mt-1">Backend AI & Workspace Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live provider credentials, model routing, and spend enforcement are managed by the authenticated backend.
          </p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Preferences</span>
        </button>
      </div>

      {savedAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Client-safe preferences saved.</span>
        </div>
      )}

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Backend Connection & Provider Status
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              This browser never receives provider API keys. A health check and explicit smoke tests use the authenticated backend operation.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            {AuthService.getRuntimeMode() === 'live' ? 'LIVE CONFIGURED' : 'DEMO / UNCONFIGURED'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-700">
            {healthStatus ? (
              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${healthClass[healthStatus.status]}`}>
                {healthStatus.status === 'live' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{healthStatus.message}</span>
              </span>
            ) : (
              <span className="text-slate-500">Checking authenticated backend status…</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void checkBackendHealth()}
              disabled={healthChecking}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{healthChecking ? 'Checking…' : 'Check Health'}</span>
            </button>
            <button
              onClick={() => void handleTestGemini()}
              disabled={testingGemini}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {testingGemini ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-blue-600" />}
              <span>Test Gemini</span>
            </button>
            <button
              onClick={() => void handleTestNvidia()}
              disabled={testingNvidia}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {testingNvidia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Test NVIDIA</span>
            </button>
            <button
              onClick={() => void handleTestAll()}
              disabled={testingGemini || testingNvidia}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Test AI Providers</span>
            </button>
          </div>
        </div>

        {/* Smoke Test Feedback Banners */}
        {(geminiTestResult || nvidiaTestResult) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {geminiTestResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                geminiTestResult.ok
                  ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {geminiTestResult.ok ? <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-bold">Gemini Text Smoke Test: {geminiTestResult.ok ? 'PASSED' : 'FAILED'}</div>
                  <div className="text-[11px] mt-0.5">{geminiTestResult.message}</div>
                </div>
              </div>
            )}
            {nvidiaTestResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                nvidiaTestResult.ok
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {nvidiaTestResult.ok ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-bold">NVIDIA NIM Image Smoke Test: {nvidiaTestResult.ok ? 'PASSED' : 'FAILED'}</div>
                  <div className="text-[11px] mt-0.5">{nvidiaTestResult.message}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            [
              'Gemini text',
              healthStatus?.providers?.text?.configured ? 'Server configured' : 'Not configured',
              healthStatus?.providers?.text?.configured === true,
              geminiTestResult ? (geminiTestResult.ok ? `Verified (${geminiTestResult.latencyMs}ms)` : 'Test failed') : undefined
            ],
            [
              'NVIDIA image (Free Dev)',
              healthStatus?.providers?.images?.nvidia?.configured ? 'Server configured ($0)' : 'Not configured',
              healthStatus?.providers?.images?.nvidia?.configured === true,
              nvidiaTestResult ? (nvidiaTestResult.ok ? `Verified (${nvidiaTestResult.latencyMs}ms)` : 'Test failed') : undefined
            ],
            [
              'BFL image (Paid)',
              healthStatus?.providers?.images?.bfl?.configured ? 'Server configured' : 'Not configured',
              healthStatus?.providers?.images?.bfl?.configured === true,
              undefined
            ],
            [
              'Gemini image',
              'Not enabled on this deployment',
              false,
              undefined
            ],
            [
              'Paid generation policy',
              healthStatus?.paidGenerationEnabled ? 'Enabled by server policy' : 'Disabled by server policy',
              healthStatus?.paidGenerationEnabled === true,
              undefined
            ],
            [
              'Private provider keys',
              'Never exposed to browser',
              true,
              undefined
            ],
          ].map(([label, value, configured, testInfo]) => (
            <div key={label as string} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">{label}</div>
              <div className="mt-1 font-semibold text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${configured ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span>{value}</span>
                </div>
                {testInfo && (
                  <span className="text-[10px] font-mono text-slate-500 font-normal">
                    {testInfo}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-600" />
            Client-Safe Model Preferences
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">SERVER ALLOWLIST IS AUTHORITATIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['Default model', 'defaultModelId', config.defaultModelId],
            ['Fallback preference', 'fallbackModelId', config.fallbackModelId],
            ['Premium preference', 'premiumModelId', config.premiumModelId],
          ].map(([label, field, value]) => (
            <label key={field as string} className="space-y-1.5 block">
              <span className="block text-xs font-bold text-slate-800">{label}</span>
              <select
                value={value as string}
                onChange={(event) => handleUpdate({ [field as string]: event.target.value } as Partial<ProviderConfig>)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
              >
                {textModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.displayName} ({model.id})</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {OPERATIONS.map((item) => {
            const currentOverride = config.operationOverrides?.[item.op] || '';
            const currentThinking = config.thinkingLevels?.[item.op] || item.defaultThinking;
            return (
              <div key={item.op} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-xs">
                  <div className="font-semibold text-slate-800">{item.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Default: {item.defaultModel}</div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={currentOverride}
                    onChange={(event) => handleOperationOverride(item.op, event.target.value)}
                    className="text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="">Global default ({config.defaultModelId})</option>
                    {textModels.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
                  </select>
                  <select
                    value={currentThinking}
                    onChange={(event) => handleThinkingLevel(item.op, event.target.value as ThinkingLevel)}
                    className="text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-700"
                  >
                    <option value="low">Thinking: Low</option>
                    <option value="medium">Thinking: Medium</option>
                    <option value="high">Thinking: High</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              Image & Spending Preferences
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">These are local preferences only. Server policy and atomic budget checks decide live generation.</p>
          </div>
        </div>

        <label className="block max-w-sm">
          <span className="block text-xs font-bold text-slate-800 mb-1">Default image quality tier</span>
          <select
            value={config.imageQualityTier}
            onChange={(event) => handleUpdate({ imageQualityTier: event.target.value as ImageQualityTier })}
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
          >
            <option value="free_dev">Free / Demo or development</option>
            <option value="paid_standard">Paid standard (requires server policy)</option>
            <option value="paid_maximum">Paid maximum (requires server policy)</option>
            <option value="paid_specialized">Paid specialized (requires server policy)</option>
            <option value="paid_alternate">Paid alternate (requires server policy)</option>
            <option value="auto">Auto (server policy)</option>
          </select>
        </label>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800"><DollarSign className="w-4 h-4" /></div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Request paid generation</h4>
                <p className="text-[11px] text-slate-500">Off by default; the backend must still authorize every request.</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPaidImageEnabled}
              onChange={(event) => handleSpendingLimitsUpdate({ enablePaidGeneration: event.target.checked })}
              className="h-4 w-4 accent-slate-900"
            />
          </div>

          {isPaidImageEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <label className="text-[11px] font-semibold text-slate-700">Max images per campaign
                <input type="number" min={1} max={50} value={config.imageSpendingLimits.maxImagesPerCampaign} onChange={(event) => handleSpendingLimitsUpdate({ maxImagesPerCampaign: Number(event.target.value) || 0 })} className="mt-1 w-full text-xs p-2 border border-slate-300 rounded-lg bg-white" />
              </label>
              <label className="text-[11px] font-semibold text-slate-700">Daily preference (USD)
                <input type="number" min={0} step="0.50" value={config.imageSpendingLimits.dailySpendingLimitUsd} onChange={(event) => handleSpendingLimitsUpdate({ dailySpendingLimitUsd: Number(event.target.value) || 0 })} className="mt-1 w-full text-xs p-2 border border-slate-300 rounded-lg bg-white" />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Local estimate spent: ${spendingSummary.spentTodayUsd.toFixed(2)}</span>
              </label>
              <label className="text-[11px] font-semibold text-slate-700">Monthly preference (USD)
                <input type="number" min={0} step="5.00" value={config.imageSpendingLimits.monthlySpendingLimitUsd} onChange={(event) => handleSpendingLimitsUpdate({ monthlySpendingLimitUsd: Number(event.target.value) || 0 })} className="mt-1 w-full text-xs p-2 border border-slate-300 rounded-lg bg-white" />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Local estimate spent: ${spendingSummary.spentThisMonthUsd.toFixed(2)}</span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" />Estimated local usage</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Provider quotas are dynamic; these browser values are estimates only.</p>
          </div>
          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">ESTIMATES ONLY</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {textModels.map((model) => {
            const summary = quotaSummaries[model.id] || { usedToday: 0, rpdLimit: 0, remainingToday: 0, percentageUsed: 0 };
            return (
              <div key={model.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                <div className="font-bold text-slate-900">{model.displayName}</div>
                <div className="flex items-baseline justify-between text-[11px]"><span className="text-slate-600">Estimated calls:</span><span className="font-mono font-bold text-slate-900">{summary.usedToday} / {summary.rpdLimit}</span></div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, summary.percentageUsed)}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
