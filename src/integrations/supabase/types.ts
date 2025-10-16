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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          app_version: string | null
          class_id: string
          confidence: number | null
          correct: boolean
          id: string
          level: number
          mode: string
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          set_id: string | null
          time_ms: number
          timestamp_iso: string | null
        }
        Insert: {
          app_version?: string | null
          class_id: string
          confidence?: number | null
          correct: boolean
          id?: string
          level: number
          mode: string
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          set_id?: string | null
          time_ms: number
          timestamp_iso?: string | null
        }
        Update: {
          app_version?: string | null
          class_id?: string
          confidence?: number | null
          correct?: boolean
          id?: string
          level?: number
          mode?: string
          pt?: number
          qid?: string
          qnum?: number
          qtype?: string
          section?: number
          set_id?: string | null
          time_ms?: number
          timestamp_iso?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          class_id: string
          details: Json | null
          event: string
          id: string
          timestamp_iso: string | null
        }
        Insert: {
          class_id: string
          details?: Json | null
          event: string
          id?: string
          timestamp_iso?: string | null
        }
        Update: {
          class_id?: string
          details?: Json | null
          event?: string
          id?: string
          timestamp_iso?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          by_level_json: Json | null
          by_qtype_json: Json | null
          class_id: string
          daily_goal_streak: number | null
          overall_answered: number | null
          overall_avg_ms: number | null
          overall_correct: number | null
          streak_current: number | null
          updated_at: string | null
          xp_total: number | null
        }
        Insert: {
          by_level_json?: Json | null
          by_qtype_json?: Json | null
          class_id: string
          daily_goal_streak?: number | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          streak_current?: number | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Update: {
          by_level_json?: Json | null
          by_qtype_json?: Json | null
          class_id?: string
          daily_goal_streak?: number | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          streak_current?: number | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          class_id: string
          cooldowns_json: Json | null
          current_qid: string | null
          cursor_index: number | null
          elapsed_ms: number | null
          markup_json: Json | null
          queue_json: Json | null
          review_queue_json: Json | null
          started_at: string | null
          timer_mode: string | null
          updated_at: string | null
        }
        Insert: {
          class_id: string
          cooldowns_json?: Json | null
          current_qid?: string | null
          cursor_index?: number | null
          elapsed_ms?: number | null
          markup_json?: Json | null
          queue_json?: Json | null
          review_queue_json?: Json | null
          started_at?: string | null
          timer_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          cooldowns_json?: Json | null
          current_qid?: string | null
          cursor_index?: number | null
          elapsed_ms?: number | null
          markup_json?: Json | null
          queue_json?: Json | null
          review_queue_json?: Json | null
          started_at?: string | null
          timer_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          adaptive_on: boolean | null
          class_id: string
          enabled_levels: number[] | null
          enabled_qtypes: string[] | null
          explore_ratio: number | null
          pace_vs_challenge: number | null
          time_pref: string | null
          updated_at: string | null
        }
        Insert: {
          adaptive_on?: boolean | null
          class_id: string
          enabled_levels?: number[] | null
          enabled_qtypes?: string[] | null
          explore_ratio?: number | null
          pace_vs_challenge?: number | null
          time_pref?: string | null
          updated_at?: string | null
        }
        Update: {
          adaptive_on?: boolean | null
          class_id?: string
          enabled_levels?: number[] | null
          enabled_qtypes?: string[] | null
          explore_ratio?: number | null
          pace_vs_challenge?: number | null
          time_pref?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          last_active_at: string | null
          pin_hash: string | null
          schema_version: number | null
          student_label: string | null
          token_hash: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          pin_hash?: string | null
          schema_version?: number | null
          student_label?: string | null
          token_hash: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          pin_hash?: string | null
          schema_version?: number | null
          student_label?: string | null
          token_hash?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
