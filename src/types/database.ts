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
      allowed_emails: {
        Row: {
          id: string
          email: string
          added_at: string
        }
        Insert: {
          id?: string
          email: string
          added_at?: string
        }
        Update: {
          id?: string
          email?: string
          added_at?: string
        }
      }
      providers: {
        Row: {
          id: string
          email: string
          name: string | null
          business_name: string | null
          business_category: string | null
          timezone: string
          avatar_url: string | null
          logo_url: string | null
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
          logo_url?: string | null
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
          logo_url?: string | null
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
      meetings: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string | null
          duration_minutes: number
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
          meeting_id: string
          client_name: string
          client_email: string
          client_phone: string | null
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          google_event_id: string | null
          meeting_link: string | null
          notes: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          management_token: string | null
          booking_link_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          meeting_id: string
          client_name: string
          client_email: string
          client_phone?: string | null
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          google_event_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          management_token?: string | null
          booking_link_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          meeting_id?: string
          client_name?: string
          client_email?: string
          client_phone?: string | null
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          google_event_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          management_token?: string | null
          booking_link_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blackout_dates: {
        Row: {
          id: string
          provider_id: string
          start_date: string
          end_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          start_date: string
          end_date: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          start_date?: string
          end_date?: string
          reason?: string | null
          created_at?: string
        }
      }
      booking_links: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      booking_link_members: {
        Row: {
          id: string
          booking_link_id: string
          provider_id: string
          is_required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          booking_link_id: string
          provider_id: string
          is_required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          booking_link_id?: string
          provider_id?: string
          is_required?: boolean
          created_at?: string
        }
      }
      booking_link_meetings: {
        Row: {
          id: string
          booking_link_id: string
          meeting_id: string
        }
        Insert: {
          id?: string
          booking_link_id: string
          meeting_id: string
        }
        Update: {
          id?: string
          booking_link_id?: string
          meeting_id?: string
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
export type Meeting = Database['public']['Tables']['meetings']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type BlackoutDate = Database['public']['Tables']['blackout_dates']['Row']
export type BookingLink = Database['public']['Tables']['booking_links']['Row']
export type BookingLinkMember = Database['public']['Tables']['booking_link_members']['Row']
export type BookingLinkMeeting = Database['public']['Tables']['booking_link_meetings']['Row']

export type InsertProvider = Database['public']['Tables']['providers']['Insert']
export type InsertMeeting = Database['public']['Tables']['meetings']['Insert']
export type InsertAvailability = Database['public']['Tables']['availability']['Insert']
export type InsertBooking = Database['public']['Tables']['bookings']['Insert']
export type InsertBlackoutDate = Database['public']['Tables']['blackout_dates']['Insert']
export type InsertBookingLink = Database['public']['Tables']['booking_links']['Insert']
export type InsertBookingLinkMember = Database['public']['Tables']['booking_link_members']['Insert']
export type InsertBookingLinkMeeting = Database['public']['Tables']['booking_link_meetings']['Insert']

export type UpdateProvider = Database['public']['Tables']['providers']['Update']
export type UpdateMeeting = Database['public']['Tables']['meetings']['Update']
export type UpdateAvailability = Database['public']['Tables']['availability']['Update']
export type UpdateBooking = Database['public']['Tables']['bookings']['Update']
export type UpdateBlackoutDate = Database['public']['Tables']['blackout_dates']['Update']
export type UpdateBookingLink = Database['public']['Tables']['booking_links']['Update']

// Backward compatibility aliases (deprecated - use Meeting instead)
export type Service = Meeting
export type InsertService = InsertMeeting
export type UpdateService = UpdateMeeting
export type BookingLinkService = BookingLinkMeeting
export type InsertBookingLinkService = InsertBookingLinkMeeting
