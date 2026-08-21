// Authenticated deterministic copy critique. No provider call is made here.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AppError } from '../_shared/errors.ts';
import { assertOrganizationAccess, authenticate } from '../_shared/auth.ts';
import { handleOptions, ensurePost, errorResponse, jsonResponse } from '../_shared/http.ts';
import { critiqueRequestSchema, parseBody } from '../_shared/validation.ts';

const cliches = [
  { pattern: /unlock (the )?potential/i, explanation: 'Overused generic AI phrase' },
  { pattern: /game-?chang(er|ing)/i, explanation: 'Hyperbolic cliché' },
  { pattern: /nestled in the heart of/i, explanation: 'Real-estate listing cliché' },
  { pattern: /whether you'?re an? (investor|buyer)/i, explanation: 'Hedging audience cliché' },
  { pattern: /guaranteed returns?/i, explanation: 'Regulatory compliance risk' },
  { pattern: /can'?t lose/i, explanation: 'Unsubstantiated risk claim' },
  { pattern: /hurry before it'?s gone/i, explanation: 'Low-quality fake urgency' },
];

function checkText(text: string, platform: string, issues: Array<Record<string, unknown>>): void {
  cliches.forEach((cliche, index) => {
    const match = text.match(cliche.pattern);
    if (!match) return;
    issues.push({
      id: `issue-${platform.toLowerCase()}-${index}`,
      matchedText: match[0],
      platform,
      rule: 'anti-slop',
      explanation: cliche.explanation,
      suggestedReplacement: 'Rewrite this claim with specific, verifiable language.',
      severity: match[0].toLowerCase().includes('guarantee') ? 'error' : 'warning',
    });
  });
}

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    ensurePost(req);
    const ctx = await authenticate(req);
    const body = await parseBody(req, critiqueRequestSchema);
    await assertOrganizationAccess(ctx, body.organizationId, body.campaignId);

    const copy = body.copy as Record<string, any>;
    const issues: Array<Record<string, unknown>> = [];
    const platforms: Array<[string, string, string]> = [
      ['facebook', 'body', 'Facebook'],
      ['instagram', 'body', 'Instagram'],
      ['linkedin', 'body', 'LinkedIn'],
      ['emailNewsletter', 'bodyMarkdown', 'Email'],
    ];
    for (const [section, field, label] of platforms) {
      const value = copy[section]?.[field];
      if (typeof value === 'string') checkText(value, label, issues);
    }
    const score = Math.max(0, 100 - issues.length * 10);
    const slopIndex = score >= 90 ? 'clean' : score >= 75 ? 'mild_cliches' : 'heavy_slop';
    return jsonResponse(req, {
      qualityReport: {
        overallScore: score,
        slopIndex,
        issues,
        // A lexical review cannot establish factual accuracy.
        factualIntegrityVerified: false,
        unsupportedClaimsDetected: [],
      },
      provenance: 'generated',
    });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(req, error);
    return errorResponse(req, new AppError('internal_error', 500, 'The request could not be completed.'));
  }
});
