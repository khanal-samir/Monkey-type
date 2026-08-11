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
        Relationships: [
          {
            foreignKeyName: 'attempts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'daily_bests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'daily_bests_attempt_id_fkey'
            columns: ['attempt_id']
            isOneToOne: false
            referencedRelation: 'attempts'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
