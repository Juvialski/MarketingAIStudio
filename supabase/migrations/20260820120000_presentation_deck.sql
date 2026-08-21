-- ------------------------------------------------------------------------------
-- MIGRATION: 20260820120000_presentation_deck.sql
-- DESCRIPTION: Forward migration to support Presentation Decks in campaign_content
-- ------------------------------------------------------------------------------

-- Update content_type check constraint on public.campaign_content
ALTER TABLE public.campaign_content
  DROP CONSTRAINT IF EXISTS campaign_content_content_type_check;

ALTER TABLE public.campaign_content
  ADD CONSTRAINT campaign_content_content_type_check
  CHECK (content_type IN (
    'all_package',
    'headline',
    'cta',
    'facebook',
    'instagram',
    'linkedin',
    'email',
    'video_script',
    'strategy',
    'presentation_deck'
  ));
