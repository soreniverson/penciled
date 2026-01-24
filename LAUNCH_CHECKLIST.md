# Penciled.fyi Launch Checklist

**Last Updated:** January 2026

---

## PHASE 1: CRITICAL BLOCKERS

### 1.1 Environment Configuration

- [x] **Create `.env.example` file** - Template created with all required variables
- [ ] **Set all production environment variables in Vercel**
  - Go to Vercel Dashboard → Project → Settings → Environment Variables
  - Copy values from your `.env.local` to Vercel

### 1.2 Cron Job Setup

- [x] **Create `vercel.json`** - Cron configuration created (hourly reminders)
- [ ] **Verify cron job after deployment**
  ```bash
  curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
    https://penciled.fyi/api/cron/reminders
  ```

### 1.3 Error Monitoring

- [ ] **Set up error webhook**
  - Option A: Discord webhook
    1. Create Discord server/channel
    2. Create webhook: Server Settings → Integrations → Webhooks
    3. Copy webhook URL
    4. Set `ERROR_WEBHOOK_URL` in Vercel env vars

- [ ] **Test error logging**
  - Trigger a test error and verify it appears in webhook channel

### 1.4 Database Migration

- [ ] **Run reminder columns migration**
  - Go to Supabase Dashboard → SQL Editor
  - Run contents of `migrations/add_reminder_columns.sql`
  - Verify columns exist: `reminder_24h_sent`, `reminder_1h_sent`

---

## PHASE 2: SECURITY HARDENING

### 2.1 Secrets Management

- [ ] **Audit all secrets**
  - Verify no secrets in git history
  - Never commit `.env.local` or credentials

### 2.2 Security Headers

- [x] **Content-Security-Policy** - Added to next.config.ts
- [x] **X-XSS-Protection** - Added
- [x] **X-Frame-Options** - SAMEORIGIN
- [x] **X-Content-Type-Options** - nosniff
- [x] **Strict-Transport-Security** - max-age=31536000
- [x] **Referrer-Policy** - origin-when-cross-origin
- [x] **Permissions-Policy** - camera, microphone, geolocation disabled

### 2.3 Rate Limiting

- [x] **Rate limiting implemented** - Memory store with Redis fallback
- [ ] **Configure Upstash Redis for production** (Recommended)
  1. Create Upstash account
  2. Create Redis database
  3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## PHASE 3: EMAIL SYSTEM

### 3.1 Email Configuration

- [x] **FROM email configurable** - Uses `EMAIL_FROM` env var with fallback
- [ ] **Verify Resend domain**
  - Confirm `penciled.fyi` is verified in Resend dashboard
  - Check DNS records (SPF, DKIM, DMARC)

### 3.2 Email Contacts

- [ ] **Create and verify contact email addresses**
  - [ ] `privacy@penciled.fyi`
  - [ ] `legal@penciled.fyi`
  - [ ] `support@penciled.fyi`
  - [ ] `hello@penciled.fyi`

---

## PHASE 4: SEO & DISCOVERABILITY

### 4.1 Basic SEO Files

- [x] **robots.txt** - Created at `public/robots.txt`
- [x] **sitemap.xml** - Created at `public/sitemap.xml`
- [ ] **Verify Plausible Analytics** - Check dashboard for `penciled.fyi`

### 4.2 Structured Data

- [x] **JSON-LD structured data** - Added to layout.tsx:
  - [x] Organization schema
  - [x] WebApplication schema
  - [x] WebSite schema
  - [x] FAQPage schema

### 4.3 Open Graph

- [x] **OG metadata configured** - In layout.tsx
- [ ] **Create OG image** - Design 1200x630px image → Save to `public/og-image.png`

---

## PHASE 5: LEGAL COMPLIANCE

### 5.1 Privacy & Terms

- [ ] **Legal review of privacy policy**
- [ ] **Legal review of terms of service**

### 5.2 Data Protection

- [x] **GDPR data export endpoint** - Created at `/api/user/export`
- [ ] **Document data retention policy**

---

## PHASE 6: TESTING

### 6.1 Current State

- **66 tests passing** across 5 test suites
- Test files:
  - `src/lib/availability.test.ts`
  - `src/lib/validations/booking.test.ts`
  - `src/lib/rate-limit.test.ts`
  - `src/lib/error-logger.test.ts`
  - `src/app/api/bookings/route.test.ts`

### 6.2 Test Commands

```bash
pnpm test          # Run tests in watch mode
pnpm test:run      # Run tests once
pnpm test:coverage # Run with coverage report
```

### 6.3 E2E Testing (Optional)

- [ ] **Set up Playwright** for critical path tests

---

## PHASE 8: PRE-LAUNCH VERIFICATION

### 8.1 Functional Testing

- [ ] **Test complete booking flow**
- [ ] **Test cancellation flow**
- [ ] **Test reschedule flow**
- [ ] **Test approval mode**
- [ ] **Test Google Calendar sync**

### 8.2 Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## PHASE 9: LAUNCH DAY

### 9.1 Pre-Launch

- [ ] Deploy latest code to production
- [ ] Verify all services responding
- [ ] Smoke test critical paths

### 9.2 Launch

- [ ] Monitor error webhook channel
- [ ] Check Plausible for traffic
- [ ] Test with real booking

### 9.3 Post-Launch

- [ ] Daily monitoring review
- [ ] Address critical issues immediately
- [ ] Collect user feedback

---

## Quick Commands

---

## Remaining Tasks (Require Your Action)

1. **Run database migration** in Supabase SQL Editor
2. **Set up error webhook** (Discord/Slack)
3. **Set environment variables** in Vercel
4. **Create email addresses** (privacy@, legal@, etc.)
5. **Create OG image** (1200x630px design)
6. **Get legal review** of privacy/terms
7. **Verify Resend domain** DNS records
8. **Deploy and test** complete flows
