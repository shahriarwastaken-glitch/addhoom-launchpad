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
          campaign_id: string | null
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
          platform: string | null
          product_name: string | null
          remixed_from_id: string | null
          score_reason: string | null
          source_url: string | null
          tone: string | null
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean
          body?: string | null
          campaign_id?: string | null
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
          platform?: string | null
          product_name?: string | null
          remixed_from_id?: string | null
          score_reason?: string | null
          source_url?: string | null
          tone?: string | null
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean
          body?: string | null
          campaign_id?: string | null
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
          platform?: string | null
          product_name?: string | null
          remixed_from_id?: string | null
          score_reason?: string | null
          source_url?: string | null
          tone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          messages?: Json
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
      campaigns: {
        Row: {
          budget_bdt: number | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          platform: string | null
          start_date: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          budget_bdt?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          platform?: string | null
          start_date?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          budget_bdt?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          platform?: string | null
          start_date?: string | null
          status?: string
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
          hook: string | null
          id: string
          occasion: string | null
          platform: string | null
          priority: string | null
          status: string | null
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
          hook?: string | null
          id?: string
          occasion?: string | null
          platform?: string | null
          priority?: string | null
          status?: string | null
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
          hook?: string | null
          id?: string
          occasion?: string | null
          platform?: string | null
          priority?: string | null
          status?: string | null
          title?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          ssl_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
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
      workspaces: {
        Row: {
          brand_tone: string | null
          created_at: string
          id: string
          industry: string | null
          key_products: string | null
          language: string
          owner_id: string
          platform: string | null
          price_range: string | null
          shop_name: string
          shop_url: string | null
          target_audience: string | null
          unique_selling: string | null
        }
        Insert: {
          brand_tone?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          key_products?: string | null
          language?: string
          owner_id: string
          platform?: string | null
          price_range?: string | null
          shop_name: string
          shop_url?: string | null
          target_audience?: string | null
          unique_selling?: string | null
        }
        Update: {
          brand_tone?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          key_products?: string | null
          language?: string
          owner_id?: string
          platform?: string | null
          price_range?: string | null
          shop_name?: string
          shop_url?: string | null
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
