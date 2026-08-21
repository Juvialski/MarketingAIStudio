export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Views: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          company_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          company_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          company_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Relationships: [];
      };
      brand_kits: {
        Row: {
          id: string;
          organization_id: string;
          is_default: boolean;
          company_name: string;
          tagline: string | null;
          logo_url: string | null;
          logo_dark_url: string | null;
          website: string | null;
          phone: string | null;
          email: string | null;
          license_number: string | null;
          colors: Json;
          typography: Json;
          tone_of_voice: string;
          target_audience_default: string;
          preferred_cta: string;
          required_disclaimer: string;
          forbidden_words: string[];
          image_style_preference: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          is_default?: boolean;
          company_name: string;
          tagline?: string | null;
          logo_url?: string | null;
          logo_dark_url?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          license_number?: string | null;
          colors?: Json;
          typography?: Json;
          tone_of_voice?: string;
          target_audience_default?: string;
          preferred_cta?: string;
          required_disclaimer?: string;
          forbidden_words?: string[];
          image_style_preference?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          is_default?: boolean;
          company_name?: string;
          tagline?: string | null;
          logo_url?: string | null;
          logo_dark_url?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          license_number?: string | null;
          colors?: Json;
          typography?: Json;
          tone_of_voice?: string;
          target_audience_default?: string;
          preferred_cta?: string;
          required_disclaimer?: string;
          forbidden_words?: string[];
          image_style_preference?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          brand_kit_id: string | null;
          name: string;
          campaign_type: string;
          target_market: string;
          status: 'draft' | 'strategy_ready' | 'copy_ready' | 'designs_ready' | 'completed';
          source_data: Json;
          strategy: Json | null;
          design_configs: Json;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          brand_kit_id?: string | null;
          name: string;
          campaign_type?: string;
          target_market?: string;
          status?: 'draft' | 'strategy_ready' | 'copy_ready' | 'designs_ready' | 'completed';
          source_data?: Json;
          strategy?: Json | null;
          design_configs?: Json;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string | null;
          brand_kit_id?: string | null;
          name?: string;
          campaign_type?: string;
          target_market?: string;
          status?: 'draft' | 'strategy_ready' | 'copy_ready' | 'designs_ready' | 'completed';
          source_data?: Json;
          strategy?: Json | null;
          design_configs?: Json;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_content: {
        Row: {
          id: string;
          campaign_id: string;
          organization_id: string;
          content_type: string;
          platform: string | null;
          content: Json;
          version: number;
          is_accepted: boolean;
          quality_report: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          organization_id: string;
          content_type: string;
          platform?: string | null;
          content?: Json;
          version?: number;
          is_accepted?: boolean;
          quality_report?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          organization_id?: string;
          content_type?: string;
          platform?: string | null;
          content?: Json;
          version?: number;
          is_accepted?: boolean;
          quality_report?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_assets: {
        Row: {
          id: string;
          campaign_id: string;
          organization_id: string;
          asset_type: 'hero_photo' | 'property_photo' | 'ai_concept' | 'rendered_graphic' | 'pdf_flyer';
          storage_bucket: string;
          storage_path: string;
          public_url: string | null;
          mime_type: string;
          width: number | null;
          height: number | null;
          aspect_ratio: string | null;
          source: 'upload' | 'gemini' | 'nvidia' | 'rendered_template' | 'sample';
          is_hero: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          organization_id: string;
          asset_type?: 'hero_photo' | 'property_photo' | 'ai_concept' | 'rendered_graphic' | 'pdf_flyer';
          storage_bucket?: string;
          storage_path: string;
          public_url?: string | null;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          aspect_ratio?: string | null;
          source?: 'upload' | 'gemini' | 'nvidia' | 'rendered_template' | 'sample';
          is_hero?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          organization_id?: string;
          asset_type?: 'hero_photo' | 'property_photo' | 'ai_concept' | 'rendered_graphic' | 'pdf_flyer';
          storage_bucket?: string;
          storage_path?: string;
          public_url?: string | null;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          aspect_ratio?: string | null;
          source?: 'upload' | 'gemini' | 'nvidia' | 'rendered_template' | 'sample';
          is_hero?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      design_exports: {
        Row: {
          id: string;
          campaign_id: string;
          organization_id: string;
          template_family: string;
          aspect_ratio: string;
          storage_bucket: string | null;
          storage_path: string | null;
          public_url: string | null;
          format: 'png' | 'jpeg' | 'pdf' | 'zip';
          file_size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          organization_id: string;
          template_family: string;
          aspect_ratio: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          public_url?: string | null;
          format: 'png' | 'jpeg' | 'pdf' | 'zip';
          file_size_bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          organization_id?: string;
          template_family?: string;
          aspect_ratio?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          public_url?: string | null;
          format?: 'png' | 'jpeg' | 'pdf' | 'zip';
          file_size_bytes?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_lists: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          name: string;
          metro_area: string;
          target_category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          name: string;
          metro_area: string;
          target_category: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string | null;
          name?: string;
          metro_area?: string;
          target_category?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          list_id: string | null;
          organization_id: string;
          company_name: string;
          category: string;
          website: string | null;
          metro_area: string;
          public_contact_email: string | null;
          public_phone: string | null;
          address_summary: string | null;
          estimated_portfolio_type: string | null;
          lead_score: number;
          relevance_reason: string;
          source_url: string | null;
          outreach_angle: Json;
          status: 'new' | 'reviewed' | 'saved' | 'contacted' | 'archived';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id?: string | null;
          organization_id: string;
          company_name: string;
          category: string;
          website?: string | null;
          metro_area: string;
          public_contact_email?: string | null;
          public_phone?: string | null;
          address_summary?: string | null;
          estimated_portfolio_type?: string | null;
          lead_score?: number;
          relevance_reason: string;
          source_url?: string | null;
          outreach_angle?: Json;
          status?: 'new' | 'reviewed' | 'saved' | 'contacted' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string | null;
          organization_id?: string;
          company_name?: string;
          category?: string;
          website?: string | null;
          metro_area?: string;
          public_contact_email?: string | null;
          public_phone?: string | null;
          address_summary?: string | null;
          estimated_portfolio_type?: string | null;
          lead_score?: number;
          relevance_reason?: string;
          source_url?: string | null;
          outreach_angle?: Json;
          status?: 'new' | 'reviewed' | 'saved' | 'contacted' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_generation_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          campaign_id: string | null;
          operation_type: string;
          provider: string;
          model: string;
          status: 'success' | 'failed';
          latency_ms: number | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          campaign_id?: string | null;
          operation_type: string;
          provider: string;
          model: string;
          status: 'success' | 'failed';
          latency_ms?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          campaign_id?: string | null;
          operation_type?: string;
          provider?: string;
          model?: string;
          status?: 'success' | 'failed';
          latency_ms?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      campaign_review_links: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          token_hash: string;
          is_active: boolean;
          expires_at: string | null;
          allow_comments: boolean;
          allow_selection: boolean;
          allow_approval: boolean;
          allow_downloads: boolean;
          passcode_hash: string | null;
          current_version_number: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          token_hash: string;
          is_active?: boolean;
          expires_at?: string | null;
          allow_comments?: boolean;
          allow_selection?: boolean;
          allow_approval?: boolean;
          allow_downloads?: boolean;
          passcode_hash?: string | null;
          current_version_number?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          campaign_id?: string;
          token_hash?: string;
          is_active?: boolean;
          expires_at?: string | null;
          allow_comments?: boolean;
          allow_selection?: boolean;
          allow_approval?: boolean;
          allow_downloads?: boolean;
          passcode_hash?: string | null;
          current_version_number?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_review_versions: {
        Row: {
          id: string;
          review_link_id: string;
          version_number: number;
          title: string;
          notes: string | null;
          published_snapshot: Json;
          published_at: string;
        };
        Insert: {
          id?: string;
          review_link_id: string;
          version_number: number;
          title?: string;
          notes?: string | null;
          published_snapshot: Json;
          published_at?: string;
        };
        Update: {
          id?: string;
          review_link_id?: string;
          version_number?: number;
          title?: string;
          notes?: string | null;
          published_snapshot?: Json;
          published_at?: string;
        };
        Relationships: [];
      };
      campaign_review_feedback: {
        Row: {
          id: string;
          review_link_id: string;
          review_version_id: string | null;
          material_key: string;
          variant_key: string | null;
          reviewer_name: string | null;
          status: 'not_reviewed' | 'preferred' | 'approved' | 'needs_changes';
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          review_link_id: string;
          review_version_id?: string | null;
          material_key: string;
          variant_key?: string | null;
          reviewer_name?: string | null;
          status?: 'not_reviewed' | 'preferred' | 'approved' | 'needs_changes';
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          review_link_id?: string;
          review_version_id?: string | null;
          material_key?: string;
          variant_key?: string | null;
          reviewer_name?: string | null;
          status?: 'not_reviewed' | 'preferred' | 'approved' | 'needs_changes';
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_org_member: {
        Args: {
          org_id: string;
          check_user_id?: string;
        };
        Returns: boolean;
      };
      get_user_organization_ids: {
        Args: {
          check_user_id?: string;
        };
        Returns: string[];
      };
      create_campaign_review_link_atomic: {
        Args: {
          p_organization_id: string;
          p_campaign_id: string;
          p_token_hash: string;
          p_snapshot: Json;
          p_permissions?: Json;
          p_expires_at?: string | null;
          p_user_id?: string | null;
        };
        Returns: Json;
      };
      publish_campaign_review_version_atomic: {
        Args: {
          p_organization_id: string;
          p_review_link_id: string;
          p_snapshot: Json;
          p_title?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      get_public_review_snapshot: {
        Args: {
          p_raw_token: string;
        };
        Returns: Json;
      };
      submit_public_review_feedback: {
        Args: {
          p_raw_token: string;
          p_material_key: string;
          p_variant_key?: string | null;
          p_status?: string;
          p_comment?: string | null;
          p_reviewer_name?: string | null;
        };
        Returns: Json;
      };
      submit_public_campaign_approval: {
        Args: {
          p_raw_token: string;
          p_status?: string;
          p_notes?: string | null;
          p_reviewer_name?: string | null;
        };
        Returns: Json;
      };
    };
  };
}
