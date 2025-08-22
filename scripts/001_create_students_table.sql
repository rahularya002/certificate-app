-- Create students table to store student data from Excel uploads
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roll_number text not null unique,
  course text not null,
  completion_date date not null,
  email text,
  phone text,
  grade text,
  additional_info jsonb default '{}',
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

-- Create index for faster lookups
create index if not exists students_roll_number_idx on public.students(roll_number);
create index if not exists students_course_idx on public.students(course);
create index if not exists students_completion_date_idx on public.students(completion_date);
