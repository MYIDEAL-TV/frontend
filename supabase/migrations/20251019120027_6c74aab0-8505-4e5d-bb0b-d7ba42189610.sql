-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'staff',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create staff_profiles to link auth.users with staff_users
CREATE TABLE public.staff_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    staff_user_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (staff_user_id)
);

-- Enable RLS on staff_profiles
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_profiles
CREATE POLICY "Users can view their own profile"
ON public.staff_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.staff_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add staff_user_id to contracts table
ALTER TABLE public.contracts 
ADD COLUMN staff_user_id uuid REFERENCES staff_users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_contracts_staff_user_id ON contracts(staff_user_id);

-- Add comment for documentation
COMMENT ON COLUMN contracts.staff_user_id IS 'ID of the staff user who created this contract';

-- Function to handle new staff user signup
CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id uuid;
BEGIN
  -- Create or get staff_users entry
  INSERT INTO public.staff_users (email, full_name)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name
  RETURNING id INTO v_staff_user_id;
  
  -- Create staff_profiles entry linking auth.users to staff_users
  INSERT INTO public.staff_profiles (id, staff_user_id)
  VALUES (NEW.id, v_staff_user_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign default 'staff' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users for new staff user creation
CREATE TRIGGER on_auth_staff_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_user();

-- Update RLS policies for contracts
DROP POLICY IF EXISTS "Staff can access all contracts" ON contracts;

CREATE POLICY "Authenticated staff can view all contracts"
ON contracts FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create contracts"
ON contracts FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update contracts"
ON contracts FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for subscriptions
DROP POLICY IF EXISTS "Staff can access all subscriptions" ON subscriptions;

CREATE POLICY "Authenticated staff can view all subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create subscriptions"
ON subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update subscriptions"
ON subscriptions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for subscription_versions
DROP POLICY IF EXISTS "Staff can access all versions" ON subscription_versions;

CREATE POLICY "Authenticated staff can view all versions"
ON subscription_versions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create versions"
ON subscription_versions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update versions"
ON subscription_versions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for subscribers
DROP POLICY IF EXISTS "Staff can access all subscribers" ON subscribers;

CREATE POLICY "Authenticated staff can view all subscribers"
ON subscribers FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create subscribers"
ON subscribers FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update subscribers"
ON subscribers FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for managers
DROP POLICY IF EXISTS "Staff can access all managers" ON managers;

CREATE POLICY "Authenticated staff can view all managers"
ON managers FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create managers"
ON managers FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update managers"
ON managers FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for financial_managers
DROP POLICY IF EXISTS "Staff can access all financial_managers" ON financial_managers;

CREATE POLICY "Authenticated staff can view all financial_managers"
ON financial_managers FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create financial_managers"
ON financial_managers FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update financial_managers"
ON financial_managers FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for delivery_addresses
DROP POLICY IF EXISTS "Staff can access all delivery_addresses" ON delivery_addresses;

CREATE POLICY "Authenticated staff can view all delivery_addresses"
ON delivery_addresses FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create delivery_addresses"
ON delivery_addresses FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update delivery_addresses"
ON delivery_addresses FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for staff_users
DROP POLICY IF EXISTS "Staff can access all staff_users" ON staff_users;

CREATE POLICY "Authenticated staff can view all staff_users"
ON staff_users FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create staff_users"
ON staff_users FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update staff_users"
ON staff_users FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- Update RLS policies for subscription_version_addons
DROP POLICY IF EXISTS "Staff can access all addons" ON subscription_version_addons;

CREATE POLICY "Authenticated staff can view all addons"
ON subscription_version_addons FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff') OR
  public.has_role(auth.uid(), 'viewer')
);

CREATE POLICY "Staff can create addons"
ON subscription_version_addons FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update addons"
ON subscription_version_addons FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'staff')
);