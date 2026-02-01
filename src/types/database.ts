export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Delegate permission structure
export type DelegatePermissions = {
  view: boolean
  book: boolean
  reschedule: boolean
  cancel: boolean
  override_availability: boolean
  override_conflicts: boolean
}

export type Database = {
  public: {
    Tables: {
      delegates: {
        Row: {
          id: string
          principal_id: string
          delegate_id: string
          permissions: DelegatePermissions
          created_at: string
          updated_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          principal_id: string
          delegate_id: string
          permissions?: DelegatePermissions
          created_at?: string
          updated_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          principal_id?: string
          delegate_id?: string
          permissions?: DelegatePermissions
          created_at?: string
          updated_at?: string
          expires_at?: string | null
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
          zoom_token: Json | null
          zoom_user_id: string | null
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
          zoom_token?: Json | null
          zoom_user_id?: string | null
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
          zoom_token?: Json | null
          zoom_user_id?: string | null
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
          video_platform: 'google_meet' | 'zoom' | 'none' | 'auto'
          template_id: string | null
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
          video_platform?: 'google_meet' | 'zoom' | 'none' | 'auto'
          template_id?: string | null
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
          video_platform?: 'google_meet' | 'zoom' | 'none' | 'auto'
          template_id?: string | null
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
          // Provider reschedule tracking
          rescheduled_by: string | null
          rescheduled_at: string | null
          // Override tracking
          availability_override: boolean
          override_approved_by: string | null
          override_reason: string | null
          conflict_override: boolean
          // Video platform
          video_platform: string | null
          zoom_meeting_id: string | null
          // Meeting template data
          agenda: string | null
          pre_meeting_notes: string | null
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
          rescheduled_by?: string | null
          rescheduled_at?: string | null
          availability_override?: boolean
          override_approved_by?: string | null
          override_reason?: string | null
          conflict_override?: boolean
          video_platform?: string | null
          zoom_meeting_id?: string | null
          agenda?: string | null
          pre_meeting_notes?: string | null
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
          rescheduled_by?: string | null
          rescheduled_at?: string | null
          availability_override?: boolean
          override_approved_by?: string | null
          override_reason?: string | null
          conflict_override?: boolean
          video_platform?: string | null
          zoom_meeting_id?: string | null
          agenda?: string | null
          pre_meeting_notes?: string | null
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
          min_required_members: number | null
          resource_pool_id: string | null
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
          min_required_members?: number | null
          resource_pool_id?: string | null
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
          min_required_members?: number | null
          resource_pool_id?: string | null
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
      booking_assignments: {
        Row: {
          id: string
          booking_id: string
          provider_id: string
          assigned_at: string
          assignment_reason: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          provider_id: string
          assigned_at?: string
          assignment_reason?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          provider_id?: string
          assigned_at?: string
          assignment_reason?: string | null
        }
      }
      resource_pools: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          pool_type: 'round_robin' | 'load_balanced' | 'priority'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          pool_type?: 'round_robin' | 'load_balanced' | 'priority'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          pool_type?: 'round_robin' | 'load_balanced' | 'priority'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      resource_pool_members: {
        Row: {
          id: string
          pool_id: string
          provider_id: string
          priority: number
          max_bookings_per_day: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pool_id: string
          provider_id: string
          priority?: number
          max_bookings_per_day?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          pool_id?: string
          provider_id?: string
          priority?: number
          max_bookings_per_day?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
      meeting_templates: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string | null
          agenda: string | null
          pre_meeting_notes: string | null
          post_meeting_notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          name: string
          description?: string | null
          agenda?: string | null
          pre_meeting_notes?: string | null
          post_meeting_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          name?: string
          description?: string | null
          agenda?: string | null
          pre_meeting_notes?: string | null
          post_meeting_notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      follow_up_templates: {
        Row: {
          id: string
          provider_id: string
          name: string
          type: 'email' | 'feedback_request'
          delay_minutes: number
          subject: string | null
          content: Json
          apply_to_meetings: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          name: string
          type: 'email' | 'feedback_request'
          delay_minutes?: number
          subject?: string | null
          content: Json
          apply_to_meetings?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          name?: string
          type?: 'email' | 'feedback_request'
          delay_minutes?: number
          subject?: string | null
          content?: Json
          apply_to_meetings?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      follow_ups: {
        Row: {
          id: string
          booking_id: string
          template_id: string | null
          provider_id: string
          type: 'email' | 'feedback_request'
          status: 'pending' | 'sent' | 'cancelled' | 'failed'
          scheduled_for: string
          subject: string | null
          content: Json | null
          sent_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          template_id?: string | null
          provider_id: string
          type: 'email' | 'feedback_request'
          status?: 'pending' | 'sent' | 'cancelled' | 'failed'
          scheduled_for: string
          subject?: string | null
          content?: Json | null
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          template_id?: string | null
          provider_id?: string
          type?: 'email' | 'feedback_request'
          status?: 'pending' | 'sent' | 'cancelled' | 'failed'
          scheduled_for?: string
          subject?: string | null
          content?: Json | null
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
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
export type Delegate = Database['public']['Tables']['delegates']['Row']
export type BookingAssignment = Database['public']['Tables']['booking_assignments']['Row']
export type ResourcePool = Database['public']['Tables']['resource_pools']['Row']
export type ResourcePoolMember = Database['public']['Tables']['resource_pool_members']['Row']
export type MeetingTemplate = Database['public']['Tables']['meeting_templates']['Row']
export type FollowUpTemplate = Database['public']['Tables']['follow_up_templates']['Row']
export type FollowUp = Database['public']['Tables']['follow_ups']['Row']

export type InsertProvider = Database['public']['Tables']['providers']['Insert']
export type InsertMeeting = Database['public']['Tables']['meetings']['Insert']
export type InsertAvailability = Database['public']['Tables']['availability']['Insert']
export type InsertBooking = Database['public']['Tables']['bookings']['Insert']
export type InsertBlackoutDate = Database['public']['Tables']['blackout_dates']['Insert']
export type InsertBookingLink = Database['public']['Tables']['booking_links']['Insert']
export type InsertBookingLinkMember = Database['public']['Tables']['booking_link_members']['Insert']
export type InsertBookingLinkMeeting = Database['public']['Tables']['booking_link_meetings']['Insert']
export type InsertDelegate = Database['public']['Tables']['delegates']['Insert']
export type InsertBookingAssignment = Database['public']['Tables']['booking_assignments']['Insert']
export type InsertResourcePool = Database['public']['Tables']['resource_pools']['Insert']
export type InsertResourcePoolMember = Database['public']['Tables']['resource_pool_members']['Insert']
export type InsertMeetingTemplate = Database['public']['Tables']['meeting_templates']['Insert']
export type InsertFollowUpTemplate = Database['public']['Tables']['follow_up_templates']['Insert']
export type InsertFollowUp = Database['public']['Tables']['follow_ups']['Insert']

export type UpdateProvider = Database['public']['Tables']['providers']['Update']
export type UpdateMeeting = Database['public']['Tables']['meetings']['Update']
export type UpdateAvailability = Database['public']['Tables']['availability']['Update']
export type UpdateBooking = Database['public']['Tables']['bookings']['Update']
export type UpdateBlackoutDate = Database['public']['Tables']['blackout_dates']['Update']
export type UpdateBookingLink = Database['public']['Tables']['booking_links']['Update']
export type UpdateDelegate = Database['public']['Tables']['delegates']['Update']
export type UpdateResourcePool = Database['public']['Tables']['resource_pools']['Update']
export type UpdateResourcePoolMember = Database['public']['Tables']['resource_pool_members']['Update']
export type UpdateMeetingTemplate = Database['public']['Tables']['meeting_templates']['Update']
export type UpdateFollowUpTemplate = Database['public']['Tables']['follow_up_templates']['Update']
export type UpdateFollowUp = Database['public']['Tables']['follow_ups']['Update']

// Backward compatibility aliases (deprecated - use Meeting instead)
export type Service = Meeting
export type InsertService = InsertMeeting
export type UpdateService = UpdateMeeting
export type BookingLinkService = BookingLinkMeeting
export type InsertBookingLinkService = InsertBookingLinkMeeting
