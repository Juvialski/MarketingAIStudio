import { PresentationDeck } from '../../../types/presentation';
import { safeParsePresentationDeck } from '../schemas/presentationSchema';
import { Campaign } from '../../../types/campaign';
import { buildCampaignFactLedger } from '../../../services/financials/campaignFactLedger';

export interface DeckValidationIssue {
  severity: 'error' | 'warning' | 'suggestion';
  rule: string;
  message: string;
  slideId?: string;
  slideIndex?: number;
}

export interface DeckValidationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

export interface DeckValidationResult {
  valid: boolean;
  isValid: boolean;
  score: number; // 0 - 100
  errors: string[];
  warnings: string[];
  checks: DeckValidationCheck[];
  issues: DeckValidationIssue[];
}

export function validatePresentationDeck(
  deck: PresentationDeck,
  campaign?: Campaign
): DeckValidationResult {
  const issues: DeckValidationIssue[] = [];
  const checks: DeckValidationCheck[] = [];

  // 1. Zod Schema Check
  const schemaResult = safeParsePresentationDeck(deck);
  if (!schemaResult.success) {
    for (const err of schemaResult.error.errors) {
      issues.push({
        severity: 'error',
        rule: 'schema_conformance',
        message: `${err.path.join('.')}: ${err.message}`,
      });
    }
    checks.push({
      name: 'Schema Conformance',
      passed: false,
      message: 'Failed strict Zod schema validation.',
    });
  } else {
    checks.push({
      name: 'Schema Conformance',
      passed: true,
    });
  }

  // 2. Slide Count Checks
  if (deck.slides.length < 3) {
    issues.push({
      severity: 'error',
      rule: 'min_slide_count',
      message: 'Presentation must have at least 3 slides.',
    });
    checks.push({
      name: 'Slide Count',
      passed: false,
      message: 'Less than 3 slides.',
    });
  } else {
    checks.push({
      name: 'Slide Count',
      passed: true,
    });
    if (deck.slides.length > 25) {
      issues.push({
        severity: 'warning',
        rule: 'max_slide_count',
        message: `Presentation has ${deck.slides.length} slides. Real estate investment decks are most effective between 8-16 slides.`,
      });
    }
  }

  // 3. Unique Slide ID Check
  const seenIds = new Set<string>();
  let hasDuplicateIds = false;
  deck.slides.forEach((slide, idx) => {
    if (seenIds.has(slide.id)) {
      hasDuplicateIds = true;
      issues.push({
        severity: 'error',
        rule: 'unique_slide_id',
        message: `Duplicate slide ID "${slide.id}" at index ${idx}.`,
        slideId: slide.id,
        slideIndex: idx,
      });
    }
    seenIds.add(slide.id);
  });
  checks.push({
    name: 'Unique Slide IDs',
    passed: !hasDuplicateIds,
  });

  // 4. Slide Layout Variety & Structure Checks
  const slideTypeCounts: Record<string, number> = {};
  deck.slides.forEach((slide) => {
    slideTypeCounts[slide.type] = (slideTypeCounts[slide.type] || 0) + 1;
  });

  if (slideTypeCounts['cover'] && slideTypeCounts['cover'] > 1) {
    issues.push({
      severity: 'warning',
      rule: 'single_cover_slide',
      message: 'Deck contains multiple cover slides. Typically only the opening slide is a cover.',
    });
  }

  if (slideTypeCounts['big_number'] && slideTypeCounts['big_number'] > 2) {
    issues.push({
      severity: 'warning',
      rule: 'excessive_big_numbers',
      message: 'Multiple Big Number slides dilute impact. Limit to 1-2 major drama numbers.',
    });
  }

  // 5. Check for Required Legal / Disclaimer Slide
  const hasDisclaimer = deck.slides.some((s) => s.type === 'risk_disclaimer');
  checks.push({
    name: 'Underwriting Disclosures',
    passed: hasDisclaimer,
    message: hasDisclaimer ? undefined : 'No risk disclaimer slide found.',
  });
  if (!hasDisclaimer) {
    issues.push({
      severity: 'warning',
      rule: 'required_risk_disclaimer',
      message: 'No risk disclaimer slide found. Real estate investment presentations require underwriting disclaimers.',
    });
  }

  // 6. Fact Key, Media & Canonical Value Validation (if campaign context is provided)
  if (campaign) {
    const ledger = buildCampaignFactLedger(campaign);
    const validFactKeys = new Set(ledger.facts.map((f) => f.key));
    const validImageIds = new Set(campaign.sourceData.uploadedImages.map((img) => img.id));
    let hasUnverifiedFactKeys = false;
    let hasCanonicalMismatches = false;

    deck.slides.forEach((slide, idx) => {
      if (slide.type === 'financial_snapshot') {
        slide.metrics.forEach((m) => {
          if (m.factKey) {
            if (!validFactKeys.has(m.factKey)) {
              hasUnverifiedFactKeys = true;
              issues.push({
                severity: 'warning',
                rule: 'unverified_fact_key',
                message: `Slide "${slide.title}" references factKey "${m.factKey}" which is not in the canonical fact ledger.`,
                slideId: slide.id,
                slideIndex: idx,
              });
            }
          }
        });
      }

      if (slide.type === 'stat_grid') {
        slide.stats.forEach((s) => {
          if (s.factKey && !validFactKeys.has(s.factKey)) {
            hasUnverifiedFactKeys = true;
            issues.push({
              severity: 'warning',
              rule: 'unverified_fact_key',
              message: `Slide "${slide.title}" references unverified factKey "${s.factKey}".`,
              slideId: slide.id,
              slideIndex: idx,
            });
          }
        });
      }

      if (slide.type === 'cover' && slide.imageId && !validImageIds.has(slide.imageId)) {
        issues.push({
          severity: 'suggestion',
          rule: 'unrecognized_image_id',
          message: `Cover slide references imageId "${slide.imageId}" not found in campaign uploads.`,
          slideId: slide.id,
          slideIndex: idx,
        });
      }
      if (slide.type === 'property_overview' && slide.imageId && !validImageIds.has(slide.imageId)) {
        issues.push({
          severity: 'suggestion',
          rule: 'unrecognized_image_id',
          message: `Property overview references imageId "${slide.imageId}" not found in campaign uploads.`,
          slideId: slide.id,
          slideIndex: idx,
        });
      }
    });

    checks.push({
      name: 'Fact Ledger Alignment',
      passed: !hasUnverifiedFactKeys && !hasCanonicalMismatches,
      message: hasUnverifiedFactKeys ? 'Contains unverified factKey references.' : undefined,
    });

    // Check demo labeling
    const isCampaignDemo = ledger.isDemo;
    if (isCampaignDemo && !deck.isDemo) {
      issues.push({
        severity: 'warning',
        rule: 'demo_labeling',
        message: 'Campaign is a demo fixture but deck is not marked with isDemo: true.',
      });
    }
  }

  // 7. Calculate overall quality score
  const errorIssues = issues.filter((i) => i.severity === 'error');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
  const suggestionIssues = issues.filter((i) => i.severity === 'suggestion');

  let score = 100 - errorIssues.length * 25 - warningIssues.length * 8 - suggestionIssues.length * 2;
  score = Math.max(0, Math.min(100, score));

  const errors = errorIssues.map((i) => i.message);
  const warnings = warningIssues.map((i) => i.message);

  return {
    valid: errorIssues.length === 0,
    isValid: errorIssues.length === 0,
    score,
    errors,
    warnings,
    checks,
    issues,
  };
}
