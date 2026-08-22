import { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { CampaignLibrary } from './components/campaigns/CampaignLibrary';
import { AuthModal } from './components/auth/AuthModal';
import { SAMPLE_CAMPAIGNS } from './data/sampleCampaigns';
import { Presentation, AlertTriangle } from 'lucide-react';

import { Campaign, CampaignSourceData } from './types/campaign';
import { BrandKit } from './types/brandKit';
import { CampaignStore } from './services/storage/campaignStore';
import { BrandKitStore, createNeutralBrandKit } from './services/storage/brandKitStore';
import { AuthService, AppProfile } from './services/supabase/authService';
import { OrganizationService, AppOrganization } from './services/supabase/organizationService';
import { CampaignService } from './services/supabase/campaignService';
import { BrandKitService } from './services/supabase/brandKitService';
import { isSupabaseConfigured } from './services/supabase/client';
import { ServiceError } from './services/supabase/serviceError';

const CampaignWorkspace = lazy(async () => {
  const module = await import('./components/campaigns/CampaignWorkspace');
  return { default: module.CampaignWorkspace };
});
const SourceIntakeForm = lazy(async () => {
  const module = await import('./components/campaigns/SourceIntakeForm');
  return { default: module.SourceIntakeForm };
});
const BrandKitManager = lazy(async () => {
  const module = await import('./components/brand/BrandKitManager');
  return { default: module.BrandKitManager };
});
const LeadFinder = lazy(async () => {
  const module = await import('./components/leads/LeadFinder');
  return { default: module.LeadFinder };
});
const SettingsView = lazy(async () => {
  const module = await import('./components/settings/SettingsView');
  return { default: module.SettingsView };
});
const CampaignReviewPortal = lazy(async () => {
  const module = await import('./components/review/CampaignReviewPortal');
  return { default: module.CampaignReviewPortal };
});
const PresenterView = lazy(async () => {
  const module = await import('./features/presentations/components/PresenterView');
  return { default: module.PresenterView };
});

const DEMO_PRESENTER_CAMPAIGN_IDS = new Set([
  'campaign-phoenix-fix-flip',
  'campaign-dallas-multifamily',
]);

export function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>(() => createNeutralBrandKit());
  const [hasPersistedBrandKit, setHasPersistedBrandKit] = useState(false);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [organization, setOrganization] = useState<AppOrganization | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<'demo' | 'live'>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1') {
      return 'demo';
    }
    return isSupabaseConfigured() ? 'live' : 'demo';
  });
  const [dataError, setDataError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const loadRequestRef = useRef(0);

  // Review mode parameters (/review/:token or ?review=:token)
  const { isReviewMode, reviewToken } = useMemo(() => {
    if (typeof window === 'undefined') return { isReviewMode: false, reviewToken: null };
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/review\/(.+)$/i);
    if (match) {
      const parsedToken = decodeURIComponent(match[1]).replace(/\/+$/, '');
      if (parsedToken) {
        return { isReviewMode: true, reviewToken: parsedToken };
      }
    }
    const params = new URLSearchParams(window.location.search);
    const qReview = params.get('review');
    if (qReview) {
      return { isReviewMode: true, reviewToken: qReview.trim() };
    }
    return { isReviewMode: false, reviewToken: null };
  }, []);

  // Presenter mode parameters
  const { isPresenterMode, presenterCampaignId } = useMemo(() => {
    if (typeof window === 'undefined') return { isPresenterMode: false, presenterCampaignId: null };
    const params = new URLSearchParams(window.location.search);
    const presenter = params.get('presenter') === '1' || params.has('presenter');
    const campaignId = params.get('campaign');
    return { isPresenterMode: presenter, presenterCampaignId: campaignId };
  }, []);

  const handleEnterDemo = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '1');
    url.searchParams.delete('presenter');
    url.searchParams.delete('campaign');
    window.location.assign(url.toString());
  };

  const handleExitDemo = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    url.searchParams.delete('presenter');
    url.searchParams.delete('campaign');
    window.location.assign(url.pathname + (url.search ? url.search : ''));
  };

  const loadData = async () => {
    const requestId = ++loadRequestRef.current;
    const isCurrentRequest = () => requestId === loadRequestRef.current;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isExplicitDemo = params?.get('demo') === '1';

    // Explicit demo mode is checked FIRST and isolated from live Supabase calls
    if (isExplicitDemo) {
      setRuntimeMode('demo');
      setProfile(null);
      setOrganization(null);
      setCampaigns(CampaignStore.getAll({ allowDemoFixtures: true }));
      setBrandKit(BrandKitStore.get({ allowDemoFixtures: true }));
      setHasPersistedBrandKit(false);
      setDataError(null);
      return;
    }

    const live = isSupabaseConfigured();
    if (!isCurrentRequest()) return;
    setRuntimeMode(live ? 'live' : 'demo');
    setDataError(null);

    try {
      if (live) {
        const user = await AuthService.getUser();
        if (!user) {
          // Configured but unauthenticated is a real live state, not demo mode.
          setProfile(null);
          setOrganization(null);
          setCampaigns([]);
          setBrandKit(createNeutralBrandKit());
          setHasPersistedBrandKit(false);
          return;
        }

        const userProfile = await AuthService.getProfile(user.id);
        const org = await OrganizationService.getDefaultOrganization(user.id);
        if (!org) {
          throw new ServiceError('forbidden', 'Your account is not a member of an organization.');
        }

        const [loadedCampaigns, loadedBrandKit] = await Promise.all([
          CampaignService.getCampaigns(org.id, 'live'),
          BrandKitService.getBrandKit(org.id, 'live'),
        ]);

        if (!isCurrentRequest()) return;

        setProfile(userProfile);
        setOrganization(org);
        setCampaigns(loadedCampaigns);
        setBrandKit(loadedBrandKit || createNeutralBrandKit());
        setHasPersistedBrandKit(Boolean(loadedBrandKit));
        return;
      }

      // No Supabase configuration is an explicit demo fixture mode. Fixture
      // values never enter the authenticated/live branch above.
      setProfile(null);
      setOrganization(null);
      setCampaigns(CampaignStore.getAll({ allowDemoFixtures: true }));
      setBrandKit(BrandKitStore.get({ allowDemoFixtures: true }));
      setHasPersistedBrandKit(false);
    } catch (error: unknown) {
      if (!isCurrentRequest()) return;
      console.warn('Data load failed', error);
      setProfile(null);
      setOrganization(null);
      if (live) {
        // Preserve the distinction between a live error and an empty/demo
        // workspace. Do not replace an authenticated error with samples.
        setCampaigns([]);
        setBrandKit(createNeutralBrandKit());
        setHasPersistedBrandKit(false);
        setDataError(error instanceof Error ? error.message : 'Live workspace data could not be loaded.');
      } else {
        setCampaigns(CampaignStore.getAll({ allowDemoFixtures: true }));
        setBrandKit(BrandKitStore.get({ allowDemoFixtures: true }));
      }
    }
  };

  useEffect(() => {
    // PUBLIC ROUTE ISOLATION: Do not bootstrap authenticated studio state when in public review mode
    if (isReviewMode && reviewToken) {
      return;
    }

    void loadData();

    const { data: authListener } = AuthService.onAuthStateChange(() => {
      void loadData();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [isReviewMode, reviewToken]);

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setActiveView('workspace');
  };

  const handleUpdateCampaign = async (updated: Campaign) => {
    try {
      if (runtimeMode === 'demo') {
        const saved = CampaignStore.save(updated, { allowDemoFixtures: true });
        setSelectedCampaign(saved);
        setCampaigns((previous) => previous.map((campaign) => (campaign.id === saved.id ? saved : campaign)));
        setDataError(null);
        return;
      }

      if (!organization) {
        throw new ServiceError('forbidden', 'Sign in to update a live campaign.');
      }
      const saved = await CampaignService.updateCampaign(organization.id, updated, profile?.id, 'live');
      setSelectedCampaign(saved);
      setCampaigns((previous) => previous.map((campaign) => (campaign.id === saved.id ? saved : campaign)));
      setDataError(null);
    } catch (error: unknown) {
      setDataError(error instanceof Error ? error.message : 'Campaign update failed.');
    }
  };

  const handleCreateNewCampaign = async (sourceData: CampaignSourceData) => {
    const draft: Campaign = {
      // Live creation ignores this placeholder and uses the server-generated
      // UUID. Demo creation replaces it with an explicitly labeled local ID.
      id: '',
      name: sourceData.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      sourceData,
      designConfigs: CampaignStore.createDefaultDesignConfigs(),
      tags: [sourceData.campaignType, ...(runtimeMode === 'demo' ? ['Demo', 'Fictional'] : [])],
    };

    try {
      if (runtimeMode === 'demo') {
        const localId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const saved = CampaignStore.save({ ...draft, id: localId }, { allowDemoFixtures: true });
        setCampaigns((previous) => [saved, ...previous]);
        setSelectedCampaign(saved);
        setActiveView('workspace');
        setDataError(null);
        return;
      }

      if (!organization) {
        throw new ServiceError('forbidden', 'Sign in to create a live campaign.');
      }
      const saved = await CampaignService.createCampaign(organization.id, draft, profile?.id, 'live');
      setCampaigns((previous) => [saved, ...previous]);
      setSelectedCampaign(saved);
      setActiveView('workspace');
      setDataError(null);
    } catch (error: unknown) {
      setDataError(error instanceof Error ? error.message : 'Campaign creation failed.');
    }
  };

  const handleDuplicateCampaign = async (id: string) => {
    try {
      if (runtimeMode === 'demo') {
        const duplicated = CampaignStore.duplicate(id);
        if (duplicated) setCampaigns((previous) => [duplicated, ...previous]);
        else setDataError('Campaign was not found.');
        return;
      }

      if (!organization) {
        throw new ServiceError('forbidden', 'Sign in to duplicate a live campaign.');
      }
      const duplicated = await CampaignService.duplicateCampaign(id, organization.id, profile?.id, 'live');
      if (duplicated) setCampaigns((previous) => [duplicated, ...previous]);
      else setDataError('Campaign was not found.');
    } catch (error: unknown) {
      setDataError(error instanceof Error ? error.message : 'Campaign duplication failed.');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      if (runtimeMode === 'demo') {
        CampaignStore.delete(id);
        setCampaigns((previous) => previous.filter((campaign) => campaign.id !== id));
        if (selectedCampaign?.id === id) {
          setSelectedCampaign(null);
          setActiveView('campaigns');
        }
        setDataError(null);
        return;
      }

      if (!organization) {
        throw new ServiceError('forbidden', 'Sign in to delete a live campaign.');
      }
      await CampaignService.deleteCampaign(id, organization.id, 'live');
      setCampaigns((previous) => previous.filter((campaign) => campaign.id !== id));
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
        setActiveView('campaigns');
      }
      setDataError(null);
    } catch (error: unknown) {
      setDataError(error instanceof Error ? error.message : 'Campaign deletion failed.');
    }
  };

  const handleSaveBrandKit = async (updated: BrandKit) => {
    try {
      if (runtimeMode === 'demo') {
        const saved = BrandKitStore.save(updated);
        setBrandKit(saved);
        setHasPersistedBrandKit(true);
        setDataError(null);
        return;
      }

      if (!organization) {
        throw new ServiceError('forbidden', 'Sign in to save a live brand kit.');
      }
      const saved = hasPersistedBrandKit
        ? await BrandKitService.updateBrandKit(organization.id, updated, 'live')
        : await BrandKitService.createBrandKit(organization.id, updated, 'live');
      setBrandKit(saved);
      setHasPersistedBrandKit(true);
      setDataError(null);
    } catch (error: unknown) {
      setDataError(error instanceof Error ? error.message : 'Brand kit save failed.');
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } finally {
      setProfile(null);
      setOrganization(null);
      setSelectedCampaign(null);
      void loadData();
    }
  };

  // -------------------------------------------------------------
  // PUBLIC CLIENT REVIEW PORTAL STANDALONE ENTRY (/review/:token)
  // -------------------------------------------------------------
  if (isReviewMode && reviewToken) {
    return (
      <Suspense fallback={<RouteLoading label="Loading public review…" />}>
        <CampaignReviewPortal token={reviewToken} />
      </Suspense>
    );
  }

  // -------------------------------------------------------------
  // PRESENTER MODE STANDALONE ENTRY (Issue 6)
  // -------------------------------------------------------------
  if (isPresenterMode && presenterCampaignId) {
    // Resolve presenter campaign
    let presenterCampaign = campaigns.find((c) => c.id === presenterCampaignId);
    const isAllowlistedDemoPresenter = DEMO_PRESENTER_CAMPAIGN_IDS.has(presenterCampaignId);

    if (!presenterCampaign && (runtimeMode === 'demo' || isAllowlistedDemoPresenter)) {
      presenterCampaign =
        CampaignStore.getById(presenterCampaignId, { allowDemoFixtures: true }) ||
        SAMPLE_CAMPAIGNS.find((c) => c.id === presenterCampaignId);
    }

    if (!presenterCampaign) {
      return (
        <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-serif font-bold text-slate-100">Campaign Not Found or Access Restricted</h1>
          <p className="text-sm text-slate-400 max-w-md">
            Could not resolve campaign "{presenterCampaignId}". {runtimeMode === 'live' ? 'Ensure you are signed in to an organization with access to this campaign.' : 'Please verify the demo campaign ID.'}
          </p>
          {runtimeMode === 'live' && !profile && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
            >
              Sign In to Access Campaign
            </button>
          )}
          <a
            href={window.location.pathname}
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Return to Dashboard
          </a>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={() => { void loadData(); setIsAuthModalOpen(false); }}
            onEnterDemo={handleEnterDemo}
          />
        </div>
      );
    }

    return (
      <Suspense fallback={<RouteLoading label="Loading presentation…" />}>
        <PresenterView
          campaign={presenterCampaign}
          brandKit={brandKit}
          runtimeMode={isAllowlistedDemoPresenter ? 'demo' : runtimeMode}
          onUpdateCampaign={(updated) => void handleUpdateCampaign(updated)}
        />
      </Suspense>
    );
  }

  return (
    <AppShell
      activeView={activeView}
      onNavigate={(view) => {
        if (view !== 'workspace') setSelectedCampaign(null);
        setActiveView(view);
      }}
      brandKit={brandKit}
      profile={profile}
      organization={organization}
      runtimeMode={runtimeMode}
      onExitDemo={runtimeMode === 'demo' ? handleExitDemo : undefined}
      onOpenAuth={() => setIsAuthModalOpen(true)}
      onSignOut={() => void handleSignOut()}
    >
      <div className={`mb-6 px-4 py-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 shadow-subtle ${
        runtimeMode === 'live'
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-gradient-to-r from-amber-50/90 to-amber-100/40 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-mono font-bold text-[10px] uppercase tracking-wider border border-amber-300/80">
            {runtimeMode === 'live' ? 'Live workspace' : 'DEMO WORKSPACE · FICTIONAL DATA'}
          </span>
          <span className="text-slate-600 text-xs hidden sm:inline font-medium">
            {runtimeMode === 'live'
              ? 'Data and AI operations require an authenticated organization.'
              : 'Fictional campaigns are local fixtures and are never used as live data.'}
          </span>
        </div>
        {runtimeMode === 'demo' && (
          <div className="flex items-center gap-2">
            {campaigns.some((c) => c.id === 'campaign-phoenix-fix-flip') && (
              <button
                type="button"
                onClick={() => {
                  const phx = campaigns.find((c) => c.id === 'campaign-phoenix-fix-flip');
                  if (phx) handleSelectCampaign(phx);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Presentation className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Flagship Demo</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExitDemo}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-subtle"
            >
              Exit Demo
            </button>
          </div>
        )}
      </div>

      {dataError && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs" role="alert">
          {dataError}
        </div>
      )}

      {activeView === 'dashboard' && (
        <DashboardOverview
          campaigns={campaigns}
          brandKit={brandKit}
          onSelectCampaign={handleSelectCampaign}
          onNewCampaign={() => setActiveView('new_campaign')}
          onNavigate={(view) => setActiveView(view)}
        />
      )}

      {activeView === 'campaigns' && (
        <CampaignLibrary
          campaigns={campaigns}
          brandKit={brandKit}
          onSelectCampaign={handleSelectCampaign}
          onNewCampaign={() => setActiveView('new_campaign')}
          onDuplicateCampaign={(id) => void handleDuplicateCampaign(id)}
          onDeleteCampaign={(id) => void handleDeleteCampaign(id)}
          onResetSamples={() => {
            if (runtimeMode === 'demo') {
              CampaignStore.resetToSamples();
              void loadData();
            } else {
              setDataError('Demo fixtures cannot be loaded into a live workspace.');
            }
          }}
        />
      )}

      {activeView === 'new_campaign' && (
        <Suspense fallback={<RouteLoading label="Loading campaign intake…" />}>
          <SourceIntakeForm
            organizationId={runtimeMode === 'live' ? organization?.id : undefined}
            campaignId={runtimeMode === 'live' ? 'drafts' : undefined}
            runtimeMode={runtimeMode}
            onSave={(sourceData) => void handleCreateNewCampaign(sourceData)}
            onCancel={() => setActiveView('campaigns')}
          />
        </Suspense>
      )}

      {activeView === 'workspace' && selectedCampaign && (
        <Suspense fallback={<RouteLoading label="Loading campaign studio…" />}>
          <CampaignWorkspace
            campaign={selectedCampaign}
            brandKit={brandKit}
            organizationId={organization?.id}
            runtimeMode={runtimeMode}
            onUpdateCampaign={(campaign) => void handleUpdateCampaign(campaign)}
            onBack={() => setActiveView('campaigns')}
          />
        </Suspense>
      )}

      {activeView === 'brand' && (
        <Suspense fallback={<RouteLoading label="Loading Brand Kit…" />}>
          <BrandKitManager
            brandKit={brandKit}
            organizationId={organization?.id}
            runtimeMode={runtimeMode}
            onSaveBrandKit={(kit) => void handleSaveBrandKit(kit)}
          />
        </Suspense>
      )}
      {activeView === 'leads' && (
        <Suspense fallback={<RouteLoading label="Loading lead finder…" />}>
          <LeadFinder />
        </Suspense>
      )}
      {activeView === 'settings' && (
        <Suspense fallback={<RouteLoading label="Loading settings…" />}>
          <SettingsView organizationId={organization?.id} />
        </Suspense>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => { void loadData(); setIsAuthModalOpen(false); }}
        onEnterDemo={handleEnterDemo}
      />
    </AppShell>
  );
}

function RouteLoading({ label }: { label: string }) {
  return (
    <div className="min-h-[240px] flex items-center justify-center text-xs font-mono text-slate-500">
      {label}
    </div>
  );
}

export default App;
