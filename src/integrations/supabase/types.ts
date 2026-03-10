export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_health_reports: {
        Row: {
          critical_items: Json | null
          generated_at: string
          good_items: Json | null
          health_score: number | null
          id: string
          warning_items: Json | null
          workspace_id: string
        }
        Insert: {
          critical_items?: Json | null
          generated_at?: string
          good_items?: Json | null
          health_score?: number | null
          id?: string
          warning_items?: Json | null
          workspace_id: string
        }
        Update: {
          critical_items?: Json | null
          generated_at?: string
          good_items?: Json | null
          health_score?: number | null
          id?: string
          warning_items?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_health_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          ai_generated: boolean
          body: string | null
          copy_score: number | null
          created_at: string
          cta: string | null
          dhoom_score: number | null
          framework: string | null
          headline: string | null
          id: string
          improvement_note: string | null
          is_winner: boolean
          language: string | null
          occasion: string | null
          performance_rating: string | null
          platform: string | null
          product_name: string | null
          project_id: string | null
          rated_at: string | null
          remixed_from_id: string | null
          score_reason: string | null
          source_url: string | null
          tone: string | null
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean
          body?: string | null
          copy_score?: number | null
          created_at?: string
          cta?: string | null
          dhoom_score?: number | null
          framework?: string | null
          headline?: string | null
          id?: string
          improvement_note?: string | null
          is_winner?: boolean
          language?: string | null
          occasion?: string | null
          performance_rating?: string | null
          platform?: string | null
          product_name?: string | null
          project_id?: string | null
          rated_at?: string | null
          remixed_from_id?: string | null
          score_reason?: string | null
          source_url?: string | null
          tone?: string | null
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean
          body?: string | null
          copy_score?: number | null
          created_at?: string
          cta?: string | null
          dhoom_score?: number | null
          framework?: string | null
          headline?: string | null
          id?: string
          improvement_note?: string | null
          is_winner?: boolean
          language?: string | null
          occasion?: string | null
          performance_rating?: string | null
          platform?: string | null
          product_name?: string | null
          project_id?: string | null
          rated_at?: string | null
          remixed_from_id?: string | null
          score_reason?: string | null
          source_url?: string | null
          tone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_remixed_from_id_fkey"
            columns: ["remixed_from_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_images: {
        Row: {
          created_at: string
          creative_id: string | null
          cutout_url: string | null
          dhoom_score: number | null
          format: string
          gemini_prompt: string | null
          generation_prompt: string | null
          id: string
          image_url: string | null
          is_winner: boolean | null
          product_name: string | null
          prompt_was_enhanced: boolean | null
          remix_config: Json | null
          remix_type: string | null
          remixed_from_id: string | null
          sd_prompt: string | null
          studio_config: Json | null
          studio_source: string | null
          style: string
          text_config: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          creative_id?: string | null
          cutout_url?: string | null
          dhoom_score?: number | null
          format?: string
          gemini_prompt?: string | null
          generation_prompt?: string | null
          id?: string
          image_url?: string | null
          is_winner?: boolean | null
          product_name?: string | null
          prompt_was_enhanced?: boolean | null
          remix_config?: Json | null
          remix_type?: string | null
          remixed_from_id?: string | null
          sd_prompt?: string | null
          studio_config?: Json | null
          studio_source?: string | null
          style?: string
          text_config?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          creative_id?: string | null
          cutout_url?: string | null
          dhoom_score?: number | null
          format?: string
          gemini_prompt?: string | null
          generation_prompt?: string | null
          id?: string
          image_url?: string | null
          is_winner?: boolean | null
          product_name?: string | null
          prompt_was_enhanced?: boolean | null
          remix_config?: Json | null
          remix_type?: string | null
          remixed_from_id?: string | null
          sd_prompt?: string | null
          studio_config?: Json | null
          studio_source?: string | null
          style?: string
          text_config?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_images_remixed_from_id_fkey"
            columns: ["remixed_from_id"]
            isOneToOne: false
            referencedRelation: "ad_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      admin_verification_codes: {
        Row: {
          action_payload: Json | null
          action_type: string
          admin_id: string
          code: string
          created_at: string | null
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          admin_id: string
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          admin_id?: string
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_verification_codes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          language: string
          messages: Json
          summary: string | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          messages?: Json
          summary?: string | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          messages?: Json
          summary?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          click_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dismiss_count: number | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          is_dismissible: boolean | null
          link_text: string | null
          link_url: string | null
          location: string[] | null
          starts_at: string | null
          target_audience: string | null
          target_plans: string[] | null
          title: string
          type: string | null
          view_count: number | null
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dismiss_count?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          link_text?: string | null
          link_url?: string | null
          location?: string[] | null
          starts_at?: string | null
          target_audience?: string | null
          target_plans?: string[] | null
          title: string
          type?: string | null
          view_count?: number | null
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dismiss_count?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          link_text?: string | null
          link_url?: string | null
          location?: string[] | null
          starts_at?: string | null
          target_audience?: string | null
          target_plans?: string[] | null
          title?: string
          type?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_logs: {
        Row: {
          action: string
          api_key_id: string | null
          created_at: string | null
          id: string
          new_preview: string | null
          notes: string | null
          old_preview: string | null
          performed_by: string | null
          result: string | null
          service_name: string
        }
        Insert: {
          action: string
          api_key_id?: string | null
          created_at?: string | null
          id?: string
          new_preview?: string | null
          notes?: string | null
          old_preview?: string | null
          performed_by?: string | null
          result?: string | null
          service_name: string
        }
        Update: {
          action?: string
          api_key_id?: string | null
          created_at?: string | null
          id?: string
          new_preview?: string | null
          notes?: string | null
          old_preview?: string | null
          performed_by?: string | null
          result?: string | null
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_key_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          docs_url: string | null
          environment: string | null
          expires_at: string | null
          icon: string | null
          id: string
          is_critical: boolean | null
          key_preview: string | null
          key_value: string
          last_test_error: string | null
          last_test_result: string | null
          last_tested_at: string | null
          monthly_limit: number | null
          monthly_usage: number | null
          notes: string | null
          rotated_at: string | null
          service_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          docs_url?: string | null
          environment?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_critical?: boolean | null
          key_preview?: string | null
          key_value: string
          last_test_error?: string | null
          last_test_result?: string | null
          last_tested_at?: string | null
          monthly_limit?: number | null
          monthly_usage?: number | null
          notes?: string | null
          rotated_at?: string | null
          service_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          docs_url?: string | null
          environment?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_critical?: boolean | null
          key_preview?: string | null
          key_value?: string
          last_test_error?: string | null
          last_test_result?: string | null
          last_tested_at?: string | null
          monthly_limit?: number | null
          monthly_usage?: number | null
          notes?: string | null
          rotated_at?: string | null
          service_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_stats: {
        Row: {
          avg_response_ms: number | null
          calls_failed: number | null
          calls_made: number | null
          estimated_cost_bdt: number | null
          id: string
          service_name: string
          stat_date: string
          total_tokens_used: number | null
        }
        Insert: {
          avg_response_ms?: number | null
          calls_failed?: number | null
          calls_made?: number | null
          estimated_cost_bdt?: number | null
          id?: string
          service_name: string
          stat_date: string
          total_tokens_used?: number | null
        }
        Update: {
          avg_response_ms?: number | null
          calls_failed?: number | null
          calls_made?: number | null
          estimated_cost_bdt?: number | null
          id?: string
          service_name?: string
          stat_date?: string
          total_tokens_used?: number | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analyses: {
        Row: {
          ads_found: Json | null
          ai_analysis: string | null
          competitor_name: string | null
          competitor_url: string | null
          counter_strategy: string | null
          created_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          ads_found?: Json | null
          ai_analysis?: string | null
          competitor_name?: string | null
          competitor_url?: string | null
          counter_strategy?: string | null
          created_at?: string
          id?: string
          workspace_id: string
        }
        Update: {
          ads_found?: Json | null
          ai_analysis?: string | null
          competitor_name?: string | null
          competitor_url?: string | null
          counter_strategy?: string | null
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          batch_id: string | null
          content_idea: string | null
          content_type: string
          created_at: string | null
          date: string
          day_of_week: string | null
          festival_theme: string | null
          generated_creative_id: string | null
          hook: string | null
          id: string
          occasion: string | null
          platform: string | null
          priority: string | null
          recommended_framework: string | null
          recommended_tone: string | null
          status: string | null
          swipe_action: string | null
          swiped_at: string | null
          title: string | null
          workspace_id: string
        }
        Insert: {
          batch_id?: string | null
          content_idea?: string | null
          content_type?: string
          created_at?: string | null
          date: string
          day_of_week?: string | null
          festival_theme?: string | null
          generated_creative_id?: string | null
          hook?: string | null
          id?: string
          occasion?: string | null
          platform?: string | null
          priority?: string | null
          recommended_framework?: string | null
          recommended_tone?: string | null
          status?: string | null
          swipe_action?: string | null
          swiped_at?: string | null
          title?: string | null
          workspace_id: string
        }
        Update: {
          batch_id?: string | null
          content_idea?: string | null
          content_type?: string
          created_at?: string | null
          date?: string
          day_of_week?: string | null
          festival_theme?: string | null
          generated_creative_id?: string | null
          hook?: string | null
          id?: string
          occasion?: string | null
          platform?: string | null
          priority?: string | null
          recommended_framework?: string | null
          recommended_tone?: string | null
          status?: string | null
          swipe_action?: string | null
          swiped_at?: string | null
          title?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_generated_creative_id_fkey"
            columns: ["generated_creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string | null
          discount_applied_bdt: number
          id: string
          payment_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          discount_applied_bdt: number
          id?: string
          payment_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          discount_applied_bdt?: number
          id?: string
          payment_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_billing: string | null
          applicable_plans: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          new_users_only: boolean | null
          total_revenue_bdt: number | null
          total_uses: number | null
          usage_limit: number | null
          usage_limit_per_user: number | null
        }
        Insert: {
          applicable_billing?: string | null
          applicable_plans?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          new_users_only?: boolean | null
          total_revenue_bdt?: number | null
          total_uses?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Update: {
          applicable_billing?: string | null
          applicable_plans?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          new_users_only?: boolean | null
          total_revenue_bdt?: number | null
          total_uses?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          html_content: string
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          name: string
          subject: string
          template_key: string
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          html_content: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          name: string
          subject: string
          template_key: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          html_content?: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          flag_key: string
          global_enabled: boolean | null
          id: string
          name: string
          plan_overrides: Json | null
          updated_at: string | null
          user_overrides: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flag_key: string
          global_enabled?: boolean | null
          id?: string
          name: string
          plan_overrides?: Json | null
          updated_at?: string | null
          user_overrides?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flag_key?: string
          global_enabled?: boolean | null
          id?: string
          name?: string
          plan_overrides?: Json | null
          updated_at?: string | null
          user_overrides?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          sent_by: string | null
          target_type: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sent_by?: string | null
          target_type?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sent_by?: string | null
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_bdt: number
          billing_cycle: string | null
          created_at: string
          id: string
          method: string | null
          plan_purchased: string | null
          ssl_session_id: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount_bdt: number
          billing_cycle?: string | null
          created_at?: string
          id?: string
          method?: string | null
          plan_purchased?: string | null
          ssl_session_id?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount_bdt?: number
          billing_cycle?: string | null
          created_at?: string
          id?: string
          method?: string | null
          plan_purchased?: string | null
          ssl_session_id?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          grandfather_policy: string | null
          id: string
          is_popular: boolean | null
          limits: Json | null
          name: string
          plan_key: string
          price_annual_bdt: number | null
          price_monthly_bdt: number
          sslcommerz_plan_code: string | null
          status: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          grandfather_policy?: string | null
          id?: string
          is_popular?: boolean | null
          limits?: Json | null
          name: string
          plan_key: string
          price_annual_bdt?: number | null
          price_monthly_bdt?: number
          sslcommerz_plan_code?: string | null
          status?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          grandfather_policy?: string | null
          id?: string
          is_popular?: boolean | null
          limits?: Json | null
          name?: string
          plan_key?: string
          price_annual_bdt?: number | null
          price_monthly_bdt?: number
          sslcommerz_plan_code?: string | null
          status?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_metrics_cache: {
        Row: {
          active_users_today: number | null
          ads_generated_today: number | null
          agency_users: number | null
          avg_dhoom_score: number | null
          computed_at: string | null
          id: string
          metric_date: string
          new_users_today: number | null
          pro_users: number | null
          revenue_today_bdt: number | null
          total_ads_generated: number | null
          total_ai_calls: number | null
          total_revenue_bdt: number | null
          total_users: number | null
          total_videos_generated: number | null
        }
        Insert: {
          active_users_today?: number | null
          ads_generated_today?: number | null
          agency_users?: number | null
          avg_dhoom_score?: number | null
          computed_at?: string | null
          id?: string
          metric_date: string
          new_users_today?: number | null
          pro_users?: number | null
          revenue_today_bdt?: number | null
          total_ads_generated?: number | null
          total_ai_calls?: number | null
          total_revenue_bdt?: number | null
          total_users?: number | null
          total_videos_generated?: number | null
        }
        Update: {
          active_users_today?: number | null
          ads_generated_today?: number | null
          agency_users?: number | null
          avg_dhoom_score?: number | null
          computed_at?: string | null
          id?: string
          metric_date?: string
          new_users_today?: number | null
          pro_users?: number | null
          revenue_today_bdt?: number | null
          total_ads_generated?: number | null
          total_ai_calls?: number | null
          total_revenue_bdt?: number | null
          total_users?: number | null
          total_videos_generated?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          language_pref: string
          onboarding_complete: boolean
          phone: string | null
          plan: string
          plan_key: string | null
          ssl_customer_id: string | null
          subscription_expires_at: string | null
          subscription_status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          language_pref?: string
          onboarding_complete?: boolean
          phone?: string | null
          plan?: string
          plan_key?: string | null
          ssl_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language_pref?: string
          onboarding_complete?: boolean
          phone?: string | null
          plan?: string
          plan_key?: string | null
          ssl_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          emoji: string | null
          end_date: string | null
          id: string
          is_archived: boolean | null
          name: string
          platform: string | null
          start_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          platform?: string | null
          start_date?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          platform?: string | null
          start_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_jobs: {
        Row: {
          attempt_count: number | null
          completed_at: string | null
          completed_variations: number | null
          error_message: string | null
          id: string
          input_config: Json
          job_type: string
          max_attempts: number | null
          output_urls: string[] | null
          queued_at: string | null
          started_at: string | null
          status: string
          total_variations: number | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          attempt_count?: number | null
          completed_at?: string | null
          completed_variations?: number | null
          error_message?: string | null
          id?: string
          input_config?: Json
          job_type: string
          max_attempts?: number | null
          output_urls?: string[] | null
          queued_at?: string | null
          started_at?: string | null
          status?: string
          total_variations?: number | null
          user_id: string
          workspace_id: string
        }
        Update: {
          attempt_count?: number | null
          completed_at?: string | null
          completed_variations?: number | null
          error_message?: string | null
          id?: string
          input_config?: Json
          job_type?: string
          max_attempts?: number | null
          output_urls?: string[] | null
          queued_at?: string | null
          started_at?: string | null
          status?: string
          total_variations?: number | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      style_templates: {
        Row: {
          display_order: number | null
          example_ad_url: string | null
          id: string
          industry_relevance: string[] | null
          is_active: boolean | null
          name: string
          platform_fit: string[] | null
          style_tags: string[]
          thumbnail_url: string | null
        }
        Insert: {
          display_order?: number | null
          example_ad_url?: string | null
          id?: string
          industry_relevance?: string[] | null
          is_active?: boolean | null
          name: string
          platform_fit?: string[] | null
          style_tags: string[]
          thumbnail_url?: string | null
        }
        Update: {
          display_order?: number | null
          example_ad_url?: string | null
          id?: string
          industry_relevance?: string[] | null
          is_active?: boolean | null
          name?: string
          platform_fit?: string[] | null
          style_tags?: string[]
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          feature: string
          id: string
          tokens_used: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          tokens_used?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          tokens_used?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_ads: {
        Row: {
          completed_at: string | null
          created_at: string
          dhoom_score: number | null
          file_size_bytes: number | null
          font_style: string | null
          format: string
          id: string
          music_track: string
          product_name: string | null
          render_id: string | null
          script: Json | null
          status: string
          style: string
          video_url: string | null
          voiceover_enabled: boolean | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dhoom_score?: number | null
          file_size_bytes?: number | null
          font_style?: string | null
          format?: string
          id?: string
          music_track?: string
          product_name?: string | null
          render_id?: string | null
          script?: Json | null
          status?: string
          style?: string
          video_url?: string | null
          voiceover_enabled?: boolean | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dhoom_score?: number | null
          file_size_bytes?: number | null
          font_style?: string | null
          format?: string
          id?: string
          music_track?: string
          product_name?: string | null
          render_id?: string | null
          script?: Json | null
          status?: string
          style?: string
          video_url?: string | null
          voiceover_enabled?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_products: {
        Row: {
          ads_generated_count: number | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          images: Json | null
          is_active: boolean | null
          last_used_at: string | null
          name: string
          original_price_bdt: number | null
          price_bdt: number | null
          primary_image_url: string | null
          source_url: string | null
          tags: string[] | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          ads_generated_count?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          original_price_bdt?: number | null
          price_bdt?: number | null
          primary_image_url?: string | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          ads_generated_count?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          original_price_bdt?: number | null
          price_bdt?: number | null
          primary_image_url?: string | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          brand_colors: Json | null
          brand_fonts: Json | null
          brand_logo_url: string | null
          brand_tone: string | null
          competitor_urls: string[] | null
          created_at: string
          dna_last_updated: string | null
          dna_score: number | null
          dna_source: string | null
          extraction_quality: string | null
          id: string
          industry: string | null
          key_products: string | null
          language: string
          niche_tags: string[] | null
          owner_id: string
          platform: string | null
          price_range: string | null
          scrape_data: Json | null
          shop_name: string
          shop_url: string | null
          style_preferences: Json | null
          target_audience: string | null
          unique_selling: string | null
        }
        Insert: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_logo_url?: string | null
          brand_tone?: string | null
          competitor_urls?: string[] | null
          created_at?: string
          dna_last_updated?: string | null
          dna_score?: number | null
          dna_source?: string | null
          extraction_quality?: string | null
          id?: string
          industry?: string | null
          key_products?: string | null
          language?: string
          niche_tags?: string[] | null
          owner_id: string
          platform?: string | null
          price_range?: string | null
          scrape_data?: Json | null
          shop_name: string
          shop_url?: string | null
          style_preferences?: Json | null
          target_audience?: string | null
          unique_selling?: string | null
        }
        Update: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          brand_logo_url?: string | null
          brand_tone?: string | null
          competitor_urls?: string[] | null
          created_at?: string
          dna_last_updated?: string | null
          dna_score?: number | null
          dna_source?: string | null
          extraction_quality?: string | null
          id?: string
          industry?: string | null
          key_products?: string | null
          language?: string
          niche_tags?: string[] | null
          owner_id?: string
          platform?: string | null
          price_range?: string | null
          scrape_data?: Json | null
          shop_name?: string
          shop_url?: string | null
          style_preferences?: Json | null
          target_audience?: string | null
          unique_selling?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      upsert_api_usage_stats: {
        Args: {
          p_calls_failed?: number
          p_calls_made?: number
          p_response_ms?: number
          p_service_name: string
          p_stat_date: string
        }
        Returns: undefined
      }
      workspace_owner_id: { Args: { _workspace_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
