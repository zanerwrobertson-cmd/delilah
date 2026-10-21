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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assignment_name: string
          course_name: string
          created_at: string
          deadline: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          assignment_name: string
          course_name: string
          created_at?: string
          deadline?: string | null
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          assignment_name?: string
          course_name?: string
          created_at?: string
          deadline?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          grades: Json | null
          id: string
          learning_style: string | null
          onboarding_completed: boolean
          struggle_subjects: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grades?: Json | null
          id?: string
          learning_style?: string | null
          onboarding_completed?: boolean
          struggle_subjects?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grades?: Json | null
          id?: string
          learning_style?: string | null
          onboarding_completed?: boolean
          struggle_subjects?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_progress: {
        Row: {
          course: string
          created_at: string
          current_index: number
          id: string
          mode: string
          questions: Json
          updated_at: string
          user_answers: Json
          user_id: string
        }
        Insert: {
          course: string
          created_at?: string
          current_index?: number
          id?: string
          mode: string
          questions: Json
          updated_at?: string
          user_answers: Json
          user_id: string
        }
        Update: {
          course?: string
          created_at?: string
          current_index?: number
          id?: string
          mode?: string
          questions?: Json
          updated_at?: string
          user_answers?: Json
          user_id?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          course: string
          created_at: string
          id: string
          mode: string
          score: number
          time_taken_seconds: number | null
          total: number
          user_id: string
          weak_areas: string[] | null
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          mode: string
          score: number
          time_taken_seconds?: number | null
          total: number
          user_id: string
          weak_areas?: string[] | null
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          mode?: string
          score?: number
          time_taken_seconds?: number | null
          total?: number
          user_id?: string
          weak_areas?: string[] | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          course_name: string
          created_at: string
          id: string
          topic_name: string
          user_id: string
          weak_areas: string[] | null
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          topic_name: string
          user_id: string
          weak_areas?: string[] | null
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          topic_name?: string
          user_id?: string
          weak_areas?: string[] | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          course_name: string
          created_at: string
          id: string
          is_weak_area: boolean
          topic_name: string
          user_id: string
          week_number: number | null
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          is_weak_area?: boolean
          topic_name: string
          user_id: string
          week_number?: number | null
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          is_weak_area?: boolean
          topic_name?: string
          user_id?: string
          week_number?: number | null
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          id: string
          set_id: string
          user_id: string
          file_name: string
          kind: string
          content: string
          char_count: number
          created_at: string
        }
        Insert: {
          id?: string
          set_id: string
          user_id: string
          file_name: string
          kind: string
          content: string
          char_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          set_id?: string
          user_id?: string
          file_name?: string
          kind?: string
          content?: string
          char_count?: number
          created_at?: string
        }
        Relationships: []
      }
      study_messages: {
        Row: {
          id: string
          set_id: string
          user_id: string
          role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          set_id: string
          user_id: string
          role: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          set_id?: string
          user_id?: string
          role?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      study_sets: {
        Row: {
          id: string
          user_id: string
          title: string
          course_name: string | null
          guide: Json | null
          flashcards: Json | null
          practice: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          course_name?: string | null
          guide?: Json | null
          flashcards?: Json | null
          practice?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          course_name?: string | null
          guide?: Json | null
          flashcards?: Json | null
          practice?: Json | null
          created_at?: string
          updated_at?: string
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
