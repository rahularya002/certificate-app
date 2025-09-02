-- Allow certificate number duplicates for regeneration support
-- This removes the unique constraint on certificate_number since we want to allow regeneration

-- Drop the unique constraint on certificate_number (not the index)
alter table public.certificates 
drop constraint if exists certificates_certificate_number_key;

-- Create a non-unique index for performance instead
create index if not exists certificates_certificate_number_idx 
  on public.certificates(certificate_number);

-- Add a comment explaining the change
comment on column public.certificates.certificate_number is 'Certificate number - not unique to allow regeneration';