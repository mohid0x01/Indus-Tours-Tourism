-- Pricing rules for dynamic pricing engine
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'seasonal',
  name text NOT NULL,
  discount_percent numeric DEFAULT 0,
  surcharge_percent numeric DEFAULT 0,
  min_group_size integer,
  max_group_size integer,
  start_date date,
  end_date date,
  days_before_travel integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing_rules" ON public.pricing_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active pricing_rules" ON public.pricing_rules
  FOR SELECT USING (is_active = true);

-- Review photos table
CREATE TABLE public.review_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid REFERENCES public.feedback(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view review photos" ON public.review_photos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload review photos" ON public.review_photos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage review photos" ON public.review_photos
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for review photos
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

CREATE POLICY "Anyone can view review photos storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

CREATE POLICY "Authenticated can upload review photos storage" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-photos');

-- Enable realtime for pricing_rules
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_rules;