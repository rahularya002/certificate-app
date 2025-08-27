-- Add missing columns to certificates table for new student schema
-- This migration adds columns needed for the updated certificate generation

-- Add enrollment_number column
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS enrollment_number text;

-- Add date_of_issuance column  
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS date_of_issuance timestamp with time zone;

-- Add file_name column (if not already added)
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS file_name text;

-- Create index on enrollment_number for faster lookups
CREATE INDEX IF NOT EXISTS certificates_enrollment_number_idx 
ON public.certificates(enrollment_number);

-- Create index on date_of_issuance for faster lookups
CREATE INDEX IF NOT EXISTS certificates_date_of_issuance_idx 
ON public.certificates(date_of_issuance);

-- Update existing records to have default values
UPDATE public.certificates 
SET date_of_issuance = issued_at 
WHERE date_of_issuance IS NULL;

-- Make sure the table has the latest structure
COMMENT ON TABLE public.certificates IS 'Updated certificates table with new student schema fields';
