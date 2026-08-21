import { describe, it, expect } from 'vitest';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';
import { resolveFactValue } from '../features/presentations/utils/resolveFactValues';

describe('financialFactMapping (Truth Engine factKey Resolution)', () => {
  const phoenixCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === 'campaign-phoenix-fix-flip')!;
  const dallasCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === 'campaign-dallas-multifamily')!;

  it('resolves Phoenix fix-and-flip financial facts accurately from the Truth Engine', () => {
    expect(resolveFactValue('purchase_price', phoenixCampaign)).toBe('$285,000');
    expect(resolveFactValue('renovation_estimate', phoenixCampaign)).toBe('$35,000');
    expect(resolveFactValue('all_in_basis', phoenixCampaign)).toBe('$320,000');
    expect(resolveFactValue('arv', phoenixCampaign)).toBe('$390,000');
    expect(resolveFactValue('gross_spread', phoenixCampaign)).toBe('$70,000');
    expect(resolveFactValue('gross_spread_percent_on_cost', phoenixCampaign)).toBe('21.9%');
    expect(resolveFactValue('price_per_square_foot', phoenixCampaign)).toBe('$154.89/SF');
    expect(resolveFactValue('arv_per_square_foot', phoenixCampaign)).toBe('$211.96/SF');
  });

  it('resolves Dallas multi-family commercial facts accurately from the Truth Engine', () => {
    expect(resolveFactValue('purchase_price', dallasCampaign)).toBe('$1,150,000');
    expect(resolveFactValue('renovation_estimate', dallasCampaign)).toBe('$96,000');
    expect(resolveFactValue('all_in_basis', dallasCampaign)).toBe('$1,246,000');
    expect(resolveFactValue('in_place_cap_rate', dallasCampaign)).toBe('6.8%');
    expect(resolveFactValue('stabilized_cap_rate_on_purchase', dallasCampaign)).toBe('9.4%');
    expect(resolveFactValue('stabilized_yield_on_cost', dallasCampaign)).toBe('8.7%');
    expect(resolveFactValue('doors', dallasCampaign)).toBe('8');
  });

  it('returns null for unresolvable or unknown fact keys', () => {
    expect(resolveFactValue('non_existent_key', phoenixCampaign)).toBeNull();
  });
});
