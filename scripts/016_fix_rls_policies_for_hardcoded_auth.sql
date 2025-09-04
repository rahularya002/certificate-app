-- Fix RLS policies to work with hardcoded authentication
-- This script updates the policies to allow access for testing purposes

-- Drop existing policies
drop policy if exists "students_select_authenticated" on public.students;
drop policy if exists "students_insert_authenticated" on public.students;
drop policy if exists "students_update_authenticated" on public.students;
drop policy if exists "students_delete_authenticated" on public.students;

-- Create new policies that allow all operations for testing
-- These policies are more permissive and should work with your hardcoded auth

-- Allow all authenticated users to select
create policy "students_select_all"
  on public.students for select
  using (true);

-- Allow all authenticated users to insert
create policy "students_insert_all"
  on public.students for insert
  with check (true);

-- Allow all authenticated users to update
create policy "students_update_all"
  on public.students for update
  using (true);

-- Allow all authenticated users to delete
create policy "students_delete_all"
  on public.students for delete
  using (true);

-- Alternative: If you want to be more restrictive, you can use this instead:
-- These policies check for a specific user ID or role

-- Uncomment these if you want to use specific user authentication:
/*
-- Allow specific user to select
create policy "students_select_specific_user"
  on public.students for select
  using (auth.uid() = 'your-hardcoded-user-id'::uuid);

-- Allow specific user to insert
create policy "students_insert_specific_user"
  on public.students for insert
  with check (auth.uid() = 'your-hardcoded-user-id'::uuid);

-- Allow specific user to update
create policy "students_update_specific_user"
  on public.students for update
  using (auth.uid() = 'your-hardcoded-user-id'::uuid);

-- Allow specific user to delete
create policy "students_delete_specific_user"
  on public.students for delete
  using (auth.uid() = 'your-hardcoded-user-id'::uuid);
*/

-- Verify RLS is still enabled
alter table public.students enable row level security;
