-- Add file_name column to certificates table
alter table public.certificates 
add column if not exists file_name text;

-- Add index for file_name lookups
create index if not exists certificates_file_name_idx on public.certificates(file_name);
