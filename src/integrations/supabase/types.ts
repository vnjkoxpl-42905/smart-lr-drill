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
      achievements: {
        Row: {
          badge_id: string
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement: Json
          tier: string
          xp_reward: number
        }
        Insert: {
          badge_id: string
          category: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement: Json
          tier: string
          xp_reward?: number
        }
        Update: {
          badge_id?: string
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement?: Json
          tier?: string
          xp_reward?: number
        }
        Relationships: []
      }
      attempts: {
        Row: {
          app_version: string | null
          br_answer: string | null
          br_changed: boolean | null
          br_delta: string | null
          br_marked: boolean | null
          br_outcome: string | null
          br_rationale: string | null
          br_selected: boolean | null
          br_time_ms: number | null
          class_id: string
          confidence: number | null
          correct: boolean
          id: string
          level: number
          mode: string
          pre_answer: string | null
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          set_id: string | null
          time_ms: number
          timestamp_iso: string | null
          voice_used: boolean | null
        }
        Insert: {
          app_version?: string | null
          br_answer?: string | null
          br_changed?: boolean | null
          br_delta?: string | null
          br_marked?: boolean | null
          br_outcome?: string | null
          br_rationale?: string | null
          br_selected?: boolean | null
          br_time_ms?: number | null
          class_id: string
          confidence?: number | null
          correct: boolean
          id?: string
          level: number
          mode: string
          pre_answer?: string | null
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          set_id?: string | null
          time_ms: number
          timestamp_iso?: string | null
          voice_used?: boolean | null
        }
        Update: {
          app_version?: string | null
          br_answer?: string | null
          br_changed?: boolean | null
          br_delta?: string | null
          br_marked?: boolean | null
          br_outcome?: string | null
          br_rationale?: string | null
          br_selected?: boolean | null
          br_time_ms?: number | null
          class_id?: string
          confidence?: number | null
          correct?: boolean
          id?: string
          level?: number
          mode?: string
          pre_answer?: string | null
          pt?: number
          qid?: string
          qnum?: number
          qtype?: string
          section?: number
          set_id?: string | null
          time_ms?: number
          timestamp_iso?: string | null
          voice_used?: boolean | null
        }
        Relationships: []
      }
      blind_review_sessions: {
        Row: {
          br_confirmed_count: number
          br_corrected_count: number
          br_items_count: number
          br_median_time_ms: number | null
          br_regret_count: number
          br_stuck_count: number
          class_id: string
          created_at: string | null
          id: string
          session_id: string
        }
        Insert: {
          br_confirmed_count?: number
          br_corrected_count?: number
          br_items_count?: number
          br_median_time_ms?: number | null
          br_regret_count?: number
          br_stuck_count?: number
          class_id: string
          created_at?: string | null
          id?: string
          session_id: string
        }
        Update: {
          br_confirmed_count?: number
          br_corrected_count?: number
          br_items_count?: number
          br_median_time_ms?: number | null
          br_regret_count?: number
          br_stuck_count?: number
          class_id?: string
          created_at?: string | null
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          active: boolean
          bonus_rewards: Json | null
          challenge_type: string
          description: string
          ends_at: string
          id: string
          name: string
          requirements: Json
          starts_at: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          bonus_rewards?: Json | null
          challenge_type: string
          description: string
          ends_at: string
          id?: string
          name: string
          requirements: Json
          starts_at?: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          bonus_rewards?: Json | null
          challenge_type?: string
          description?: string
          ends_at?: string
          id?: string
          name?: string
          requirements?: Json
          starts_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      concept_library: {
        Row: {
          application: string | null
          category: string | null
          concept_name: string
          created_at: string | null
          examples: string | null
          explanation: string
          id: string
          keywords: string[] | null
          reasoning_type: string | null
          related_concepts: string[] | null
        }
        Insert: {
          application?: string | null
          category?: string | null
          concept_name: string
          created_at?: string | null
          examples?: string | null
          explanation: string
          id?: string
          keywords?: string[] | null
          reasoning_type?: string | null
          related_concepts?: string[] | null
        }
        Update: {
          application?: string | null
          category?: string | null
          concept_name?: string
          created_at?: string | null
          examples?: string | null
          explanation?: string
          id?: string
          keywords?: string[] | null
          reasoning_type?: string | null
          related_concepts?: string[] | null
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          class_id: string
          correct_answers: number
          date: string
          id: string
          questions_answered: number
          time_spent_ms: number
          xp_earned: number
        }
        Insert: {
          class_id: string
          correct_answers?: number
          date: string
          id?: string
          questions_answered?: number
          time_spent_ms?: number
          xp_earned?: number
        }
        Update: {
          class_id?: string
          correct_answers?: number
          date?: string
          id?: string
          questions_answered?: number
          time_spent_ms?: number
          xp_earned?: number
        }
        Relationships: []
      }
      drill_templates: {
        Row: {
          class_id: string
          created_at: string | null
          difficulties: number[]
          id: string
          pts: number[]
          qtypes: string[]
          set_size: number
          template_name: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          difficulties: number[]
          id?: string
          pts: number[]
          qtypes: string[]
          set_size?: number
          template_name: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          difficulties?: number[]
          id?: string
          pts?: number[]
          qtypes?: string[]
          set_size?: number
          template_name?: string
          updated_at?: string | null
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
      flagged_questions: {
        Row: {
          class_id: string | null
          flagged_at: string | null
          id: string
          note: string | null
          pt: number
          qid: string
          qnum: number
          section: number
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          flagged_at?: string | null
          id?: string
          note?: string | null
          pt: number
          qid: string
          qnum: number
          section: number
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          flagged_at?: string | null
          id?: string
          note?: string | null
          pt?: number
          qid?: string
          qnum?: number
          section?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          by_level_json: Json | null
          by_qtype_json: Json | null
          class_id: string
          daily_goal_questions: number | null
          daily_goal_streak: number | null
          last_practice_date: string | null
          level: number | null
          longest_streak: number | null
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
          daily_goal_questions?: number | null
          daily_goal_streak?: number | null
          last_practice_date?: string | null
          level?: number | null
          longest_streak?: number | null
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
          daily_goal_questions?: number | null
          daily_goal_streak?: number | null
          last_practice_date?: string | null
          level?: number | null
          longest_streak?: number | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          streak_current?: number | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Relationships: []
      }
      question_type_strategies: {
        Row: {
          answer_strategy: string
          category: string
          correct_answer_patterns: string | null
          created_at: string | null
          difficulty_indicators: string | null
          id: string
          prephrase_goal: string | null
          question_type: string
          reading_strategy: string
          related_reasoning_types: string[] | null
          stem_keywords: string[] | null
          wrong_answer_patterns: string | null
        }
        Insert: {
          answer_strategy: string
          category: string
          correct_answer_patterns?: string | null
          created_at?: string | null
          difficulty_indicators?: string | null
          id?: string
          prephrase_goal?: string | null
          question_type: string
          reading_strategy: string
          related_reasoning_types?: string[] | null
          stem_keywords?: string[] | null
          wrong_answer_patterns?: string | null
        }
        Update: {
          answer_strategy?: string
          category?: string
          correct_answer_patterns?: string | null
          created_at?: string | null
          difficulty_indicators?: string | null
          id?: string
          prephrase_goal?: string | null
          question_type?: string
          reading_strategy?: string
          related_reasoning_types?: string[] | null
          stem_keywords?: string[] | null
          wrong_answer_patterns?: string | null
        }
        Relationships: []
      }
      question_usage: {
        Row: {
          class_id: string
          created_at: string
          id: string
          last_seen_at: string
          mode: string
          qid: string
          times_seen: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          mode: string
          qid: string
          times_seen?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          mode?: string
          qid?: string
          times_seen?: number
        }
        Relationships: []
      }
      reasoning_type_guidance: {
        Row: {
          common_flaws: string[] | null
          created_at: string | null
          description: string
          examples: string | null
          id: string
          key_indicators: string[] | null
          reasoning_type: string
          relevant_question_types: string[] | null
          strengthen_tactics: string | null
          weaken_tactics: string | null
        }
        Insert: {
          common_flaws?: string[] | null
          created_at?: string | null
          description: string
          examples?: string | null
          id?: string
          key_indicators?: string[] | null
          reasoning_type: string
          relevant_question_types?: string[] | null
          strengthen_tactics?: string | null
          weaken_tactics?: string | null
        }
        Update: {
          common_flaws?: string[] | null
          created_at?: string | null
          description?: string
          examples?: string | null
          id?: string
          key_indicators?: string[] | null
          reasoning_type?: string
          relevant_question_types?: string[] | null
          strengthen_tactics?: string | null
          weaken_tactics?: string | null
        }
        Relationships: []
      }
      section_history: {
        Row: {
          avg_time_ms: number
          br_delta: number | null
          br_percent: number | null
          br_score: number | null
          br_total: number | null
          br_used: boolean
          by_difficulty_json: Json
          by_qtype_json: Json
          class_id: string
          created_at: string | null
          id: string
          initial_percent: number
          initial_score: number
          initial_total: number
          pt: number
          section: number
          section_mode: string
          total_time_ms: number
          unanswered_count: number
        }
        Insert: {
          avg_time_ms: number
          br_delta?: number | null
          br_percent?: number | null
          br_score?: number | null
          br_total?: number | null
          br_used?: boolean
          by_difficulty_json?: Json
          by_qtype_json?: Json
          class_id: string
          created_at?: string | null
          id?: string
          initial_percent: number
          initial_score: number
          initial_total: number
          pt: number
          section: number
          section_mode: string
          total_time_ms: number
          unanswered_count?: number
        }
        Update: {
          avg_time_ms?: number
          br_delta?: number | null
          br_percent?: number | null
          br_score?: number | null
          br_total?: number | null
          br_used?: boolean
          by_difficulty_json?: Json
          by_qtype_json?: Json
          class_id?: string
          created_at?: string | null
          id?: string
          initial_percent?: number
          initial_score?: number
          initial_total?: number
          pt?: number
          section?: number
          section_mode?: string
          total_time_ms?: number
          unanswered_count?: number
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
      tactical_patterns: {
        Row: {
          application: string | null
          created_at: string | null
          description: string
          examples: string | null
          formula: string | null
          id: string
          pattern_name: string
          pattern_type: string
          question_types: string[] | null
          reasoning_type: string | null
        }
        Insert: {
          application?: string | null
          created_at?: string | null
          description: string
          examples?: string | null
          formula?: string | null
          id?: string
          pattern_name: string
          pattern_type: string
          question_types?: string[] | null
          reasoning_type?: string | null
        }
        Update: {
          application?: string | null
          created_at?: string | null
          description?: string
          examples?: string | null
          formula?: string | null
          id?: string
          pattern_name?: string
          pattern_type?: string
          question_types?: string[] | null
          reasoning_type?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          class_id: string
          earned_at: string
          id: string
          progress: number | null
        }
        Insert: {
          achievement_id: string
          class_id: string
          earned_at?: string
          id?: string
          progress?: number | null
        }
        Update: {
          achievement_id?: string
          class_id?: string
          earned_at?: string
          id?: string
          progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          claimed: boolean
          class_id: string
          completed_at: string | null
          id: string
          progress: Json
        }
        Insert: {
          challenge_id: string
          claimed?: boolean
          class_id: string
          completed_at?: string | null
          id?: string
          progress?: Json
        }
        Update: {
          challenge_id?: string
          claimed?: boolean
          class_id?: string
          completed_at?: string | null
          id?: string
          progress?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_voice_settings: {
        Row: {
          class_id: string
          created_at: string | null
          section_debrief_enabled: boolean | null
          show_contrast: boolean | null
          store_full_transcript: boolean | null
          teach_back_on_correct: boolean | null
          updated_at: string | null
          voice_coach_enabled: boolean | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          section_debrief_enabled?: boolean | null
          show_contrast?: boolean | null
          store_full_transcript?: boolean | null
          teach_back_on_correct?: boolean | null
          updated_at?: string | null
          voice_coach_enabled?: boolean | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          section_debrief_enabled?: boolean | null
          show_contrast?: boolean | null
          store_full_transcript?: boolean | null
          teach_back_on_correct?: boolean | null
          updated_at?: string | null
          voice_coach_enabled?: boolean | null
        }
        Relationships: []
      }
      voice_coaching_sessions: {
        Row: {
          action_taken: string | null
          attempt_id: string | null
          class_id: string
          coach_reply_id: string
          coach_reply_text: string
          contrast_shown: boolean | null
          created_at: string | null
          id: string
          qid: string
          spoken_words: string | null
          teach_back_given: boolean | null
          transcript_full: string | null
          voice_duration_ms: number
        }
        Insert: {
          action_taken?: string | null
          attempt_id?: string | null
          class_id: string
          coach_reply_id: string
          coach_reply_text: string
          contrast_shown?: boolean | null
          created_at?: string | null
          id?: string
          qid: string
          spoken_words?: string | null
          teach_back_given?: boolean | null
          transcript_full?: string | null
          voice_duration_ms: number
        }
        Update: {
          action_taken?: string | null
          attempt_id?: string | null
          class_id?: string
          coach_reply_id?: string
          coach_reply_text?: string
          contrast_shown?: boolean | null
          created_at?: string | null
          id?: string
          qid?: string
          spoken_words?: string | null
          teach_back_given?: boolean | null
          transcript_full?: string | null
          voice_duration_ms?: number
        }
        Relationships: []
      }
      wrong_answer_journal: {
        Row: {
          class_id: string
          created_at: string | null
          first_wrong_at_iso: string
          history_json: Json
          id: string
          last_status: string
          level: number
          pt: number
          qid: string
          qnum: number
          qtype: string
          revisit_count: number
          section: number
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          first_wrong_at_iso?: string
          history_json?: Json
          id?: string
          last_status: string
          level: number
          pt: number
          qid: string
          qnum: number
          qtype: string
          revisit_count?: number
          section: number
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          first_wrong_at_iso?: string
          history_json?: Json
          id?: string
          last_status?: string
          level?: number
          pt?: number
          qid?: string
          qnum?: number
          qtype?: string
          revisit_count?: number
          section?: number
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
