export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_notes: {
        Row: {
          assigned_to: string | null
          category: string
          content: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          priority: string
          status: string
          support_ticket_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          content: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          support_ticket_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          support_ticket_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_chat_config: {
        Row: {
          created_at: string
          default_provider_id: string | null
          default_user_primary_model_id: string | null
          default_user_secondary_model_id: string | null
          failover_enabled: boolean
          id: string
          is_enabled: boolean
          max_tokens: number | null
          primary_provider_id: string | null
          request_timeout_seconds: number
          secondary_provider_id: string | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_provider_id?: string | null
          default_user_primary_model_id?: string | null
          default_user_secondary_model_id?: string | null
          failover_enabled?: boolean
          id?: string
          is_enabled?: boolean
          max_tokens?: number | null
          primary_provider_id?: string | null
          request_timeout_seconds?: number
          secondary_provider_id?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_provider_id?: string | null
          default_user_primary_model_id?: string | null
          default_user_secondary_model_id?: string | null
          failover_enabled?: boolean
          id?: string
          is_enabled?: boolean
          max_tokens?: number | null
          primary_provider_id?: string | null
          request_timeout_seconds?: number
          secondary_provider_id?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_config_default_provider_id_fkey"
            columns: ["default_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_primary_provider"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_secondary_provider"
            columns: ["secondary_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          browser_info: string | null
          created_at: string
          error_details: Json | null
          error_type: string | null
          id: string
          provider_name: string | null
          request_size: number | null
          request_type: string | null
          response_time_ms: number | null
          session_id: string | null
          success: boolean | null
          tokens_used: number | null
          user_context: Json | null
          user_id: string | null
          user_satisfaction: number | null
        }
        Insert: {
          browser_info?: string | null
          created_at?: string
          error_details?: Json | null
          error_type?: string | null
          id?: string
          provider_name?: string | null
          request_size?: number | null
          request_type?: string | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          tokens_used?: number | null
          user_context?: Json | null
          user_id?: string | null
          user_satisfaction?: number | null
        }
        Update: {
          browser_info?: string | null
          created_at?: string
          error_details?: Json | null
          error_type?: string | null
          id?: string
          provider_name?: string | null
          request_size?: number | null
          request_type?: string | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          tokens_used?: number | null
          user_context?: Json | null
          user_id?: string | null
          user_satisfaction?: number | null
        }
        Relationships: []
      }
      ai_link_tabs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          agent_description: string | null
          agent_id: string | null
          agent_name: string | null
          api_key_secret_name: string
          base_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          model_name: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          agent_description?: string | null
          agent_id?: string | null
          agent_name?: string | null
          api_key_secret_name: string
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model_name: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          agent_description?: string | null
          agent_id?: string | null
          agent_name?: string | null
          api_key_secret_name?: string
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          model_name?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          message: string
          priority: number
          start_date: string | null
          target_audience: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: number
          start_date?: string | null
          target_audience?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: number
          start_date?: string | null
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      attack_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          plan_data: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          plan_data?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          plan_data?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          resolved: boolean | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          resolved?: boolean | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          resolved?: boolean | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_health_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          time_window: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          time_window: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          time_window?: string
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          ai_quota_monthly: number | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          ai_quota_monthly?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          ai_quota_monthly?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          provider_name: string | null
          role: string
          session_id: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          provider_name?: string | null
          role: string
          session_id: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          provider_name?: string | null
          role?: string
          session_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cheat_sheets: {
        Row: {
          bg_color: string
          category: string
          commands: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          category: string
          commands?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          category?: string
          commands?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheat_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_stats: {
        Row: {
          active_users: number | null
          ai_success_rate: number | null
          avg_response_time_ms: number | null
          avg_session_duration: number | null
          bounce_rate: number | null
          created_at: string
          error_count: number | null
          id: string
          new_users: number | null
          stat_date: string
          total_ai_interactions: number | null
          total_sessions: number | null
        }
        Insert: {
          active_users?: number | null
          ai_success_rate?: number | null
          avg_response_time_ms?: number | null
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          new_users?: number | null
          stat_date: string
          total_ai_interactions?: number | null
          total_sessions?: number | null
        }
        Update: {
          active_users?: number | null
          ai_success_rate?: number | null
          avg_response_time_ms?: number | null
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          new_users?: number | null
          stat_date?: string
          total_ai_interactions?: number | null
          total_sessions?: number | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_extraction_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          template_content: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_content: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_content?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: []
      }
      model_access_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_usage_limit: number | null
          description: string | null
          id: string
          model_ids: string[]
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_usage_limit?: number | null
          description?: string | null
          id?: string
          model_ids?: string[]
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_usage_limit?: number | null
          description?: string | null
          id?: string
          model_ids?: string[]
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      model_usage_analytics: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          error_type: string | null
          id: string
          provider_id: string
          response_time_ms: number | null
          session_id: string | null
          success: boolean | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          provider_id: string
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          provider_id?: string
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      navigation_phases: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean
          label: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          label: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          id: string
          metric_type: string
          metric_unit: string
          metric_value: number
          recorded_at: string
          service_name: string | null
        }
        Insert: {
          id?: string
          metric_type: string
          metric_unit: string
          metric_value: number
          recorded_at?: string
          service_name?: string | null
        }
        Update: {
          id?: string
          metric_type?: string
          metric_unit?: string
          metric_value?: number
          recorded_at?: string
          service_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_pro: boolean | null
          permissions: string[] | null
          role: string
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_pro?: boolean | null
          permissions?: string[] | null
          role?: string
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_pro?: boolean | null
          permissions?: string[] | null
          role?: string
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_prompts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_favorite: boolean | null
          prompt_text: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          prompt_text: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          prompt_text?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          linked_techniques: string[] | null
          order_index: number
          phase: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          linked_techniques?: string[] | null
          order_index?: number
          phase?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          linked_techniques?: string[] | null
          order_index?: number
          phase?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_maintenance: {
        Row: {
          contact_info: string | null
          created_at: string
          created_by: string | null
          estimated_completion: string | null
          id: string
          is_enabled: boolean
          maintenance_message: string
          maintenance_title: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          estimated_completion?: string | null
          id?: string
          is_enabled?: boolean
          maintenance_message?: string
          maintenance_title?: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          estimated_completion?: string | null
          id?: string
          is_enabled?: boolean
          maintenance_message?: string
          maintenance_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean | null
          message_text: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message_text: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message_text?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      techniques: {
        Row: {
          category: string
          commands: Json
          created_at: string
          created_by: string | null
          description: string
          detection: string[]
          how_to_use: string[]
          id: string
          is_active: boolean
          mitigation: string[]
          mitre_id: string | null
          phase: string
          phases: string[] | null
          reference_links: Json
          tags: string[]
          title: string
          tools: string[]
          updated_at: string
          when_to_use: string[]
        }
        Insert: {
          category?: string
          commands?: Json
          created_at?: string
          created_by?: string | null
          description: string
          detection?: string[]
          how_to_use?: string[]
          id?: string
          is_active?: boolean
          mitigation?: string[]
          mitre_id?: string | null
          phase?: string
          phases?: string[] | null
          reference_links?: Json
          tags?: string[]
          title: string
          tools?: string[]
          updated_at?: string
          when_to_use?: string[]
        }
        Update: {
          category?: string
          commands?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          detection?: string[]
          how_to_use?: string[]
          id?: string
          is_active?: boolean
          mitigation?: string[]
          mitre_id?: string | null
          phase?: string
          phases?: string[] | null
          reference_links?: Json
          tags?: string[]
          title?: string
          tools?: string[]
          updated_at?: string
          when_to_use?: string[]
        }
        Relationships: []
      }
      traffic_analytics: {
        Row: {
          browser: string | null
          city: string | null
          country_code: string | null
          device_type: string | null
          id: string
          operating_system: string | null
          page_path: string
          referrer_source: string | null
          session_id: string | null
          visit_timestamp: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          device_type?: string | null
          id?: string
          operating_system?: string | null
          page_path: string
          referrer_source?: string | null
          session_id?: string | null
          visit_timestamp?: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country_code?: string | null
          device_type?: string | null
          id?: string
          operating_system?: string | null
          page_path?: string
          referrer_source?: string | null
          session_id?: string | null
          visit_timestamp?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_billing: {
        Row: {
          account_lock_date: string | null
          account_lock_reason: string | null
          account_locked: boolean | null
          ai_quota_limit: number | null
          ai_usage_current: number | null
          billing_cycle: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_lock_date?: string | null
          account_lock_reason?: string | null
          account_locked?: boolean | null
          ai_quota_limit?: number | null
          ai_usage_current?: number | null
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_lock_date?: string | null
          account_lock_reason?: string | null
          account_locked?: boolean | null
          ai_quota_limit?: number | null
          ai_usage_current?: number | null
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          technique_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          technique_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          technique_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      user_model_access: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_enabled: boolean
          notes: string | null
          provider_id: string
          usage_current: number | null
          usage_limit: number | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          notes?: string | null
          provider_id: string
          usage_current?: number | null
          usage_limit?: number | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          notes?: string | null
          provider_id?: string
          usage_current?: number | null
          usage_limit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_model_access_provider"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plan_audit: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          new_plan_id: string | null
          new_plan_name: string | null
          notes: string | null
          old_plan_id: string | null
          old_plan_name: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          new_plan_id?: string | null
          new_plan_name?: string | null
          notes?: string | null
          old_plan_id?: string | null
          old_plan_name?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          new_plan_id?: string | null
          new_plan_name?: string | null
          notes?: string | null
          old_plan_id?: string | null
          old_plan_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          address: string | null
          app_notifications: boolean | null
          avatar_url: string | null
          created_at: string
          data_sharing: boolean | null
          display_name: string | null
          email: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          marketing_emails: boolean | null
          phone: string | null
          selected_model_id: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          app_notifications?: boolean | null
          avatar_url?: string | null
          created_at?: string
          data_sharing?: boolean | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          phone?: string | null
          selected_model_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          app_notifications?: boolean | null
          avatar_url?: string | null
          created_at?: string
          data_sharing?: boolean | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          phone?: string | null
          selected_model_id?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_selected_model_id_fkey"
            columns: ["selected_model_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          ip_address: unknown | null
          is_bounce: boolean | null
          pages_visited: number | null
          referrer: string | null
          session_end: string | null
          session_start: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown | null
          is_bounce?: boolean | null
          pages_visited?: number | null
          referrer?: string | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown | null
          is_bounce?: boolean | null
          pages_visited?: number | null
          referrer?: string | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_ai_interactions: {
        Args: {
          target_user_id: string
          additional_interactions: number
          admin_user_id: string
        }
        Returns: boolean
      }
      admin_edit_ai_usage: {
        Args: {
          target_user_id: string
          admin_user_id: string
          new_quota_limit?: number
          new_current_usage?: number
        }
        Returns: boolean
      }
      admin_grant_model_access: {
        Args: {
          target_user_id: string
          provider_id_param: string
          admin_user_id: string
          usage_limit_param?: number
          expires_at_param?: string
          notes_param?: string
        }
        Returns: boolean
      }
      backfill_model_usage_from_interactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      calculate_auth_health_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_daily_stats: {
        Args: { target_date?: string }
        Returns: undefined
      }
      check_ai_quota: {
        Args: { user_id_param: string }
        Returns: {
          can_use_ai: boolean
          current_usage: number
          quota_limit: number
          plan_name: string
        }[]
      }
      check_model_quota: {
        Args: { user_id_param: string; provider_id_param: string }
        Returns: {
          can_use_model: boolean
          current_usage: number
          usage_limit: number
          provider_name: string
        }[]
      }
      ensure_default_model_access_for_all_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      force_clean_user_auth: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_complete_user_profile: {
        Args: { target_user_id: string }
        Returns: {
          user_id: string
          email: string
          display_name: string
          role: string
          subscription_status: string
          is_pro: boolean
          permissions: string[]
          ai_usage_current: number
          ai_quota_limit: number
          plan_name: string
        }[]
      }
      get_user_ai_usage_stats: {
        Args: { start_date_param?: string; end_date_param?: string }
        Returns: {
          user_id: string
          email: string
          display_name: string
          daily_interactions: number
          total_interactions: number
          success_rate: number
          avg_response_time: number
          quota_used: number
          quota_limit: number
          plan_name: string
        }[]
      }
      get_user_sessions_with_profiles: {
        Args: {
          start_date_param?: string
          end_date_param?: string
          limit_count?: number
        }
        Returns: {
          id: string
          user_id: string
          email: string
          session_start: string
          session_end: string
          duration_seconds: number
          pages_visited: number
          is_bounce: boolean
          user_agent: string
          referrer: string
          created_at: string
        }[]
      }
      increment_ai_usage: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      increment_model_usage: {
        Args: {
          user_id_param: string
          provider_id_param: string
          tokens_used_param?: number
          response_time_param?: number
          session_id_param?: string
        }
        Returns: boolean
      }
      log_auth_event: {
        Args: {
          p_user_id: string
          p_event_type: string
          p_event_data?: Json
          p_severity?: string
        }
        Returns: undefined
      }
      log_session_activity: {
        Args: {
          p_user_id: string
          p_session_id: string
          p_action: string
          p_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: undefined
      }
      nuclear_auth_reset: {
        Args: { target_user_id?: string }
        Returns: undefined
      }
      validate_session_health: {
        Args: { p_user_id: string; p_session_id: string }
        Returns: {
          is_valid: boolean
          issues: Json
          recommendations: Json
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
