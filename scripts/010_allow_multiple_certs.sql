-- Allow multiple active certificates per (student_id, template_id)

-- Drop conditional unique index if it exists
drop index if exists certificates_student_template_unique;

-- Keep certificate_number unique to ensure verification uniqueness

comment on index certificates_number_idx is 'Certificate number must remain unique for verification URLs.';


