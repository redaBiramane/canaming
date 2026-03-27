
-- Notifications table for real-time user notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Any authenticated user can insert notifications (needed when admin creates notifs for users)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Function to get admin user IDs (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin';
$$;

-- Enable Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
