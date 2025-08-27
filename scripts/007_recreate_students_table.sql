-- Drop existing students table and recreate with new structure
drop table if exists public.students cascade;

-- Create students table with new structure
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  salutation text,
  candidate_name text not null,
  guardian_type text,
  name_of_father_husband text,
  adhaar text,
  job_role text not null,
  training_center text,
  district text,
  state text,
  assessment_partner text,
  enrollment_number text not null unique,
  certificate_number text,
  date_of_issuance date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for security
alter table public.students enable row level security;

-- Create policies for admin access (authenticated users can manage all students)
create policy "students_select_authenticated"
  on public.students for select
  using (auth.role() = 'authenticated');

create policy "students_insert_authenticated"
  on public.students for insert
  with check (auth.role() = 'authenticated');

create policy "students_update_authenticated"
  on public.students for update
  using (auth.role() = 'authenticated');

create policy "students_delete_authenticated"
  on public.students for delete
  using (auth.role() = 'authenticated');

-- Create indexes for faster lookups
create index if not exists students_enrollment_number_idx on public.students(enrollment_number);
create index if not exists students_job_role_idx on public.students(job_role);
create index if not exists students_date_of_issuance_idx on public.students(date_of_issuance);
create index if not exists students_candidate_name_idx on public.students(candidate_name);
