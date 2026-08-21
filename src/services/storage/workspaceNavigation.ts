export type PersistedWorkspaceTab =
  | 'kit'
  | 'strategy'
  | 'copy'
  | 'designs'
  | 'presentation'
  | 'review'
  | 'intake';

export interface WorkspaceNavigationState {
  view: string;
  campaignId?: string;
  workspaceTab?: PersistedWorkspaceTab;
  updatedAt: number;
}

const STORAGE_KEY = 'deedforge_workspace_navigation_v1';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

const getSessionStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
    return null;
  } catch {
    return null;
  }
};

export function isWorkspaceTab(value: unknown): value is PersistedWorkspaceTab {
  return (
    value === 'kit' ||
    value === 'strategy' ||
    value === 'copy' ||
    value === 'designs' ||
    value === 'presentation' ||
    value === 'review' ||
    value === 'intake'
  );
}

export function readWorkspaceNavigation(): WorkspaceNavigationState | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<WorkspaceNavigationState>;
    if (!parsed.view || typeof parsed.updatedAt !== 'number') {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      view: parsed.view,
      campaignId: typeof parsed.campaignId === 'string' ? parsed.campaignId : undefined,
      workspaceTab: isWorkspaceTab(parsed.workspaceTab) ? parsed.workspaceTab : undefined,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeWorkspaceNavigation(state: WorkspaceNavigationState): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Navigation persistence is convenience-only and must never block the app.
  }
}

export function rememberAppView(view: string): void {
  writeWorkspaceNavigation({
    view,
    updatedAt: Date.now(),
  });
}

export function rememberWorkspace(
  campaignId: string,
  workspaceTab: PersistedWorkspaceTab = 'kit'
): void {
  writeWorkspaceNavigation({
    view: 'workspace',
    campaignId,
    workspaceTab,
    updatedAt: Date.now(),
  });
}

export function rememberWorkspaceTab(
  campaignId: string,
  workspaceTab: PersistedWorkspaceTab
): void {
  rememberWorkspace(campaignId, workspaceTab);
}

export function clearWorkspaceNavigation(): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // No-op.
  }
}
