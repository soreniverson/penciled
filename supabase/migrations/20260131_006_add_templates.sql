-- Migration: Add meeting templates support

-- Meeting templates table
CREATE TABLE meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agenda TEXT,
  pre_meeting_notes TEXT,
  post_meeting_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link meetings to templates
ALTER TABLE meetings ADD COLUMN template_id UUID REFERENCES meeting_templates(id);

-- Add agenda and notes to bookings
ALTER TABLE bookings ADD COLUMN agenda TEXT;
ALTER TABLE bookings ADD COLUMN pre_meeting_notes TEXT;

-- RLS for meeting_templates
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own templates" ON meeting_templates
  FOR ALL USING (auth.uid() = provider_id);

-- Indexes
CREATE INDEX idx_meeting_templates_provider ON meeting_templates(provider_id);
CREATE INDEX idx_meeting_templates_active ON meeting_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_meetings_template ON meetings(template_id) WHERE template_id IS NOT NULL;

-- Update trigger
CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON meeting_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
