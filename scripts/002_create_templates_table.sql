-- Create templates table to store certificate template metadata
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text not null, -- Path in Supabase Storage
  file_name text not null,
  file_size bigint,
  mime_type text,
  is_active boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for security
alter table public.templates enable row level security;

-- Create policies for admin access
create policy "templates_select_authenticated"
  on public.templates for select
  using (auth.role() = 'authenticated');

create policy "templates_insert_authenticated"
  on public.templates for insert
  with check (auth.role() = 'authenticated');

create policy "templates_update_authenticated"
  on public.templates for update
  using (auth.role() = 'authenticated');

create policy "templates_delete_authenticated"
  on public.templates for delete
  using (auth.role() = 'authenticated');

-- Create index for faster lookups
create index if not exists templates_active_idx on public.templates(is_active);
create index if not exists templates_created_by_idx on public.templates(created_by);
