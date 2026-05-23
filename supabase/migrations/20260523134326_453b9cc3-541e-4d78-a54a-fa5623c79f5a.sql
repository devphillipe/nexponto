-- 1. Fix SECURITY DEFINER Functions and Search Paths
CREATE OR REPLACE FUNCTION public.is_admin_of_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND tenant_id = _tenant_id
    AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid());
END;
$$;

-- 2. Restrict RLS policies to 'authenticated' role instead of 'public'
-- Absences
DROP POLICY IF EXISTS "Admins can manage absences of their tenant" ON absences;
CREATE POLICY "Admins can manage absences of their tenant" 
ON absences 
FOR ALL 
TO authenticated
USING (is_admin_of_tenant(tenant_id))
WITH CHECK (is_admin_of_tenant(tenant_id));

DROP POLICY IF EXISTS "Employees can view their own absences" ON absences;
CREATE POLICY "Employees can view their own absences" 
ON absences 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = absences.employee_id 
  AND e.user_id = auth.uid()
));

-- Tenants
DROP POLICY IF EXISTS "Admins can update their own tenant" ON tenants;
CREATE POLICY "Admins can update their own tenant" 
ON tenants 
FOR UPDATE 
TO authenticated
USING (is_admin_of_tenant(id));

-- Ensure RLS is enabled on all tables
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Storage Security Hardening
-- Bucket 'logos' Select (Publicly readable logos are okay)
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'logos');

-- Bucket 'logos' Management (Must be authenticated Admin)
DROP POLICY IF EXISTS "Admins can upload logos for their tenant" ON storage.objects;
CREATE POLICY "Admins can upload logos for their tenant" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'logos' 
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update logos for their tenant" ON storage.objects;
CREATE POLICY "Admins can update logos for their tenant" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'logos' 
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete logos for their tenant" ON storage.objects;
CREATE POLICY "Admins can delete logos for their tenant" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'logos' 
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 4. Database Optimizations (Indexes)
CREATE INDEX IF NOT EXISTS idx_absences_tenant_id ON absences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_absences_employee_id ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(absence_date);

-- Ensure profiles is indexed by tenant_id for common lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- 5. Foreign Key Integrity (Adding Cascade)
-- If we need to modify existing FKs to add ON DELETE CASCADE, we have to drop and recreate them.
-- Check existing constraints first or just add them safely if not present.
ALTER TABLE public.absences 
DROP CONSTRAINT IF EXISTS absences_employee_id_fkey,
ADD CONSTRAINT absences_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.time_entries 
DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey,
ADD CONSTRAINT time_entries_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
