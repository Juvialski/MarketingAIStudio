import React from 'react';
import { AlertTriangle, Check, Image as ImageIcon, LockKeyhole } from 'lucide-react';
import { IMAGE_PROVIDER_DEFINITIONS } from '../../services/providers/imageProviderRegistry';

/**
 * Provider capability reference. Live benchmarking was intentionally removed:
 * running four paid APIs from browser JavaScript exposed credentials and could
 * spend without an authoritative server budget check.
 */
export const ImageQualityComparison: React.FC = () => {
  const providers = Object.values(IMAGE_PROVIDER_DEFINITIONS).filter(
    (provider) => provider.providerId !== 'mock'
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="text-sm font-bold">Server-controlled provider evaluation</h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              Live side-by-side generation is disabled in the browser. Provider credentials,
              allowlists, persistence, and paid limits are enforced by the authenticated backend.
              Use a manually invoked server smoke test when credentials and a test budget are configured.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <section
            key={provider.providerId}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{provider.displayName}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{provider.description}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  provider.providerId === 'upload'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {provider.providerId === 'upload' ? 'Available' : 'Server status required'}
              </span>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {provider.models.map((model) => (
                <div key={model} className="flex items-center gap-2 text-xs text-slate-700">
                  {provider.providerId === 'upload' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <code className="break-all">{model}</code>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
