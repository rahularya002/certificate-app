-- Add design column to templates for pdfme JSON design
alter table public.templates add column if not exists design jsonb;

-- Optional index if you query by presence of design
create index if not exists templates_design_exists_idx on public.templates ((design is not null));
