import { CopyQualityReport, CopyQualityIssue, CampaignCopy, CampaignSourceData } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';

interface SlopPattern {
  id: string;
  regex: RegExp;
  severity: 'warning' | 'error' | 'suggestion';
  rule: string;
  explanation: string;
  replacement?: string;
}

const SLOP_PATTERNS: SlopPattern[] = [
  {
    id: 'cliche-unlock',
    regex: /\b(unlock\s+(the\s+)?(full\s+)?potential|unlock\s+the\s+secrets?|unlocking\s+value)\b/gi,
    severity: 'error',
    rule: 'Avoid Generic AI Metaphor ("Unlock the potential")',
    explanation: 'Overused AI cliché. State the specific dollar spread, cap rate, or physical renovation upside instead.',
    replacement: 'capture value-add upside',
  },
  {
    id: 'cliche-game-changing',
    regex: /\b(game-?changing|ground-?breaking|revolutionary|paradigm\s+shift)\b/gi,
    severity: 'error',
    rule: 'Avoid Sensationalized Hyperbole',
    explanation: 'Institutional real estate investors respond to underwriting numbers, not sensational claims.',
    replacement: 'high-margin',
  },
  {
    id: 'cliche-nestled',
    regex: /\b(nestled\s+(in|within|at)\s+(the\s+)?heart\s+of|tucked\s+away\s+in)\b/gi,
    severity: 'warning',
    rule: 'Avoid Realtor Cliché ("Nestled in the heart of")',
    explanation: 'Trite descriptive phrase. Name the specific submarket, corridor, or cross streets directly.',
    replacement: 'located in the',
  },
  {
    id: 'cliche-whether-you',
    regex: /\bwhether\s+you('re|\s+are)\s+(a\s+seasoned\s+investor|an\s+investor|looking\s+to)\b/gi,
    severity: 'warning',
    rule: 'Avoid Generic Audience Hedge ("Whether you\'re an investor...")',
    explanation: 'Weak opening. Address the specific target buyer directly with economics or transaction type.',
    replacement: 'For active operators seeking',
  },
  {
    id: 'cliche-boasts',
    regex: /\b(boasts|boasting|features\s+a\s+plethora\s+of|a\s+testament\s+to)\b/gi,
    severity: 'suggestion',
    rule: 'Avoid Decorative Passive Verbs ("Boasts")',
    explanation: 'Use active, concise language (e.g. "includes", "offers", or simply list the specification).',
    replacement: 'includes',
  },
  {
    id: 'fake-urgency',
    regex: /\b(act\s+fast\s+before\s+it('s|\s+is)\s+gone|won('t|\s+not)\s+last\s+long|rare\s+once-in-a-lifetime\s+opportunity|hurry\s+now)\b/gi,
    severity: 'error',
    rule: 'Avoid Artificial Urgency',
    explanation: 'Replace manufactured FOMO with verified market context (e.g. submarket days-on-market metric or inspection deadline).',
    replacement: 'available for standard inspection period',
  },
  {
    id: 'unsupported-roi',
    regex: /\b(guaranteed\s+(returns?|roi|profits?)|risk-?free\s+investment|can('t|\s+not)\s+lose)\b/gi,
    severity: 'error',
    rule: 'Prohibit Unsubstantiated or Guaranteed Return Claims',
    explanation: 'Severe regulatory and compliance risk. Real estate investments must carry risk disclaimers and pro forma labeling.',
    replacement: 'projected pro forma return',
  },
  {
    id: 'emoji-spam',
    regex: /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|[\u2194-\u21aa\u2b05-\u2b07\u2934\u2935\u3297\u3299\u303d\u3030\u24c2]|[\u25b6\u25c0]|[\u2600-\u26ff]){4,}/g,
    severity: 'warning',
    rule: 'Excessive Emoji Stacking',
    explanation: 'More than 3 consecutive emojis degrades professional authority and triggers spam filters.',
    replacement: '',
  },
];

export class AntiSlopCritic {
  public static reviewText(text: string, platform?: string, forbiddenWords: string[] = []): CopyQualityIssue[] {
    const issues: CopyQualityIssue[] = [];

    // Check standard slop patterns
    for (const pattern of SLOP_PATTERNS) {
      const matches = text.match(pattern.regex);
      if (matches) {
        matches.forEach((matchedStr) => {
          issues.push({
            id: `${pattern.id}-${Math.random().toString(36).substr(2, 6)}`,
            severity: pattern.severity,
            rule: pattern.rule,
            matchedText: matchedStr,
            explanation: pattern.explanation,
            suggestedReplacement: pattern.replacement,
            platform,
          });
        });
      }
    }

    // Check custom forbidden brand words
    for (const forbidden of forbiddenWords) {
      if (!forbidden.trim()) continue;
      const regex = new RegExp(`\\b${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach((matchedStr) => {
          issues.push({
            id: `brand-forbidden-${Math.random().toString(36).substr(2, 6)}`,
            severity: 'error',
            rule: `Forbidden Brand Phrase: "${forbidden}"`,
            matchedText: matchedStr,
            explanation: 'This phrase is explicitly flagged as prohibited by your active Brand Kit.',
            platform,
          });
        });
      }
    }

    return issues;
  }

  public static reviewCampaignCopy(
    copy: CampaignCopy,
    sourceData: CampaignSourceData,
    brandKit: BrandKit
  ): CopyQualityReport {
    const allIssues: CopyQualityIssue[] = [];
    const forbidden = brandKit.forbiddenWords || [];

    // Review headlines
    copy.headlines.forEach((h, idx) => {
      allIssues.push(...this.reviewText(h, `Headline #${idx + 1}`, forbidden));
    });

    // Review CTAs
    copy.ctas.forEach((cta, idx) => {
      allIssues.push(...this.reviewText(cta, `CTA #${idx + 1}`, forbidden));
    });

    // Review platforms
    if (copy.facebook) {
      allIssues.push(...this.reviewText(copy.facebook.headline, 'Facebook Headline', forbidden));
      allIssues.push(...this.reviewText(copy.facebook.body, 'Facebook Body', forbidden));
    }
    if (copy.instagram) {
      allIssues.push(...this.reviewText(copy.instagram.headline, 'Instagram Headline', forbidden));
      allIssues.push(...this.reviewText(copy.instagram.body, 'Instagram Body', forbidden));
    }
    if (copy.linkedin) {
      allIssues.push(...this.reviewText(copy.linkedin.headline, 'LinkedIn Headline', forbidden));
      allIssues.push(...this.reviewText(copy.linkedin.body, 'LinkedIn Body', forbidden));
    }
    if (copy.emailNewsletter) {
      copy.emailNewsletter.subjectLines.forEach((subj, idx) => {
        allIssues.push(...this.reviewText(subj, `Email Subject #${idx + 1}`, forbidden));
      });
      allIssues.push(...this.reviewText(copy.emailNewsletter.bodyMarkdown, 'Email Newsletter Body', forbidden));
    }
    if (copy.videoScript) {
      allIssues.push(...this.reviewText(copy.videoScript.hook, 'Video Hook', forbidden));
      copy.videoScript.scenes.forEach((s, idx) => {
        allIssues.push(...this.reviewText(s.spokenAudio, `Video Scene #${idx + 1}`, forbidden));
      });
    }

    // Verify financial integrity
    const unsupportedClaims: string[] = [];
    const fullText = JSON.stringify(copy);

    // Check if copy mentions numbers that contradict or are absent from source data
    if (!sourceData.property?.financials.purchasePrice && fullText.includes('purchase price of $')) {
      unsupportedClaims.push('Specific purchase price mentioned but missing in source data.');
    }
    if (!sourceData.property?.financials.arv && fullText.includes('ARV of $')) {
      unsupportedClaims.push('Specific ARV claim mentioned without source verification.');
    }

    // Calculate score
    const errorCount = allIssues.filter((i) => i.severity === 'error').length;
    const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
    const suggestionCount = allIssues.filter((i) => i.severity === 'suggestion').length;

    let score = 100 - errorCount * 15 - warningCount * 6 - suggestionCount * 2;
    if (unsupportedClaims.length > 0) score -= 20;
    score = Math.max(10, Math.min(100, score));

    let slopIndex: 'clean' | 'mild_cliches' | 'heavy_slop' = 'clean';
    if (score < 70) slopIndex = 'heavy_slop';
    else if (score < 90) slopIndex = 'mild_cliches';

    return {
      overallScore: score,
      slopIndex,
      issues: allIssues,
      factualIntegrityVerified: unsupportedClaims.length === 0,
      unsupportedClaimsDetected: unsupportedClaims,
    };
  }

  public static autoCleanText(text: string, forbiddenWords: string[] = []): string {
    let cleaned = text;

    for (const pattern of SLOP_PATTERNS) {
      if (pattern.replacement !== undefined) {
        cleaned = cleaned.replace(pattern.regex, pattern.replacement);
      }
    }

    for (const forbidden of forbiddenWords) {
      if (!forbidden.trim()) continue;
      const regex = new RegExp(`\\b${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '[verified term]');
    }

    return cleaned;
  }
}
