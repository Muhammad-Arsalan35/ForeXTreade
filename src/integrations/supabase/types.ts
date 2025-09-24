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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
}
      commission_rates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["referral_level_enum"]
          rate: number
          updated_at: string | null
          vip_upgrade_commission_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level: Database["public"]["Enums"]["referral_level_enum"]
          rate: number
          updated_at?: string | null
          vip_upgrade_commission_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["referral_level_enum"]
          rate?: number
          updated_at?: string | null
          vip_upgrade_commission_percentage?: number | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          account_number: string
          amount: number
          created_at: string
          expires_at: string
          id: string
          payment_method: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          amount: number
          created_at?: string
          expires_at: string
          id?: string
          payment_method: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          payment_method?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_number: string
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
        }
        Insert: {
          account_number: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
        }
        Update: {
          account_number?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          level: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          level: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          level?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referrals: {
        Row: {
          commission_rate: number
          created_at: string | null
          id: string
          last_commission_date: string | null
          level: Database["public"]["Enums"]["referral_level_enum"]
          referral_code_used: string
          referred_id: string
          referrer_id: string
          registration_completed: boolean | null
          status: Database["public"]["Enums"]["referral_status_enum"] | null
          total_commission_earned: number | null
          updated_at: string | null
          validity_status: boolean | null
        }
        Insert: {
          commission_rate: number
          created_at?: string | null
          id?: string
          last_commission_date?: string | null
          level: Database["public"]["Enums"]["referral_level_enum"]
          referral_code_used: string
          referred_id: string
          referrer_id: string
          registration_completed?: boolean | null
          status?: Database["public"]["Enums"]["referral_status_enum"] | null
          total_commission_earned?: number | null
          updated_at?: string | null
          validity_status?: boolean | null
        }
        Update: {
          commission_rate?: number
          created_at?: string | null
          id?: string
          last_commission_date?: string | null
          level?: Database["public"]["Enums"]["referral_level_enum"]
          referral_code_used?: string
          referred_id?: string
          referrer_id?: string
          registration_completed?: boolean | null
          status?: Database["public"]["Enums"]["referral_status_enum"] | null
          total_commission_earned?: number | null
          updated_at?: string | null
          validity_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          base_reward: number
          category: Database["public"]["Enums"]["task_category_enum"]
          created_at: string | null
          daily_completion_limit: number | null
          description: string | null
          duration_seconds: number | null
          end_date: string | null
          id: string
          max_completions_per_user: number | null
          media_type: Database["public"]["Enums"]["media_type_enum"] | null
          media_url: string | null
          min_vip_level: Database["public"]["Enums"]["vip_level_enum"] | null
          min_watch_time: number | null
          requirements: Json | null
          start_date: string | null
          success_rate: number | null
          task_status: Database["public"]["Enums"]["task_status_enum"] | null
          task_type: Database["public"]["Enums"]["task_type_enum"]
          thumbnail_url: string | null
          title: string
          total_budget: number | null
          total_completions: number | null
          total_views: number | null
          updated_at: string | null
          used_budget: number | null
          vip_multiplier: Json | null
        }
        Insert: {
          base_reward: number
          category: Database["public"]["Enums"]["task_category_enum"]
          created_at?: string | null
          daily_completion_limit?: number | null
          description?: string | null
          duration_seconds?: number | null
          end_date?: string | null
          id?: string
          max_completions_per_user?: number | null
          media_type?: Database["public"]["Enums"]["media_type_enum"] | null
          media_url?: string | null
          min_vip_level?: Database["public"]["Enums"]["vip_level_enum"] | null
          min_watch_time?: number | null
          requirements?: Json | null
          start_date?: string | null
          success_rate?: number | null
          task_status?: Database["public"]["Enums"]["task_status_enum"] | null
          task_type: Database["public"]["Enums"]["task_type_enum"]
          thumbnail_url?: string | null
          title: string
          total_budget?: number | null
          total_completions?: number | null
          total_views?: number | null
          updated_at?: string | null
          used_budget?: number | null
          vip_multiplier?: Json | null
        }
        Update: {
          base_reward?: number
          category?: Database["public"]["Enums"]["task_category_enum"]
          created_at?: string | null
          daily_completion_limit?: number | null
          description?: string | null
          duration_seconds?: number | null
          end_date?: string | null
          id?: string
          max_completions_per_user?: number | null
          media_type?: Database["public"]["Enums"]["media_type_enum"] | null
          media_url?: string | null
          min_vip_level?: Database["public"]["Enums"]["vip_level_enum"] | null
          min_watch_time?: number | null
          requirements?: Json | null
          start_date?: string | null
          success_rate?: number | null
          task_status?: Database["public"]["Enums"]["task_status_enum"] | null
          task_type?: Database["public"]["Enums"]["task_type_enum"]
          thumbnail_url?: string | null
          title?: string
          total_budget?: number | null
          total_completions?: number | null
          total_views?: number | null
          updated_at?: string | null
          used_budget?: number | null
          vip_multiplier?: Json | null
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          created_at: string | null
          id: string
          reward_earned: number | null
          session_id: string | null
          task_id: string
          task_key: string | null
          task_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string | null
          id?: string
          reward_earned?: number | null
          session_id?: string | null
          task_id: string
          task_key?: string | null
          task_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string | null
          id?: string
          reward_earned?: number | null
          session_id?: string | null
          task_id?: string
          task_key?: string | null
          task_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_structure: {
        Row: {
          active_members: number | null
          created_at: string | null
          id: string
          level_depth: number | null
          monthly_team_commission: number | null
          parent_id: string | null
          total_a_team: number | null
          total_b_team: number | null
          total_c_team: number | null
          total_team_commission: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_members?: number | null
          created_at?: string | null
          id?: string
          level_depth?: number | null
          monthly_team_commission?: number | null
          parent_id?: string | null
          total_a_team?: number | null
          total_b_team?: number | null
          total_c_team?: number | null
          total_team_commission?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_members?: number | null
          created_at?: string | null
          id?: string
          level_depth?: number | null
          monthly_team_commission?: number | null
          parent_id?: string | null
          total_a_team?: number | null
          total_b_team?: number | null
          total_c_team?: number | null
          total_team_commission?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_structure_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_structure_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["transaction_status_enum"] | null
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          refresh_token: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          refresh_token: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          refresh_token?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          assigned_at: string | null
          bonus_earned: number | null
          completed_at: string | null
          completion_data: Json | null
          expires_at: string | null
          id: string
          progress_percentage: number | null
          reward_earned: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["user_task_status_enum"] | null
          task_id: string
          time_spent: number | null
          user_id: string
          verification_notes: string | null
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          assigned_at?: string | null
          bonus_earned?: number | null
          completed_at?: string | null
          completion_data?: Json | null
          expires_at?: string | null
          id?: string
          progress_percentage?: number | null
          reward_earned?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["user_task_status_enum"] | null
          task_id: string
          time_spent?: number | null
          user_id: string
          verification_notes?: string | null
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          assigned_at?: string | null
          bonus_earned?: number | null
          completed_at?: string | null
          completion_data?: Json | null
          expires_at?: string | null
          id?: string
          progress_percentage?: number | null
          reward_earned?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["user_task_status_enum"] | null
          task_id?: string
          time_spent?: number | null
          user_id?: string
          verification_notes?: string | null
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_locked_until: string | null
          auth_user_id: string | null
          created_at: string | null
          full_name: string
          id: string
          income_wallet_balance: number | null
          last_login: string | null
          login_attempts: number | null
          personal_wallet_balance: number | null
          phone_number: string | null
          position_title: string | null
          profile_avatar: string | null
          referral_code: string
          referral_count: number | null
          referral_level: number | null
          referred_by: string | null
          total_earnings: number | null
          total_invested: number | null
          total_referral_earnings: number | null
          level: number | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          user_status: Database["public"]["Enums"]["user_status_enum"] | null
          username: string
          vip_level: Database["public"]["Enums"]["vip_level_enum"] | null
        }
        Insert: {
          account_locked_until?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          income_wallet_balance?: number | null
          last_login?: string | null
          login_attempts?: number | null
          personal_wallet_balance?: number | null
          phone_number?: string | null
          position_title?: string | null
          profile_avatar?: string | null
          referral_code?: string
          referral_count?: number | null
          referral_level?: number | null
          referred_by?: string | null
          total_earnings?: number | null
          total_invested?: number | null
          total_referral_earnings?: number | null
          level?: number | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          user_status?: Database["public"]["Enums"]["user_status_enum"] | null
          username: string
          vip_level?: Database["public"]["Enums"]["vip_level_enum"] | null
        }
        Update: {
          account_locked_until?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          income_wallet_balance?: number | null
          last_login?: string | null
          login_attempts?: number | null
          personal_wallet_balance?: number | null
          phone_number?: string | null
          position_title?: string | null
          profile_avatar?: string | null
          referral_code?: string
          referral_count?: number | null
          referral_level?: number | null
          referred_by?: string | null
          total_earnings?: number | null
          total_invested?: number | null
          total_referral_earnings?: number | null
          level?: number | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          user_status?: Database["public"]["Enums"]["user_status_enum"] | null
          username?: string
          vip_level?: Database["public"]["Enums"]["vip_level_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_levels: {
        Row: {
          color_scheme: string | null
          commission_rate: number | null
          created_at: string | null
          daily_tasks_available: number
          deposit_required: number
          earning_potential: number
          id: number
          level_name: string
          level_number: number
          special_benefits: string | null
          withdrawal_limit: number | null
        }
        Insert: {
          color_scheme?: string | null
          commission_rate?: number | null
          created_at?: string | null
          daily_tasks_available: number
          deposit_required: number
          earning_potential: number
          id?: number
          level_name: string
          level_number: number
          special_benefits?: string | null
          withdrawal_limit?: number | null
        }
        Update: {
          color_scheme?: string | null
          commission_rate?: number | null
          created_at?: string | null
          daily_tasks_available?: number
          deposit_required?: number
          earning_potential?: number
          id?: number
          level_name?: string
          level_number?: number
          special_benefits?: string | null
          withdrawal_limit?: number | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["withdrawal_status_enum"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status_enum"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status_enum"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      vip_upgrades: {
        Row: {
          from_level: Database["public"]["Enums"]["vip_level_enum"] | null
          id: string
          status: Database["public"]["Enums"]["transaction_status_enum"] | null
          to_level: Database["public"]["Enums"]["vip_level_enum"]
          upgrade_amount: number
          upgrade_date: string | null
          user_id: string
        }
        Insert: {
          from_level?: Database["public"]["Enums"]["vip_level_enum"] | null
          id?: string
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null
          to_level: Database["public"]["Enums"]["vip_level_enum"]
          upgrade_amount: number
          upgrade_date?: string | null
          user_id: string
        }
        Update: {
          from_level?: Database["public"]["Enums"]["vip_level_enum"] | null
          id?: string
          status?: Database["public"]["Enums"]["transaction_status_enum"] | null
          to_level?: Database["public"]["Enums"]["vip_level_enum"]
          upgrade_amount?: number
          upgrade_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_upgrades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          plan_id: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          plan_id: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          reward_per_watch: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          reward_per_watch?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          reward_per_watch?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      video_earning_rates: {
        Row: {
          created_at: string | null
          id: string
          rate_per_video: number
          updated_at: string | null
          vip_level: Database["public"]["Enums"]["vip_level_enum"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          rate_per_video: number
          updated_at?: string | null
          vip_level: Database["public"]["Enums"]["vip_level_enum"]
        }
        Update: {
          created_at?: string | null
          id?: string
          rate_per_video?: number
          updated_at?: string | null
          vip_level?: Database["public"]["Enums"]["vip_level_enum"]
        }
        Relationships: []
      }
      app_config: {
        Row: {
          created_at: string | null
          id: string
          support_phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          support_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          support_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      deposit_status_enum:
        | "initiated"
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
      media_type_enum: "image" | "video" | "url" | "app_link"
      notification_type_enum:
        | "info"
        | "success"
        | "warning"
        | "error"
        | "promotion"
      payment_method_enum:
        | "bank_transfer"
        | "easypaisa"
        | "jazzcash"
        | "mobile_banking"
      period_type_enum: "weekly" | "monthly" | "yearly"
      referral_level_enum: "A" | "B" | "C"
      referral_status_enum: "pending" | "active" | "expired" | "cancelled"
      security_event_enum:
        | "login_success"
        | "login_failed"
        | "password_reset"
        | "account_locked"
        | "suspicious_activity"
      setting_type_enum: "string" | "number" | "boolean" | "json"
      severity_enum: "low" | "medium" | "high" | "critical"
      task_category_enum:
        | "Commercial Advertisement"
        | "Commodity Advertising"
        | "Film Publicity"
        | "Social Media"
        | "Review Task"
      task_status_enum: "active" | "inactive" | "expired" | "draft"
      task_type_enum:
        | "video_watch"
        | "image_view"
        | "app_download"
        | "survey"
        | "social_action"
      transaction_status_enum:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      transaction_type_enum:
        | "task_reward"
        | "referral_commission"
        | "vip_upgrade"
        | "deposit"
        | "withdrawal"
        | "admin_adjustment"
        | "security_deposit"
        | "tax_deduction"
        | "bonus_reward"
        | "penalty"
        | "refund"
      user_status_enum:
        | "active"
        | "suspended"
        | "banned"
        | "pending_verification"
      user_task_status_enum:
        | "assigned"
        | "started"
        | "in_progress"
        | "completed"
        | "failed"
        | "expired"
      vip_level_enum:
        | "VIP1"
        | "VIP2"
        | "VIP3"
        | "VIP4"
        | "VIP5"
        | "VIP6"
        | "VIP7"
        | "VIP8"
        | "VIP9"
        | "VIP10"
      wallet_type_enum: "income_wallet" | "personal_wallet"
      withdrawal_status_enum:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
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
      deposit_status_enum: [
        "initiated",
        "pending",
        "processing",
        "completed",
        "failed",
        "expired",
      ],
      media_type_enum: ["image", "video", "url", "app_link"],
      notification_type_enum: [
        "info",
        "success",
        "warning",
        "error",
        "promotion",
      ],
      payment_method_enum: [
        "bank_transfer",
        "easypaisa",
        "jazzcash",
        "mobile_banking",
      ],
      period_type_enum: ["weekly", "monthly", "yearly"],
      referral_level_enum: ["A", "B", "C"],
      referral_status_enum: ["pending", "active", "expired", "cancelled"],
      security_event_enum: [
        "login_success",
        "login_failed",
        "password_reset",
        "account_locked",
        "suspicious_activity",
      ],
      setting_type_enum: ["string", "number", "boolean", "json"],
      severity_enum: ["low", "medium", "high", "critical"],
      task_category_enum: [
        "Commercial Advertisement",
        "Commodity Advertising",
        "Film Publicity",
        "Social Media",
        "Review Task",
      ],
      task_status_enum: ["active", "inactive", "expired", "draft"],
      task_type_enum: [
        "video_watch",
        "image_view",
        "app_download",
        "survey",
        "social_action",
      ],
      transaction_status_enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      transaction_type_enum: [
        "task_reward",
        "referral_commission",
        "vip_upgrade",
        "deposit",
        "withdrawal",
        "admin_adjustment",
        "security_deposit",
        "tax_deduction",
        "bonus_reward",
        "penalty",
        "refund",
      ],
      user_status_enum: [
        "active",
        "suspended",
        "banned",
        "pending_verification",
      ],
      user_task_status_enum: [
        "assigned",
        "started",
        "in_progress",
        "completed",
        "failed",
        "expired",
      ],
      vip_level_enum: [
        "VIP1",
        "VIP2",
        "VIP3",
        "VIP4",
        "VIP5",
        "VIP6",
        "VIP7",
        "VIP8",
        "VIP9",
        "VIP10",
      ],
      wallet_type_enum: ["income_wallet", "personal_wallet"],
      withdrawal_status_enum: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
