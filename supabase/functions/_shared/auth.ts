import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AppError } from './errors.ts';

export type AuthContext = {
  user: User;
  admin: SupabaseClient;
  accessToken: string;
};

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new AppError('server_configuration_error', 503, 'The server is not configured for this operation.');
  return value;
}

export async function authenticate(req: Request): Promise<AuthContext> {
  const authorization = req.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AppError('unauthorized', 401, 'Authentication is required.');

  const url = requiredEnv('SUPABASE_URL');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const accessToken = match[1];
  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await userClient.auth.getUser(accessToken);
  if (error || !data.user) throw new AppError('unauthorized', 401, 'Authentication is required.');

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { user: data.user, admin, accessToken };
}

export async function assertOrganizationAccess(
  ctx: AuthContext,
  organizationId: string,
  campaignId?: string,
): Promise<{ role: string }> {
  const { data: member, error: memberError } = await ctx.admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', ctx.user.id)
    .maybeSingle();
  if (memberError || !member) throw new AppError('organization_access_denied', 403, 'You do not have access to this workspace.');
  if (campaignId) {
    const { data: campaign, error: campaignError } = await ctx.admin
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (campaignError || !campaign) throw new AppError('campaign_access_denied', 403, 'You do not have access to this campaign.');
  }
  return { role: member.role };
}
