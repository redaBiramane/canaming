
-- Table for application-level settings (API keys, configs)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings (needed for IA Naming)
CREATE POLICY "Authenticated users can read settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings  
CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
