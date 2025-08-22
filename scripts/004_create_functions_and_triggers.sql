-- Function to generate certificate numbers
create or replace function generate_certificate_number()
returns text
language plpgsql
as $$
declare
  cert_number text;
  year_suffix text;
begin
  -- Generate year suffix (e.g., "24" for 2024)
  year_suffix := to_char(now(), 'YY');
  
  -- Generate certificate number with format: CERT-YY-XXXXXX
  cert_number := 'CERT-' || year_suffix || '-' || 
                 lpad((
                   select coalesce(max(
                     cast(split_part(certificate_number, '-', 3) as integer)
                   ), 0) + 1
                   from public.certificates 
                   where certificate_number like 'CERT-' || year_suffix || '-%'
                 )::text, 6, '0');
  
  return cert_number;
end;
$$;

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at columns
drop trigger if exists update_students_updated_at on public.students;
create trigger update_students_updated_at
  before update on public.students
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_templates_updated_at on public.templates;
create trigger update_templates_updated_at
  before update on public.templates
  for each row
  execute function update_updated_at_column();

-- Function to generate QR code data
create or replace function generate_qr_code_data(
  student_name text,
  roll_number text,
  course text,
  completion_date date,
  certificate_number text
)
returns text
language plpgsql
as $$
begin
  return json_build_object(
    'name', student_name,
    'rollNumber', roll_number,
    'course', course,
    'completionDate', completion_date,
    'certificateNumber', certificate_number,
    'issuedAt', now(),
    'verifyUrl', 'https://your-domain.com/verify/' || certificate_number
  )::text;
end;
$$;
