CREATE TABLE public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  rows JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.report_snapshots TO authenticated;
GRANT ALL ON public.report_snapshots TO service_role;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only owner can view report snapshots" ON public.report_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_report_snapshots_updated_at BEFORE UPDATE ON public.report_snapshots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
