# penciled.fyi

A beautifully designed booking tool where providers set their availability, clients book appointments, and everyone gets notified. Simpler than Acuity, warmer than Calendly.

## Features

- **Simple Booking Flow**: Clients can book appointments without creating an account
- **Flexible Availability**: Providers set their weekly schedule with custom availability windows
- **Two Booking Modes**: Instant confirmation or approval-required bookings
- **Email Notifications**: Automated emails for confirmations, reminders, and cancellations
- **Google Calendar Sync**: Automatically add bookings to your Google Calendar
- **Mobile-Friendly**: Responsive design works on all devices
- **Client Self-Service**: Clients can reschedule or cancel via secure links

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (Google OAuth + Magic Link)
- **Email**: [Resend](https://resend.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Analytics**: [Plausible](https://plausible.io/) (privacy-friendly)
- **Deployment**: [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Resend account
- Google Cloud Console project (for OAuth and Calendar)

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/penciled.git
   cd penciled
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your environment variables (see [Environment Variables](#environment-variables) below)

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your application URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | Google OAuth callback URL |
| `RESEND_API_KEY` | Yes | Resend API key |
| `CRON_SECRET` | Prod | Secret for cron job authentication |
| `ERROR_WEBHOOK_URL` | Prod | Discord/Slack webhook for errors |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis auth token |

## Database Setup

### Supabase Configuration

1. Create a new Supabase project
2. Run the schema migrations (found in `/migrations` folder) in the SQL Editor
3. Enable Row Level Security on all tables
4. Configure Google OAuth in Authentication > Providers

### Required Tables

- `providers` - Service provider profiles
- `services` - Services offered by providers
- `availability` - Weekly availability slots
- `bookings` - Booking records

## Development

### Available Scripts

```bash
# Development
pnpm dev          # Start dev server with hot reload
pnpm build        # Create production build
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Testing
pnpm test         # Run tests in watch mode
pnpm test:run     # Run tests once
pnpm test:coverage # Run tests with coverage report
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Authenticated dashboard routes
│   ├── (public)/          # Public pages (landing, login, etc.)
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase clients
│   ├── validations/      # Zod schemas
│   ├── availability.ts   # Availability logic
│   ├── email.ts          # Email templates
│   ├── rate-limit.ts     # Rate limiting
│   └── error-logger.ts   # Error logging
├── test/                  # Test setup
│   └── mocks/            # MSW handlers
└── types/                 # TypeScript types
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/bookings` | POST | Create a new booking |
| `/api/bookings/[id]/cancel` | POST | Cancel a booking (client) |
| `/api/bookings/[id]/reschedule` | POST | Reschedule a booking |
| `/api/bookings/[id]/approve` | POST | Approve pending booking (provider) |
| `/api/bookings/[id]/decline` | POST | Decline pending booking (provider) |
| `/api/bookings/[id]/complete` | POST | Mark booking complete (provider) |
| `/api/bookings/[id]/provider-cancel` | POST | Cancel booking (provider) |
| `/api/cron/reminders` | GET | Send reminder emails (cron) |

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Cron Jobs

The reminder system requires a cron job to run hourly. This is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

For non-Vercel deployments, set up an external cron service to call:
```
GET https://your-domain.com/api/cron/reminders
Authorization: Bearer YOUR_CRON_SECRET
```

## Security

- **Rate Limiting**: All public endpoints are rate-limited
- **Input Validation**: Zod schemas validate all inputs
- **RLS Policies**: Database uses Row Level Security
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Token-Based Access**: Secure management tokens for clients

## Testing

We use Vitest for unit and integration tests:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

Test files are located alongside their source files with `.test.ts` extension.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code patterns
- Run `pnpm lint` before committing
- Write tests for new features

## License

This project is proprietary software. All rights reserved.

## Support

- Email: support@penciled.fyi
- Issues: [GitHub Issues](https://github.com/your-username/penciled/issues)

