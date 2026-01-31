-- Migration: Add follow-up automation support

-- Follow-up templates
CREATE TABLE follow_up_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'feedback_request')),
  delay_minutes INTEGER NOT NULL DEFAULT 60,
  subject TEXT, -- Email subject
  content JSONB NOT NULL, -- Email body or feedback form configuration
  apply_to_meetings UUID[], -- If NULL, applies to all meetings
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled follow-ups
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES follow_up_templates(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES providers(id),
  type TEXT NOT NULL CHECK (type IN ('email', 'feedback_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  subject TEXT,
  content JSONB,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for follow_up_templates
ALTER TABLE follow_up_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own follow-up templates" ON follow_up_templates
  FOR ALL USING (auth.uid() = provider_id);

-- RLS for follow_ups
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own follow-ups" ON follow_ups
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Providers can update own follow-ups" ON follow_ups
  FOR UPDATE USING (auth.uid() = provider_id);

-- Anyone can insert follow-ups (needed for booking completion)
CREATE POLICY "Anyone can insert follow-ups" ON follow_ups
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_follow_up_templates_provider ON follow_up_templates(provider_id);
CREATE INDEX idx_follow_up_templates_active ON follow_up_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_follow_ups_booking ON follow_ups(booking_id);
CREATE INDEX idx_follow_ups_provider ON follow_ups(provider_id);
CREATE INDEX idx_follow_ups_scheduled ON follow_ups(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_follow_ups_status ON follow_ups(status);

-- Update trigger
CREATE TRIGGER update_follow_up_templates_updated_at
  BEFORE UPDATE ON follow_up_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
