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
      providers: {
        Row: {
          id: string
          email: string
          name: string | null
          business_name: string | null
          business_category: string | null
          timezone: string
          avatar_url: string | null
          slug: string | null
          plan: 'free' | 'paid'
          collect_phone: boolean
          accent_color: 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | null
          google_calendar_token: Json | null
          google_calendar_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          business_name?: string | null
          business_category?: string | null
          timezone?: string
          avatar_url?: string | null
          slug?: string | null
          plan?: 'free' | 'paid'
          collect_phone?: boolean
          accent_color?: 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
          google_calendar_token?: Json | null
          google_calendar_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          business_name?: string | null
          business_category?: string | null
          timezone?: string
          avatar_url?: string | null
          slug?: string | null
          plan?: 'free' | 'paid'
          collect_phone?: boolean
          accent_color?: 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
          google_calendar_token?: Json | null
          google_calendar_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string | null
          duration_minutes: number
          price_cents: number | null
          currency: string
          booking_mode: 'instant' | 'request'
          buffer_minutes: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          name: string
          description?: string | null
          duration_minutes?: number
          price_cents?: number | null
          currency?: string
          booking_mode?: 'instant' | 'request'
          buffer_minutes?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price_cents?: number | null
          currency?: string
          booking_mode?: 'instant' | 'request'
          buffer_minutes?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      availability: {
        Row: {
          id: string
          provider_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_active?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          provider_id: string
          service_id: string
          client_name: string
          client_email: string
          client_phone: string | null
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          google_event_id: string | null
          notes: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          management_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          service_id: string
          client_name: string
          client_email: string
          client_phone?: string | null
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          google_event_id?: string | null
          notes?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          management_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          service_id?: string
          client_name?: string
          client_email?: string
          client_phone?: string | null
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          google_event_id?: string | null
          notes?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          management_token?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

export type Provider = Database['public']['Tables']['providers']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']

export type InsertProvider = Database['public']['Tables']['providers']['Insert']
export type InsertService = Database['public']['Tables']['services']['Insert']
export type InsertAvailability = Database['public']['Tables']['availability']['Insert']
export type InsertBooking = Database['public']['Tables']['bookings']['Insert']

export type UpdateProvider = Database['public']['Tables']['providers']['Update']
export type UpdateService = Database['public']['Tables']['services']['Update']
export type UpdateAvailability = Database['public']['Tables']['availability']['Update']
export type UpdateBooking = Database['public']['Tables']['bookings']['Update']
