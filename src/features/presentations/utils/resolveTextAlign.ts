import React from 'react';
import { SlideTitleAlign, SlideBodyAlign, SlideTextStyle } from '../../../types/presentation';

/**
 * Resolves title/heading text alignment override with backward-compatible template default.
 */
export function resolveTitleAlign(
  textStyle?: SlideTextStyle,
  fallback: SlideTitleAlign = 'center'
): SlideTitleAlign {
  return textStyle?.titleAlign || fallback;
}

/**
 * Resolves body/narrative text alignment override with backward-compatible template default.
 */
export function resolveBodyAlign(
  textStyle?: SlideTextStyle,
  fallback: SlideBodyAlign = 'center'
): SlideBodyAlign {
  return textStyle?.bodyAlign || fallback;
}

/**
 * Generates CSS properties for title/heading alignment, including marginInline handling for display/headline.
 */
export function getTitleAlignStyle(align: SlideTitleAlign): React.CSSProperties {
  return {
    textAlign: align,
    marginInline: align === 'left' ? '0 auto 0 0' : align === 'right' ? '0 0 0 auto' : 'auto',
  };
}

/**
 * Generates CSS properties for body/paragraph alignment, including marginInline handling for lead/subhead.
 */
export function getBodyAlignStyle(align: SlideBodyAlign): React.CSSProperties {
  return {
    textAlign: align,
    marginInline: align === 'left' ? '0 auto 0 0' : align === 'right' ? '0 0 0 auto' : 'auto',
  };
}
