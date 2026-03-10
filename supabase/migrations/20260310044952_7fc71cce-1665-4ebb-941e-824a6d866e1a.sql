ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS dna_source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS extraction_quality text DEFAULT 'manual';