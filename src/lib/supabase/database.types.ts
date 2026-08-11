export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sentences: {
        Row: {
          id: string
          text: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          text: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          text?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          id: string
          user_id: string
          duration_sec: 15 | 30 | 60
          wpm: number
          accuracy: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          duration_sec: 15 | 30 | 60
          wpm: number
          accuracy: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          duration_sec?: 15 | 30 | 60
          wpm?: number
          accuracy?: number
          created_at?: string
        }
        Relationships: []
      }
      daily_bests: {
        Row: {
          id: string
          user_id: string
          duration_sec: 15 | 30 | 60
          local_date: string
          wpm: number
          accuracy: number
          attempt_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          duration_sec: 15 | 30 | 60
          local_date: string
          wpm: number
          accuracy: number
          attempt_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          duration_sec?: 15 | 30 | 60
          local_date?: string
          wpm?: number
          accuracy?: number
          attempt_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
