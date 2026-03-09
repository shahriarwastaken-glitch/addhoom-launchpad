
-- Add new columns to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS brand_colors jsonb DEFAULT '[]';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS brand_fonts jsonb DEFAULT '{}';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS brand_logo_url text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS niche_tags text[] DEFAULT '{}';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS style_preferences jsonb DEFAULT '{}';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS competitor_urls text[] DEFAULT '{}';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS dna_score integer DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS scrape_data jsonb DEFAULT '{}';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS dna_last_updated timestamptz;

-- Create workspace_products table
CREATE TABLE workspace_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price_bdt integer,
  original_price_bdt integer,
  images jsonb DEFAULT '[]',
  primary_image_url text,
  category text,
  tags text[] DEFAULT '{}',
  source_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  ads_generated_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON workspace_products(workspace_id);
CREATE INDEX ON workspace_products(workspace_id, is_active);

ALTER TABLE workspace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own products"
  ON workspace_products FOR ALL
  TO authenticated
  USING (auth.uid() = workspace_owner_id(workspace_id))
  WITH CHECK (auth.uid() = workspace_owner_id(workspace_id));

-- Create style_templates table
CREATE TABLE style_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  style_tags text[] NOT NULL,
  thumbnail_url text,
  example_ad_url text,
  industry_relevance text[],
  platform_fit text[],
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0
);

ALTER TABLE style_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active style templates"
  ON style_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage style templates"
  ON style_templates FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
