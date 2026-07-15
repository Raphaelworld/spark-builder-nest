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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          confidence: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["checkin_kind"]
          note: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["checkin_kind"]
          note?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["checkin_kind"]
          note?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_blocks: {
        Row: {
          created_at: string
          day_of_week: number
          end_minute: number
          goal_id: string | null
          id: string
          planned_minutes: number
          session_id: string | null
          start_minute: number
          technique: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_minute: number
          goal_id?: string | null
          id?: string
          planned_minutes?: number
          session_id?: string | null
          start_minute: number
          technique?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_minute?: number
          goal_id?: string | null
          id?: string
          planned_minutes?: number
          session_id?: string | null
          start_minute?: number
          technique?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_blocks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coach_tone: string
          created_at: string
          default_duration: number
          default_technique: string
          display_name: string | null
          id: string
          onboarding_completed_at: string | null
          updated_at: string
        }
        Insert: {
          coach_tone?: string
          created_at?: string
          default_duration?: number
          default_technique?: string
          display_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          coach_tone?: string
          created_at?: string
          default_duration?: number
          default_technique?: string
          display_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          abandon_reason: string | null
          created_at: string
          ended_at: string | null
          exam_mode: boolean
          focus_rating: number | null
          goal_id: string | null
          id: string
          next_time_note: string | null
          planned_minutes: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          task: string
          technique: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandon_reason?: string | null
          created_at?: string
          ended_at?: string | null
          exam_mode?: boolean
          focus_rating?: number | null
          goal_id?: string | null
          id?: string
          next_time_note?: string | null
          planned_minutes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          task: string
          technique?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandon_reason?: string | null
          created_at?: string
          ended_at?: string | null
          exam_mode?: boolean
          focus_rating?: number | null
          goal_id?: string | null
          id?: string
          next_time_note?: string | null
          planned_minutes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          task?: string
          technique?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapup_tags: {
        Row: {
          created_at: string
          id: string
          polarity: Database["public"]["Enums"]["wrapup_polarity"]
          session_id: string
          tag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          polarity: Database["public"]["Enums"]["wrapup_polarity"]
          session_id: string
          tag: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          polarity?: Database["public"]["Enums"]["wrapup_polarity"]
          session_id?: string
          tag?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wrapup_tags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      checkin_kind: "auto" | "manual" | "stuck"
      goal_status: "active" | "archived" | "completed"
      session_status: "active" | "completed" | "abandoned"
      wrapup_polarity: "worked" | "didnt"
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
      checkin_kind: ["auto", "manual", "stuck"],
      goal_status: ["active", "archived", "completed"],
      session_status: ["active", "completed", "abandoned"],
      wrapup_polarity: ["worked", "didnt"],
    },
  },
} as const
