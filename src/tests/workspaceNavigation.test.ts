import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWorkspaceNavigation,
  readWorkspaceNavigation,
  rememberAppView,
  rememberWorkspace,
  rememberWorkspaceTab,
} from '../services/storage/workspaceNavigation';

describe('workspace navigation persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWorkspaceNavigation();
  });

  it('remembers selected campaign and workspace tab for reload restoration', () => {
    rememberWorkspace('campaign-phoenix-fix-flip', 'presentation');
    expect(readWorkspaceNavigation()).toMatchObject({
      view: 'workspace',
      campaignId: 'campaign-phoenix-fix-flip',
      workspaceTab: 'presentation',
    });

    rememberWorkspaceTab('campaign-phoenix-fix-flip', 'designs');
    expect(readWorkspaceNavigation()).toMatchObject({
      view: 'workspace',
      campaignId: 'campaign-phoenix-fix-flip',
      workspaceTab: 'designs',
    });
  });

  it('clears campaign selection when navigating back to a top-level view', () => {
    rememberWorkspace('campaign-phoenix-fix-flip', 'review');
    rememberAppView('campaigns');

    expect(readWorkspaceNavigation()).toMatchObject({
      view: 'campaigns',
    });
    expect(readWorkspaceNavigation()?.campaignId).toBeUndefined();
  });

  it('can be explicitly cleared on demo exit or sign out', () => {
    rememberWorkspace('campaign-phoenix-fix-flip');
    clearWorkspaceNavigation();
    expect(readWorkspaceNavigation()).toBeNull();
  });
});
