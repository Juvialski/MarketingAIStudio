import { supabase, isSupabaseConfigured } from './client';
import { ServiceError } from './serviceError';

export interface AppOrganization {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationMembershipRow {
  role: AppOrganization['role'];
  organizations: OrganizationRow | null;
}

export class OrganizationService {
  public static async getUserOrganizations(userId: string): Promise<AppOrganization[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('organization_members')
      .select('role, organizations(id, name, slug)')
      .eq('user_id', userId);

    if (error) {
      throw new ServiceError('query_failed', 'Unable to load the user organizations.', error);
    }

    const rows = (data || []) as unknown as OrganizationMembershipRow[];
    return rows
      .filter((item) => item.organizations !== null)
      .map((item) => ({
        id: item.organizations!.id,
        name: item.organizations!.name,
        slug: item.organizations!.slug,
        role: item.role,
      }));
  }

  public static async getDefaultOrganization(userId: string): Promise<AppOrganization | null> {
    const organizations = await this.getUserOrganizations(userId);
    return organizations[0] || null;
  }
}
