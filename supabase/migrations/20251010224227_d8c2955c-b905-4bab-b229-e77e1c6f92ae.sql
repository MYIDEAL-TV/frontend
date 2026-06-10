-- Fix function search path security warnings

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Fix supersede_previous_version function
CREATE OR REPLACE FUNCTION public.supersede_previous_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous versions as superseded
  UPDATE public.subscription_versions
  SET is_superseded = true
  WHERE subscription_id = NEW.subscription_id
    AND id != NEW.id
    AND version_number < NEW.version_number;
  
  -- Update the subscription's current_version_id
  UPDATE public.subscriptions
  SET current_version_id = NEW.id
  WHERE id = NEW.subscription_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Fix get_current_version function
CREATE OR REPLACE FUNCTION public.get_current_version(p_subscription_id UUID)
RETURNS public.subscription_versions AS $$
  SELECT * FROM public.subscription_versions
  WHERE subscription_id = p_subscription_id
    AND is_superseded = false
  ORDER BY version_number DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public;

-- Fix get_version_at_date function
CREATE OR REPLACE FUNCTION public.get_version_at_date(
  p_subscription_id UUID,
  p_date DATE
)
RETURNS public.subscription_versions AS $$
  SELECT * FROM public.subscription_versions
  WHERE subscription_id = p_subscription_id
    AND start_date <= p_date
    AND end_date >= p_date
  ORDER BY version_number DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public;