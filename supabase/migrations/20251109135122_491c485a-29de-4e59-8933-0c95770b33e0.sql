-- Add SignNow document tracking columns to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS signnow_document_id text,
ADD COLUMN IF NOT EXISTS signnow_link text;