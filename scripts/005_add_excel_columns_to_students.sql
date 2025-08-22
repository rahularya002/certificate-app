-- Add specific columns for Excel data format
-- Adding columns for: Salutation, Guardian Type, Name of Father-Husband, Adhaar, 
-- Training Center, District, State, Assessment Partner, Certificate Number

alter table public.students 
add column if not exists salutation text,
add column if not exists guardian_type text,
add column if not exists father_husband_name text,
add column if not exists adhaar text,
add column if not exists training_center text,
add column if not exists district text,
add column if not exists state text,
add column if not exists assessment_partner text,
add column if not exists certificate_number text;

-- Create indexes for commonly searched fields
create index if not exists students_certificate_number_idx on public.students(certificate_number);
create index if not exists students_district_idx on public.students(district);
create index if not exists students_state_idx on public.students(state);
create index if not exists students_training_center_idx on public.students(training_center);

-- Update the updated_at timestamp function if it doesn't exist
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at if it doesn't exist
drop trigger if exists update_students_updated_at on public.students;
create trigger update_students_updated_at
  before update on public.students
  for each row
  execute function update_updated_at_column();
