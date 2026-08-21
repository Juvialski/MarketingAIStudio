import { AIUsageRecord, AIErrorCode, AIOperationType } from '../../types/providers';
import { ModelRegistry, GEMINI_TEXT_MODELS } from './modelRegistry';
import { AILogService } from '../supabase/aiLogService';

const USAGE_STORAGE_KEY = 'zaw_ai_usage_history_v1';
const MAX_STORED_RECORDS = 500;

// In-memory fallback for Node.js / testing / SSR environments
let inMemoryStorage: string | null = null;

export interface ModelQuotaSummary {
  modelId: string;
  displayName: string;
  usedToday: number;
  rpdLimit: number;
  remainingToday: number;
  percentageUsed: number;
  isEstimate: true;
  label: string;
}

export class UsageTracker {
  private static getStorageItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {
      // Ignore security/access errors in restricted frames
    }
    return inMemoryStorage;
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
      // Fallback
    }
    inMemoryStorage = value;
  }

  private static removeStorageItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Fallback
    }
    inMemoryStorage = null;
  }

  private static getRecords(): AIUsageRecord[] {
    try {
      const raw = this.getStorageItem(USAGE_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse AI usage records', e);
    }
    return [];
  }

  private static saveRecords(records: AIUsageRecord[]): void {
    try {
      const trimmed = records.slice(-MAX_STORED_RECORDS);
      this.setStorageItem(USAGE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save AI usage records', e);
    }
  }

  /**
   * Records an AI operation execution.
   */
  public static recordUsage(data: {
    provider: string;
    model: string;
    operation: AIOperationType;
    success: boolean;
    latencyMs: number;
    approxTokens?: number;
    errorCode?: AIErrorCode;
    requestedModel?: string;
    fallbackOccurred?: boolean;
    fallbackReason?: string;
    campaignId?: string;
    organizationId?: string;
    userId?: string;
  }): AIUsageRecord {
    const record: AIUsageRecord = {
      id: `ai-use-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      provider: data.provider,
      model: data.model,
      operation: data.operation,
      success: data.success,
      latencyMs: data.latencyMs,
      approxTokens: data.approxTokens,
      errorCode: data.errorCode,
      requestedModel: data.requestedModel,
      fallbackOccurred: data.fallbackOccurred,
      fallbackReason: data.fallbackReason,
    };

    const existing = this.getRecords();
    existing.push(record);
    this.saveRecords(existing);

    // Also forward to Supabase if connected
    AILogService.log({
      organizationId: data.organizationId,
      userId: data.userId,
      campaignId: data.campaignId,
      operationType: data.operation,
      provider: data.provider,
      model: data.model,
      status: data.success ? 'success' : 'failed',
      latencyMs: data.latencyMs,
      errorMessage: data.errorCode ? `Error: ${data.errorCode}${data.fallbackReason ? ` - ${data.fallbackReason}` : ''}` : undefined,
    }).catch((err) => console.warn('Supabase AI log forward failed', err));

    return record;
  }

  /**
   * Retrieves all usage records for today (local calendar day).
   */
  public static getTodayRecords(modelId?: string): AIUsageRecord[] {
    const records = this.getRecords();
    const today = new Date().toISOString().split('T')[0];

    return records.filter((r) => {
      const isToday = r.timestamp.startsWith(today);
      if (!isToday) return false;
      if (modelId) return r.model === modelId || r.requestedModel === modelId;
      return true;
    });
  }

  /**
   * Calculates quota metrics for a specific model for today.
   */
  public static getModelQuotaStatus(
    modelId: string,
    customQuotas?: Record<string, { rpm: number; tpm: number; rpd: number }>
  ): ModelQuotaSummary {
    const modelDef = ModelRegistry.getTextModel(modelId);
    const todayRecords = this.getTodayRecords(modelId);
    
    // Count successful requests + attempts that consumed quota
    const usedToday = todayRecords.filter((r) => r.model === modelId && (r.success || r.errorCode === 'rate_limit_rpm' || r.errorCode === 'rate_limit_tpm')).length;
    
    const rpdLimit = customQuotas?.[modelId]?.rpd ?? modelDef.observedRPD;
    const remainingToday = Math.max(0, rpdLimit - usedToday);
    const percentageUsed = rpdLimit > 0 ? Math.min(100, Math.round((usedToday / rpdLimit) * 100)) : 0;

    return {
      modelId,
      displayName: modelDef.displayName,
      usedToday,
      rpdLimit,
      remainingToday,
      percentageUsed,
      isEstimate: true,
      label: `${usedToday} / ${rpdLimit} estimated calls used today`,
    };
  }

  /**
   * Retrieves quota status for all known Gemini text models.
   */
  public static getAllModelQuotaStatuses(
    customQuotas?: Record<string, { rpm: number; tpm: number; rpd: number }>
  ): Record<string, ModelQuotaSummary> {
    const result: Record<string, ModelQuotaSummary> = {};
    for (const id of Object.keys(GEMINI_TEXT_MODELS)) {
      result[id] = this.getModelQuotaStatus(id, customQuotas);
    }
    return result;
  }

  /**
   * Checks if a model has reached or exceeded its daily estimated quota.
   */
  public static isDailyQuotaExhausted(
    modelId: string,
    customQuotas?: Record<string, { rpm: number; tpm: number; rpd: number }>
  ): boolean {
    const status = this.getModelQuotaStatus(modelId, customQuotas);
    return status.rpdLimit > 0 && status.usedToday >= status.rpdLimit;
  }

  /**
   * Returns recent usage logs for UI display.
   */
  public static getRecentRecords(limit = 20): AIUsageRecord[] {
    const records = this.getRecords();
    return records.slice(-limit).reverse();
  }

  /**
   * Clears usage history.
   */
  public static clearUsageHistory(): void {
    this.removeStorageItem(USAGE_STORAGE_KEY);
  }
}
