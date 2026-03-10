ALTER TABLE public.ad_creatives
ADD COLUMN IF NOT EXISTS awareness_stage text,
ADD COLUMN IF NOT EXISTS sophistication_level text,
ADD COLUMN IF NOT EXISTS key_desire_hit text,
ADD COLUMN IF NOT EXISTS target_reader text,
ADD COLUMN IF NOT EXISTS one_idea text,
ADD COLUMN IF NOT EXISTS brief_completeness integer DEFAULT 0;