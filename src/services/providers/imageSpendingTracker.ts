/**
 * Image Spending Tracker & Budget Guardrail Service
 * Prevents runaway API usage by enforcing daily/monthly USD limits and deliberate enablement.
 */

import { ImageCostMetadata, ImageSpendingLimits } from '../../types/providers';

const SPENDING_STORAGE_KEY = 'zaw_image_spending_records_v1';
let inMemorySpendingStorage: string | null = null;

export interface ImageSpendingRecord {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  costUsd: number;
  isEstimated: boolean;
  campaignId?: string;
  purpose: string;
  success: boolean;
}

export interface SpendingSummary {
  spentTodayUsd: number;
  spentThisMonthUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  isDailyLimitReached: boolean;
  isMonthlyLimitReached: boolean;
  isPaidGenerationEnabled: boolean;
  recentRecords: ImageSpendingRecord[];
}

export class ImageSpendingTracker {
  private static getStorageItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {
      // Ignore
    }
    return inMemorySpendingStorage;
  }

  private static setStorageItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Ignore
    }
    inMemorySpendingStorage = value;
  }

  private static getRecords(): ImageSpendingRecord[] {
    try {
      const raw = this.getStorageItem(SPENDING_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse image spending records', e);
    }
    return [];
  }

  private static saveRecords(records: ImageSpendingRecord[]): void {
    try {
      const trimmed = records.slice(-500);
      this.setStorageItem(SPENDING_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save image spending records', e);
    }
  }

  /**
   * Verifies if a paid generation is allowed under current workspace spending rules.
   * Throws an error or returns false if budget is exceeded or paid generation is disabled.
   */
  public static canExecutePaidGeneration(
    costUsd: number,
    limits: ImageSpendingLimits,
    campaignId?: string
  ): { allowed: boolean; reason?: string } {
    if (!limits.enablePaidGeneration) {
      return {
        allowed: false,
        reason: 'Paid image generation is disabled for this workspace. Enable it in Settings > AI & Image Providers.',
      };
    }

    const summary = this.getSpendingSummary(limits);

    if (summary.spentTodayUsd + costUsd > limits.dailySpendingLimitUsd) {
      return {
        allowed: false,
        reason: `Daily spending limit ($${limits.dailySpendingLimitUsd.toFixed(2)}) would be exceeded. Current spend today: $${summary.spentTodayUsd.toFixed(2)}.`,
      };
    }

    if (summary.spentThisMonthUsd + costUsd > limits.monthlySpendingLimitUsd) {
      return {
        allowed: false,
        reason: `Monthly spending limit ($${limits.monthlySpendingLimitUsd.toFixed(2)}) would be exceeded. Current spend this month: $${summary.spentThisMonthUsd.toFixed(2)}.`,
      };
    }

    if (campaignId && limits.maxImagesPerCampaign > 0) {
      const campaignCount = this.getCampaignImageCount(campaignId);
      if (campaignCount >= limits.maxImagesPerCampaign) {
        return {
          allowed: false,
          reason: `Maximum images per campaign limit (${limits.maxImagesPerCampaign}) reached for this campaign.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Records a visual generation transaction with cost metadata.
   */
  public static recordGeneration(params: {
    provider: string;
    model: string;
    costUsd: number;
    purpose: string;
    campaignId?: string;
    success?: boolean;
    providerRequestId?: string;
  }): ImageCostMetadata {
    const costUsd = params.costUsd || 0;
    const isEstimated = true;
    const timestamp = new Date().toISOString();

    const record: ImageSpendingRecord = {
      id: `img-spend-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      provider: params.provider,
      model: params.model,
      costUsd,
      isEstimated,
      campaignId: params.campaignId,
      purpose: params.purpose,
      success: params.success ?? true,
    };

    const records = this.getRecords();
    records.push(record);
    this.saveRecords(records);

    return {
      estimatedCostUsd: costUsd,
      provider: params.provider,
      model: params.model,
      resolution: '1024x1024',
      isEstimated,
      providerRequestId: params.providerRequestId,
      timestamp,
    };
  }

  /**
   * Gets spending summary metrics for today and current month.
   */
  public static getSpendingSummary(limits?: Partial<ImageSpendingLimits>): SpendingSummary {
    const records = this.getRecords();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7); // YYYY-MM

    let spentTodayUsd = 0;
    let spentThisMonthUsd = 0;

    for (const r of records) {
      if (r.success) {
        if (r.timestamp.startsWith(todayStr)) {
          spentTodayUsd += r.costUsd;
        }
        if (r.timestamp.startsWith(monthStr)) {
          spentThisMonthUsd += r.costUsd;
        }
      }
    }

    const dailyLimit = limits?.dailySpendingLimitUsd ?? 5.0;
    const monthlyLimit = limits?.monthlySpendingLimitUsd ?? 50.0;
    const isPaidEnabled = limits?.enablePaidGeneration ?? false;

    return {
      spentTodayUsd: Math.round(spentTodayUsd * 100) / 100,
      spentThisMonthUsd: Math.round(spentThisMonthUsd * 100) / 100,
      dailyLimitUsd: dailyLimit,
      monthlyLimitUsd: monthlyLimit,
      isDailyLimitReached: spentTodayUsd >= dailyLimit,
      isMonthlyLimitReached: spentThisMonthUsd >= monthlyLimit,
      isPaidGenerationEnabled: isPaidEnabled,
      recentRecords: records.slice(-20).reverse(),
    };
  }

  /**
   * Counts how many images were generated for a specific campaign.
   */
  public static getCampaignImageCount(campaignId: string): number {
    const records = this.getRecords();
    return records.filter((r) => r.campaignId === campaignId && r.success).length;
  }

  /**
   * Clears spending history (for testing or reset).
   */
  public static clearSpendingHistory(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SPENDING_STORAGE_KEY);
    }
    inMemorySpendingStorage = null;
  }
}
