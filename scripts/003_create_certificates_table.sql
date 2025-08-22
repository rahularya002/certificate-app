-- Create certificates table to track issued certificates
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  certificate_number text not null unique,
  qr_code_data text not null,
  file_path text, -- Path to generated certificate in storage
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamp with time zone default now(),
  is_revoked boolean default false,
  revoked_at timestamp with time zone,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_reason text
);

-- Enable RLS for security
alter table public.certificates enable row level security;

-- Create policies for admin access
create policy "certificates_select_authenticated"
  on public.certificates for select
  using (auth.role() = 'authenticated');

create policy "certificates_insert_authenticated"
  on public.certificates for insert
  with check (auth.role() = 'authenticated');

create policy "certificates_update_authenticated"
  on public.certificates for update
  using (auth.role() = 'authenticated');

create policy "certificates_delete_authenticated"
  on public.certificates for delete
  using (auth.role() = 'authenticated');

-- Create indexes for faster lookups
create index if not exists certificates_student_id_idx on public.certificates(student_id);
create index if not exists certificates_template_id_idx on public.certificates(template_id);
create index if not exists certificates_number_idx on public.certificates(certificate_number);
create index if not exists certificates_issued_at_idx on public.certificates(issued_at);
create index if not exists certificates_revoked_idx on public.certificates(is_revoked);

-- Create unique constraint to prevent duplicate certificates
create unique index if not exists certificates_student_template_unique 
  on public.certificates(student_id, template_id) 
  where is_revoked = false;
