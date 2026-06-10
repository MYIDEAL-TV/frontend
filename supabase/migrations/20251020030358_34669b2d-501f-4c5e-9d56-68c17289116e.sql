-- Add submitted_at to contracts table to track when contract was sent to customer
ALTER TABLE public.contracts 
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;

-- Add contract_signed_date to subscription_versions to link signature date to subscription
ALTER TABLE public.subscription_versions 
ADD COLUMN contract_signed_date DATE;

-- Create indexes for better query performance on contract tracking
CREATE INDEX idx_contracts_submitted_at ON public.contracts(submitted_at);
CREATE INDEX idx_contracts_status_submitted ON public.contracts(status, submitted_at);
CREATE INDEX idx_subscription_versions_signed_date ON public.subscription_versions(contract_signed_date);