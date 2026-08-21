/**
 * Creative Brief Composer
 * Formulates structured, brand-aware visual creative briefs from real estate source data.
 */

import { CampaignSourceData, CampaignStrategy } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { 
  ImageCreativeBrief, 
  ImagePurpose, 
  ImageStyle, 
  ImageQualityTier 
} from '../../types/providers';

export class CreativeBriefComposer {
  /**
   * Compiles a structured ImageCreativeBrief from property data and brand context.
   */
  public static composeBrief(params: {
    sourceData: CampaignSourceData;
    brandKit: BrandKit;
    strategy?: CampaignStrategy;
    purpose?: ImagePurpose;
    style?: ImageStyle;
    aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16';
    qualityTier?: ImageQualityTier;
    isConceptual?: boolean;
    referenceImageUrls?: string[];
  }): ImageCreativeBrief {
    const prop = params.sourceData.property;
    const purpose = params.purpose || 'hero';
    const style = params.style || 'architectural_photography';
    const aspectRatio = params.aspectRatio || '1:1';

    let subject = '';
    let composition = '';
    let constraints = 'No fake text, no logos embedded inside image, no distorted architectural perspective.';

    const locationStr = prop?.neighborhood ? `${prop.neighborhood}, ${prop.city || 'Phoenix'}` : (prop?.city || params.sourceData.targetMarket);

    switch (purpose) {
      case 'hero':
        subject = `Exterior architectural elevation of a ${prop?.propertyType?.replace('_', ' ') || 'residential'} property in ${locationStr}. Modernized finishes, clean landscaping, crisp curb appeal.`;
        composition = 'Eye-level frontal or three-quarter architectural perspective, symmetrical framing, golden-hour natural daylight.';
        break;
      case 'supporting':
        subject = `Interior open-concept living and gourmet kitchen space with quartz countertops, modern cabinetry, and recessed lighting in ${locationStr}.`;
        composition = 'Wide-angle interior architectural perspective, balanced vertical lines, bright ambient interior daylight.';
        break;
      case 'renovation_concept':
        subject = `Conceptual before-and-after architectural visualization of a renovated value-add property in ${locationStr}. Modernized exterior, fresh paint, updated architectural fixtures.`;
        composition = 'Side-by-side or split architectural view, precise alignment, illustrative staging markers.';
        constraints += ' Must be clearly labeled as conceptual renovation rendering.';
        break;
      case 'neighborhood_lifestyle':
        subject = `Vibrant high-end neighborhood streetscape, tree-lined avenue, and upscale amenities in ${locationStr}.`;
        composition = 'Elevated street-level view, soft bokeh, warm afternoon sun, authentic urban/suburban texture.';
        break;
      case 'background':
        subject = `Subtle abstract architectural geometry, travertine stone texture, or minimalist modern concrete facade.`;
        composition = 'Minimalist close-up, high negative space, muted contrast suitable for text overlay in design templates.';
        break;
      case 'editorial':
      default:
        subject = `Editorial architectural photograph highlighting premium craftsmanship and modern design in ${locationStr}.`;
        composition = 'Clean editorial framing, rich shadows, balanced depth of field.';
        break;
    }

    const brandColors = [
      params.brandKit.colors.primary,
      params.brandKit.colors.secondary,
      params.brandKit.colors.accent,
    ].filter(Boolean);

    return {
      purpose,
      subject,
      composition,
      style,
      aspectRatio,
      brandColors,
      references: params.referenceImageUrls || (params.sourceData.uploadedImages?.map((img) => img.url).slice(0, 3) || []),
      constraints,
      qualityTier: params.qualityTier || 'auto',
      isConceptual: params.isConceptual ?? true,
    };
  }

  /**
   * Translates an ImageCreativeBrief into a provider-specific text prompt with brand color guidance.
   */
  public static briefToPrompt(brief: ImageCreativeBrief): string {
    const styleDescriptions: Record<ImageStyle, string> = {
      editorial_clean: 'High-end architectural magazine editorial style, soft natural shadows, rich dynamic range, neutral color grading, 35mm lens clarity.',
      architectural_photography: 'Crisp commercial architectural photography, straight vertical lines, high-resolution tilt-shift lens perspective, pristine exterior.',
      warm_natural_light: 'Warm late-afternoon sunlight, golden hour glow, authentic residential warmth, welcoming ambient lighting.',
      dusk_luxury: 'Twilight architectural lighting, illuminated interior lights, dramatic deep blue sky, luxury evening ambiance.',
      aerial_submarket: 'Elevated drone aerial perspective, crisp submarket geometry, panoramic neighborhood context, clear daylight.',
      minimalist_luxury: 'Minimalist luxury aesthetic, uncluttered surfaces, natural materials, travertine and oak textures, understated elegance.',
    };

    const styleDesc = brief.style ? styleDescriptions[brief.style] : styleDescriptions.architectural_photography;

    let prompt = `${brief.subject} ${brief.composition || ''} Visual Style: ${styleDesc}`;

    if (brief.brandColors && brief.brandColors.length > 0) {
      prompt += ` Accent color harmony subtle undertones: ${brief.brandColors.join(', ')}.`;
    }

    if (brief.constraints) {
      prompt += ` Constraints: ${brief.constraints}`;
    }

    prompt += ' Photorealistic 8k commercial real estate imagery, authentic physical materials, no watermarks, no distorted geometry.';

    return prompt;
  }
}
