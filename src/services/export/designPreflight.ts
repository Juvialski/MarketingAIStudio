import { OutputAspectRatio } from '../../types/campaign';
import { FORMAT_DIMENSIONS } from '../../types/designs';

export interface SafeZoneConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const FORMAT_SAFE_ZONES: Record<OutputAspectRatio, SafeZoneConfig> = {
  square: { top: 40, bottom: 40, left: 40, right: 40 },
  portrait: { top: 40, bottom: 40, left: 40, right: 40 },
  story: { top: 160, bottom: 250, left: 50, right: 50 }, // Protected for Instagram/TikTok UI overlay
  landscape: { top: 30, bottom: 30, left: 40, right: 40 },
  flyer_letter: { top: 40, bottom: 40, left: 40, right: 40 },
  flyer_a4: { top: 40, bottom: 40, left: 40, right: 40 },
};

export interface PreflightValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dimensions: { width: number; height: number };
  safeZone: SafeZoneConfig;
}

export function validateDesignLayout(
  container: HTMLElement,
  aspectRatio: OutputAspectRatio
): PreflightValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const expectedDimensions = FORMAT_DIMENSIONS[aspectRatio];
  const safeZone = FORMAT_SAFE_ZONES[aspectRatio];

  const rect = container.getBoundingClientRect();
  const width =
    container.offsetWidth ||
    rect.width ||
    parseInt(container.style.width, 10) ||
    Number(container.dataset.targetWidth) ||
    expectedDimensions.width;

  const height =
    container.offsetHeight ||
    rect.height ||
    parseInt(container.style.height, 10) ||
    Number(container.dataset.targetHeight) ||
    expectedDimensions.height;

  // 1. Validate Canvas Dimensions
  if (width <= 0 || height <= 0) {
    errors.push(`Invalid canvas dimensions: ${width}x${height}`);
    return { valid: false, errors, warnings, dimensions: { width, height }, safeZone };
  }

  // 2. Scan critical child elements for overflow, clipping, and stray characters
  const criticalElements = container.querySelectorAll<HTMLElement>(
    'h1, h2, h3, p, span, div[data-metric-card], div[data-badge], div[data-cta], div[data-contact]'
  );

  const hasRealLayout = rect.width > 0 && rect.height > 0;
  const scaleX = hasRealLayout && width > 0 ? expectedDimensions.width / rect.width : 1;
  const scaleY = hasRealLayout && height > 0 ? expectedDimensions.height / rect.height : 1;

  criticalElements.forEach((el) => {
    // Skip if explicitly hidden
    if (el.style.display === 'none' || el.hidden) return;

    // Check for stray vertical separator at end of text
    const text = el.textContent?.trim() || '';
    if (text.endsWith('|') || text.endsWith('•') || text.endsWith('·')) {
      errors.push(`Element "${text.slice(0, 25)}" terminates with a stray separator.`);
    }

    // If real browser layout is present, check bounding boxes and safe zones
    if (hasRealLayout) {
      const elRect = el.getBoundingClientRect();
      if (elRect.width > 0 && elRect.height > 0) {
        const relLeft = (elRect.left - rect.left) * scaleX;
        const relTop = (elRect.top - rect.top) * scaleY;
        const relRight = (elRect.right - rect.left) * scaleX;
        const relBottom = (elRect.bottom - rect.top) * scaleY;

        // Check outside canvas bounds
        if (relLeft < -5) {
          errors.push(`Element "${text.slice(0, 20)}" extends ${Math.abs(relLeft).toFixed(0)}px beyond left canvas boundary.`);
        }
        if (relRight > expectedDimensions.width + 5) {
          errors.push(`Element "${text.slice(0, 20)}" extends ${(relRight - expectedDimensions.width).toFixed(0)}px beyond right canvas boundary.`);
        }
        if (relTop < -5) {
          errors.push(`Element "${text.slice(0, 20)}" extends ${Math.abs(relTop).toFixed(0)}px beyond top canvas boundary.`);
        }
        if (relBottom > expectedDimensions.height + 5) {
          errors.push(`Element "${text.slice(0, 20)}" extends ${(relBottom - expectedDimensions.height).toFixed(0)}px beyond bottom canvas boundary.`);
        }

        // Story-specific safe zone checks for critical text/interactive elements
        if (aspectRatio === 'story') {
          const isCriticalContent = el.tagName === 'H1' || el.hasAttribute('data-cta') || el.hasAttribute('data-contact');
          if (isCriticalContent) {
            if (relTop < safeZone.top - 10) {
              errors.push(`Critical text "${text.slice(0, 25)}" violates top safe zone (${relTop.toFixed(0)}px < ${safeZone.top}px).`);
            }
            if (relBottom > expectedDimensions.height - safeZone.bottom + 10) {
              errors.push(`Critical text "${text.slice(0, 25)}" violates bottom safe zone (${relBottom.toFixed(0)}px > ${expectedDimensions.height - safeZone.bottom}px).`);
            }
          }
        }

        // Check for clipped text via scrollWidth / clientWidth on text nodes
        if (
          el.tagName === 'H1' ||
          el.tagName === 'H2' ||
          el.hasAttribute('data-badge') ||
          el.hasAttribute('data-metric-value')
        ) {
          if (el.scrollWidth > el.clientWidth + 3 && !el.classList.contains('truncate')) {
            warnings.push(`Text content in ${el.tagName.toLowerCase()} may be clipped: "${text.slice(0, 30)}"`);
          }
        }
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dimensions: { width: expectedDimensions.width, height: expectedDimensions.height },
    safeZone,
  };
}
