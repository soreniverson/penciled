import { http, HttpResponse } from 'msw'

// Mock Supabase API responses
export const handlers = [
  // Mock booking creation
  http.post('*/rest/v1/bookings', () => {
    return HttpResponse.json({
      id: 'test-booking-id',
      management_token: 'test-token-123',
    })
  }),

  // Mock service lookup
  http.get('*/rest/v1/services', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json([
      {
        id: 'test-service-id',
        name: 'Test Service',
        duration_minutes: 60,
        buffer_minutes: 15,
        booking_mode: 'instant',
      },
    ])
  }),

  // Mock provider lookup
  http.get('*/rest/v1/providers', () => {
    return HttpResponse.json([
      {
        id: 'test-provider-id',
        name: 'Test Provider',
        business_name: 'Test Business',
        email: 'provider@test.com',
        timezone: 'America/New_York',
      },
    ])
  }),

  // Mock booking conflicts check
  http.get('*/rest/v1/bookings*', ({ request }) => {
    const url = new URL(request.url)
    // Return empty array (no conflicts) by default
    return HttpResponse.json([])
  }),

  // Mock availability rules
  http.get('*/rest/v1/availability', () => {
    return HttpResponse.json([
      {
        id: 'test-availability-id',
        provider_id: 'test-provider-id',
        day_of_week: 1, // Monday
        start_time: '09:00:00',
        end_time: '17:00:00',
      },
      {
        id: 'test-availability-id-2',
        provider_id: 'test-provider-id',
        day_of_week: 2, // Tuesday
        start_time: '09:00:00',
        end_time: '17:00:00',
      },
    ])
  }),
]
