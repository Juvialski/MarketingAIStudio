import React from 'react';
import { Sidebar } from './Sidebar';
import { BrandKit } from '../../types/brandKit';
import { AppProfile } from '../../services/supabase/authService';
import { AppOrganization } from '../../services/supabase/organizationService';
import { isSupabaseConfigured } from '../../services/supabase/client';
import { ShieldCheck, Database, LogIn, LogOut } from 'lucide-react';

interface AppShellProps {
  activeView: string;
  onNavigate: (view: string) => void;
  brandKit: BrandKit;
  profile: AppProfile | null;
  organization: AppOrganization | null;
  runtimeMode?: 'demo' | 'live';
  onExitDemo?: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeView,
  onNavigate,
  brandKit,
  profile,
  organization,
  runtimeMode = 'live',
  onExitDemo,
  onOpenAuth,
  onSignOut,
  children,
}) => {
  const isConnected = isSupabaseConfigured();
  const isDemo = runtimeMode === 'demo';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Left Sidebar */}
      <Sidebar activeView={activeView} onNavigate={onNavigate} brandKit={brandKit} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
              ZAW REAL ESTATE STUDIO
            </span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-800 capitalize truncate">
              {activeView.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Runtime / Connection Status Badge */}
            {isDemo ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold rounded-lg border bg-amber-50 text-amber-900 border-amber-300 shadow-sm"
                  title="Explicit Demo Mode: Using local fictional fixtures. No live data is read or written."
                >
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  <span>DEMO WORKSPACE · FICTIONAL DATA</span>
                </div>
                {onExitDemo && (
                  <button
                    type="button"
                    onClick={onExitDemo}
                    className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title="Exit demo mode and return to live workspace"
                  >
                    <LogOut className="w-3 h-3 text-slate-500" />
                    <span>Exit Demo</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono rounded-lg border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
                title={
                  isConnected
                    ? 'Connected to live Supabase project: ZawMarketing (csolgywkgummefnwouny)'
                    : 'Running in zero-key local mode with local persistence fallback'
                }
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isConnected ? 'Supabase: Live (ZawMarketing)' : 'Supabase: Local Fixture Mode'}</span>
              </div>
            )}

            {/* Anti-Slop Safeguard Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Anti-Slop Engine Active</span>
            </div>

            {/* User Profile & Auth Trigger */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {profile ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center font-mono shadow-sm">
                    {profile.displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {profile.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {organization?.name || 'Workspace'}
                    </div>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 sm:p-8 max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
