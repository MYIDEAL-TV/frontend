-- Add custom item columns to subscription_versions table
ALTER TABLE subscription_versions 
ADD COLUMN custom_item_name TEXT,
ADD COLUMN custom_item_price NUMERIC(10,2);