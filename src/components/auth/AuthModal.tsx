import React, { useState } from 'react';
import { AuthService } from '../../services/supabase/authService';
import { SUPABASE_URL, isSupabaseConfigured } from '../../services/supabase/client';
import { Lock, Mail, User as UserIcon, Building2, Check, X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  onEnterDemo?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onEnterDemo,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const { error } = await AuthService.signUp(
          email,
          password,
          displayName.trim(),
          companyName.trim()
        );
        if (error) throw error;
      } else {
        const { error } = await AuthService.signIn(email, password);
        if (error) throw error;
      }

      onAuthSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    if (onEnterDemo) {
      onEnterDemo();
      onClose();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '1');
    url.searchParams.delete('presenter');
    url.searchParams.delete('campaign');
    window.location.assign(url.toString());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 relative space-y-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold">
              SUPABASE AUTHENTICATION
            </span>
          </div>
          <h2 id="auth-dialog-title" className="text-xl font-serif font-bold text-slate-900 mt-2">
            {isSignUp ? 'Create Workspace Account' : 'Sign In to Studio Workspace'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isSupabaseConfigured()
              ? <>Connected to dedicated Supabase project: <span className="font-mono text-slate-700 font-semibold">{SUPABASE_URL.replace('https://', '')}</span></>
              : 'Live backend is not configured; you can launch the explicitly labeled demo workspace.'}
          </p>
        </div>

        {/* Demo Fast Login Banner */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Demo / Reviewer Fast Pass
            </span>
            <span className="text-[9px] font-mono bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded">
              1-CLICK
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Launch the clearly labeled fictional fixture workspace. It is never used for authenticated live data.
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Launch Fictional Demo Workspace
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Your Name"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Firm Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Your Firm"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="acquisitions@yourfirm.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>{loading ? 'Processing...' : isSignUp ? 'Create Workspace' : 'Sign In'}</span>
          </button>
        </form>

        {/* Toggle between Sign In / Sign Up */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-slate-900 font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a new workspace?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-slate-900 font-bold hover:underline"
              >
                Create Workspace
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
