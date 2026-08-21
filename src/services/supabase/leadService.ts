import { supabase, isSupabaseConfigured } from './client';
import { Lead } from '../../types/leads';
import { SAMPLE_LEADS } from '../leads/leadResearchService';
import { Database, Json } from '../../types/database.types';
import { ServiceError } from './serviceError';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];

const mapRowToLead = (row: LeadRow): Lead => ({
  id: row.id,
  companyName: row.company_name,
  category: row.category,
  website: row.website || '',
  metroArea: row.metro_area,
  publicContactEmail: row.public_contact_email || undefined,
  publicPhone: row.public_phone || undefined,
  addressSummary: row.address_summary || undefined,
  estimatedPortfolioType: row.estimated_portfolio_type || '',
  leadScore: row.lead_score,
  relevanceReason: row.relevance_reason,
  sourceUrl: row.source_url || '',
  outreachAngle: row.outreach_angle as unknown as Lead['outreachAngle'],
  status: row.status || 'new',
});

export class LeadService {
  public static async getLeads(organizationId: string): Promise<Lead[]> {
    if (!isSupabaseConfigured()) return SAMPLE_LEADS;
    if (!organizationId) throw new ServiceError('forbidden', 'A live organization is required to load leads.');

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .order('lead_score', { ascending: false });
    if (error) throw new ServiceError('query_failed', 'Unable to load organization leads.', error);
    return ((data || []) as LeadRow[]).map(mapRowToLead);
  }

  public static async saveLeads(organizationId: string, leads: Lead[]): Promise<void> {
    if (!isSupabaseConfigured()) return;
    if (!organizationId) throw new ServiceError('forbidden', 'A live organization is required to save leads.');

    const rows: LeadInsert[] = leads.map((lead) => ({
      organization_id: organizationId,
      company_name: lead.companyName,
      category: lead.category,
      website: lead.website || null,
      metro_area: lead.metroArea,
      public_contact_email: lead.publicContactEmail || null,
      public_phone: lead.publicPhone || null,
      address_summary: lead.addressSummary || null,
      estimated_portfolio_type: lead.estimatedPortfolioType || null,
      lead_score: lead.leadScore,
      relevance_reason: lead.relevanceReason,
      source_url: lead.sourceUrl || null,
      outreach_angle: lead.outreachAngle as unknown as Json,
      status: lead.status,
    }));
    if (rows.length === 0) return;

    const { error } = await supabase.from('leads').upsert(rows);
    if (error) throw new ServiceError('write_failed', 'Unable to save organization leads.', error);
  }
}
