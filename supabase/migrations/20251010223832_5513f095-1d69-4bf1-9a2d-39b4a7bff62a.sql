-- ============================================
-- VERSIONED SUBSCRIPTION SYSTEM
-- ============================================

-- ============================================
-- 1. CREATE ENUM TYPES
-- ============================================

CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE contract_type AS ENUM ('in_person', 'remote');
CREATE TYPE contract_status AS ENUM ('pending', 'signed', 'rejected');
CREATE TYPE location_type AS ENUM ('saint-barthelemy', 'saint-martin', 'sint-maarten', 'other');

-- ============================================
-- 2. CREATE STAFF USERS TABLE
-- ============================================

CREATE TABLE public.staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. CREATE CORE TABLES
-- ============================================

-- Subscribers (main customer records)
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cell_phone TEXT NOT NULL,
  landline_phone TEXT,
  company_name TEXT,
  accommodation_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  accepts_marketing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_email TEXT REFERENCES public.staff_users(email)
);

-- Subscriptions (master subscription record)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  location location_type NOT NULL,
  current_version_id UUID, -- FK added later after subscription_versions table exists
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_email TEXT REFERENCES public.staff_users(email),
  CONSTRAINT unique_subscriber_location UNIQUE(subscriber_id, location)
);

-- Subscription Versions (version history)
CREATE TABLE public.subscription_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Plan and pricing
  plan_id TEXT NOT NULL,
  additional_screens INTEGER DEFAULT 0 CHECK (additional_screens >= 0 AND additional_screens <= 3),
  
  -- Pricing snapshot (locked at version creation time)
  monthly_base_price DECIMAL(10,2) NOT NULL,
  monthly_addons_price DECIMAL(10,2) DEFAULT 0,
  monthly_screens_price DECIMAL(10,2) DEFAULT 0,
  monthly_total_price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('EUR', 'USD')),
  
  -- Contract timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER NOT NULL,
  is_contract_reset BOOLEAN DEFAULT false,
  
  -- Status and metadata
  status subscription_status DEFAULT 'active',
  change_reason TEXT,
  is_superseded BOOLEAN DEFAULT false,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_email TEXT REFERENCES public.staff_users(email),
  
  CONSTRAINT unique_subscription_version UNIQUE(subscription_id, version_number),
  CONSTRAINT check_dates CHECK (end_date > start_date),
  CONSTRAINT check_duration CHECK (duration_months > 0)
);

-- Now add the FK from subscriptions to subscription_versions
ALTER TABLE public.subscriptions 
  ADD CONSTRAINT fk_current_version 
  FOREIGN KEY (current_version_id) 
  REFERENCES public.subscription_versions(id);

-- Subscription Version Addons
CREATE TABLE public.subscription_version_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.subscription_versions(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL,
  addon_name TEXT NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Managers (optional manager info per subscription)
CREATE TABLE public.managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL UNIQUE REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  cell_phone TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial Managers (optional financial manager info)
CREATE TABLE public.financial_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL UNIQUE REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  cell_phone TEXT,
  landline_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery Addresses (optional delivery info)
CREATE TABLE public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL UNIQUE REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  cell_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contracts (contract signing tracking)
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL UNIQUE REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  contract_type contract_type NOT NULL,
  status contract_status DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  signature_method TEXT,
  contract_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_subscriptions_subscriber ON public.subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_current_version ON public.subscriptions(current_version_id);
CREATE INDEX idx_subscription_versions_subscription ON public.subscription_versions(subscription_id);
CREATE INDEX idx_subscription_versions_dates ON public.subscription_versions(start_date, end_date);
CREATE INDEX idx_subscription_versions_status ON public.subscription_versions(status);
CREATE INDEX idx_subscription_version_addons_version ON public.subscription_version_addons(version_id);

-- ============================================
-- 5. CREATE TRIGGERS & FUNCTIONS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_subscribers_updated_at BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_managers_updated_at BEFORE UPDATE ON public.managers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_managers_updated_at BEFORE UPDATE ON public.financial_managers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_addresses_updated_at BEFORE UPDATE ON public.delivery_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON public.staff_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-supersede previous version when new version is created
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_supersede_on_new_version
  AFTER INSERT ON public.subscription_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.supersede_previous_version();

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Get current active version
CREATE OR REPLACE FUNCTION public.get_current_version(p_subscription_id UUID)
RETURNS public.subscription_versions AS $$
  SELECT * FROM public.subscription_versions
  WHERE subscription_id = p_subscription_id
    AND is_superseded = false
  ORDER BY version_number DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Get version at specific date
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
$$ LANGUAGE sql STABLE;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_version_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access (open for now, can be tightened with authentication)
CREATE POLICY "Staff can access all staff_users" ON public.staff_users FOR ALL USING (true);
CREATE POLICY "Staff can access all subscribers" ON public.subscribers FOR ALL USING (true);
CREATE POLICY "Staff can access all subscriptions" ON public.subscriptions FOR ALL USING (true);
CREATE POLICY "Staff can access all versions" ON public.subscription_versions FOR ALL USING (true);
CREATE POLICY "Staff can access all addons" ON public.subscription_version_addons FOR ALL USING (true);
CREATE POLICY "Staff can access all managers" ON public.managers FOR ALL USING (true);
CREATE POLICY "Staff can access all financial_managers" ON public.financial_managers FOR ALL USING (true);
CREATE POLICY "Staff can access all delivery_addresses" ON public.delivery_addresses FOR ALL USING (true);
CREATE POLICY "Staff can access all contracts" ON public.contracts FOR ALL USING (true);