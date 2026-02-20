
-- Create audit_logs table for security event tracking
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  user_id uuid,
  ip_address text,
  request_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff can read audit logs
CREATE POLICY "Staff can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_staff(auth.uid()));

-- System/service_role can insert (edge functions use service_role key)
-- Public INSERT policy so edge functions using service_role can insert
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE allowed

-- Index for common queries
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
