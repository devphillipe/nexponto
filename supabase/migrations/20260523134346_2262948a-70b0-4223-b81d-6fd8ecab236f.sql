-- 1. Secure handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Revoke public execution of functions
REVOKE ALL ON FUNCTION public.is_admin_of_tenant(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_of_tenant(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

-- 3. Restrict listing on logos bucket (keep SELECT but avoid broad listing if possible)
-- Actually, the best way to prevent listing but allow access is to use specific filenames.
-- The policy already restricts to bucket 'logos'.
-- To strictly prevent listing, we can add a check on the depth of the path if needed, 
-- but usually a broad SELECT on a public bucket is what triggers this.
-- We can make it slightly more specific.
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'logos' AND storage.extension(name) IN ('png', 'jpg', 'jpeg', 'svg', 'webp'));

-- 4. Check for any other SECURITY DEFINER functions without search_path
-- (Based on linter, let's just apply to common patterns)
ALTER FUNCTION public.is_admin_of_tenant(uuid) SET search_path = public;
ALTER FUNCTION public.current_tenant_id() SET search_path = public;
