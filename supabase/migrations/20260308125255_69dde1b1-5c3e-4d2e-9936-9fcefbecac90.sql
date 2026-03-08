
-- Notifications table for admin-to-user messaging
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_by UUID REFERENCES public.admin_users(id),
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'specific', 'group_has_phone', 'group_plan_pro', 'group_plan_agency', 'group_plan_free'
  target_user_ids UUID[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User notification read status
CREATE TABLE public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can view notifications targeted to them" ON public.notifications FOR SELECT USING (
  target_type = 'all'
  OR (target_type = 'specific' AND auth.uid() = ANY(target_user_ids))
  OR (target_type = 'group_has_phone' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND phone IS NOT NULL AND phone != ''))
  OR (target_type = 'group_plan_pro' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND plan = 'pro'))
  OR (target_type = 'group_plan_agency' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND plan = 'agency'))
  OR (target_type = 'group_plan_free' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND plan = 'free'))
);

-- Policies for notification_reads
CREATE POLICY "Users can insert own reads" ON public.notification_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reads" ON public.notification_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reads" ON public.notification_reads FOR SELECT USING (is_admin(auth.uid()));
