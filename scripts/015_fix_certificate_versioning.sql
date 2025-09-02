-- Fix certificate versioning for regeneration support
-- This migration handles the certificate_version column and constraints properly

-- First, check if certificate_version column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'certificates' 
        AND column_name = 'certificate_version'
    ) THEN
        ALTER TABLE public.certificates ADD COLUMN certificate_version integer DEFAULT 1;
    END IF;
END $$;

-- Drop the problematic unique constraint if it exists
DROP INDEX IF EXISTS certificates_student_template_version_unique;

-- Drop the old unique constraint on student_id, template_id
DROP INDEX IF EXISTS certificates_student_template_unique;

-- Create a new approach: allow multiple certificates per student/template
-- but ensure each has a unique certificate_number
-- We'll use certificate_number as the unique identifier instead

-- Create a unique constraint on certificate_number (this will be dropped by the other migration)
-- But first, let's ensure we don't have duplicates
UPDATE public.certificates 
SET certificate_number = certificate_number || '_' || id::text 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY certificate_number ORDER BY issued_at) as rn
        FROM public.certificates
    ) t WHERE rn > 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS certificates_student_template_lookup 
  ON public.certificates(student_id, template_id, issued_at DESC) 
  WHERE is_revoked = false;

CREATE INDEX IF NOT EXISTS certificates_certificate_number_idx 
  ON public.certificates(certificate_number);

-- Add comments
COMMENT ON COLUMN public.certificates.certificate_version IS 'Certificate version number for regeneration tracking';
COMMENT ON TABLE public.certificates IS 'Certificates table - allows regeneration by creating new records with unique certificate numbers';

