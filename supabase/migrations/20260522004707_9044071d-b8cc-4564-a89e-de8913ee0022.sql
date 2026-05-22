-- 1. SECURITY: Revoke direct execute from roles to avoid metadata fishing
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(UUID) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 2. ENHANCE INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_composite ON public.time_entries (tenant_id, employee_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_employees_active_tenant ON public.employees (tenant_id) WHERE active = true;

-- 3. REINFORCE RLS POLICIES (Consolidated & Secure)

-- TENANTS: Only select own, update if admin
DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants FOR SELECT TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "tenants_update_admin" ON public.tenants;
CREATE POLICY "tenants_update_admin" ON public.tenants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND tenant_id = public.tenants.id AND role = 'admin'
    )
  );

-- PROFILES: Select self or tenant members (if admin)
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_tenant_members" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_members_admin" ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND tenant_id = public.profiles.tenant_id AND role = 'admin'
    )
  );

-- EMPLOYEES: Strict isolation
DROP POLICY IF EXISTS "employees_select_own" ON public.employees;
DROP POLICY IF EXISTS "employees_select_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin" ON public.employees;

CREATE POLICY "employees_select_own" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "employees_select_admin" ON public.employees FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND tenant_id = public.employees.tenant_id AND role = 'admin'
    )
  );

CREATE POLICY "employees_update_admin" ON public.employees FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND tenant_id = public.employees.tenant_id AND role = 'admin'
    )
  );

-- TIME ENTRIES: Block manual injection via API for non-admins
DROP POLICY IF EXISTS "time_entries_select_admin" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_select_self" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert_self" ON public.time_entries;

CREATE POLICY "time_entries_select_own" ON public.time_entries FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "time_entries_select_admin" ON public.time_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND tenant_id = public.time_entries.tenant_id AND role = 'admin'
    )
  );

CREATE POLICY "time_entries_insert_employee" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid() AND active = true)
    AND source = 'automatico'
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "time_entries_admin_all" ON public.time_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND tenant_id = public.time_entries.tenant_id AND role = 'admin'
    )
  );
