-- Migration v11: Add vendor verification
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
