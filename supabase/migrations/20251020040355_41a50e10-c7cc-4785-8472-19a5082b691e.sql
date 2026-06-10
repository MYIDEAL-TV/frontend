-- Step 1: Add accommodation_name column to subscriptions (nullable initially)
ALTER TABLE public.subscriptions 
ADD COLUMN accommodation_name text;

-- Step 2: Migrate existing data from subscribers to subscriptions
UPDATE public.subscriptions s
SET accommodation_name = sub.accommodation_name
FROM public.subscribers sub
WHERE s.subscriber_id = sub.id;

-- Step 3: Drop the old unique constraint
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS unique_subscriber_location;

-- Step 4: Set default value for any remaining nulls and make NOT NULL
UPDATE public.subscriptions 
SET accommodation_name = 'Default Accommodation'
WHERE accommodation_name IS NULL;

ALTER TABLE public.subscriptions 
ALTER COLUMN accommodation_name SET NOT NULL;

-- Step 5: Create new unique constraint including accommodation
ALTER TABLE public.subscriptions 
ADD CONSTRAINT unique_subscriber_location_accommodation 
UNIQUE (subscriber_id, location, accommodation_name);