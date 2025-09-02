-- Fix certificates table unique constraint for easier upsert operations
-- This allows regeneration of certificates for the same student/template combination

-- Drop the existing partial unique index
drop index if exists certificates_student_template_unique;

-- Create a new unique constraint that allows regeneration
-- We'll use certificate_number as the unique identifier instead
-- This allows multiple certificates per student/template but with different numbers

-- Add a new column to track certificate version/iteration
alter table public.certificates 
add column if not exists certificate_version integer default 1;

-- Create a unique constraint on student_id, template_id, and certificate_version
create unique index if not exists certificates_student_template_version_unique 
  on public.certificates(student_id, template_id, certificate_version) 
  where is_revoked = false;

-- Create an index for faster lookups by student and template
create index if not exists certificates_student_template_lookup 
  on public.certificates(student_id, template_id, issued_at desc) 
  where is_revoked = false;

-- Add a comment explaining the regeneration logic
comment on table public.certificates is 'Certificates table - allows regeneration by creating new versions';
