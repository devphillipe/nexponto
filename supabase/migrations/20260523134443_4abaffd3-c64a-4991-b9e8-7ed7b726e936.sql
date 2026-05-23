-- 1. Add ON DELETE CASCADE for all tenant-related tables to ensure clean data removal
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_tenant_id_fkey,
ADD CONSTRAINT profiles_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_tenant_id_fkey,
ADD CONSTRAINT employees_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey,
ADD CONSTRAINT user_roles_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.time_entries 
DROP CONSTRAINT IF EXISTS time_entries_tenant_id_fkey,
ADD CONSTRAINT time_entries_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.absences 
DROP CONSTRAINT IF EXISTS absences_tenant_id_fkey,
ADD CONSTRAINT absences_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Optimize RLS Policies using helper functions
-- Profiles
DROP POLICY IF EXISTS "profiles_select_members_admin" ON profiles;
CREATE POLICY "profiles_select_members_admin" 
ON profiles 
FOR SELECT 
TO authenticated
USING (is_admin_of_tenant(tenant_id));

-- Tenants Select
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
CREATE POLICY "tenants_select_own" 
ON tenants 
FOR SELECT 
TO authenticated
USING (id = current_tenant_id());

-- Employees Select Admin
DROP POLICY IF EXISTS "employees_select_admin" ON employees;
CREATE POLICY "employees_select_admin" 
ON employees 
FOR SELECT 
TO authenticated
USING (is_admin_of_tenant(tenant_id));

-- Time Entries Admin
DROP POLICY IF EXISTS "time_entries_select_admin" ON time_entries;
CREATE POLICY "time_entries_select_admin" 
ON time_entries 
FOR SELECT 
TO authenticated
USING (is_admin_of_tenant(tenant_id));

DROP POLICY IF EXISTS "time_entries_admin_all" ON time_entries;
CREATE POLICY "time_entries_admin_all" 
ON time_entries 
FOR ALL 
TO authenticated
USING (is_admin_of_tenant(tenant_id));

-- 3. Add Missing Time Entry Update Policy for Admin
-- Previously it was ALL, which includes UPDATE. Let's make sure it's explicit if needed, 
-- but ALL covers it.
