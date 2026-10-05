-- Run once in a NEW Supabase project's SQL Editor.
-- No public policies: browser clients cannot read or write these tables directly.
-- Next.js server routes use a server-only secret key AFTER authorization checks.
BEGIN;
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (length(code) BETWEEN 1 AND 60),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
  category text NOT NULL CHECK (category IN ('Women','Men','Kids','Other')),
  subcategory text NOT NULL,
  price integer CHECK (price >= 0 AND price <= 100000000),
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  stock text NOT NULL CHECK (stock IN ('Available','Limited stock','Out of stock')),
  description text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  flags text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  updated bigint NOT NULL DEFAULT ((extract(epoch from now())*1000)::bigint),
  CHECK (cardinality(images) <= 8),
  CHECK (NOT published OR cardinality(images) > 0)
);
CREATE INDEX products_public_updated ON public.products (published, updated DESC, id);
CREATE INDEX products_images ON public.products USING gin (images);
CREATE TABLE public.settings (
  id text PRIMARY KEY CHECK (id = 'store'),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object')
);
CREATE TABLE public.uploads (
  key text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= 8388608),
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.products,public.settings,public.uploads FROM anon,authenticated;
GRANT ALL ON TABLE public.products,public.settings,public.uploads TO service_role;
COMMIT;
