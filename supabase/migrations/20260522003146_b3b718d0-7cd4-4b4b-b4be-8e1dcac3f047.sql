-- Update profiles RLS policy to be simpler and allow reading own row directly
DROP POLICY IF EXISTS "profiles_select_own_tenant" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_select_tenant_members" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Update user_roles RLS policy
DROP POLICY IF EXISTS "user_roles_select_own_tenant" ON public.user_roles;
CREATE POLICY "user_roles_select_self" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_roles_select_tenant_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles admin_role
      WHERE admin_role.user_id = auth.uid() 
      AND admin_role.tenant_id = public.user_roles.tenant_id 
      AND admin_role.role = 'admin'
    )
  );

-- Ensure employees RLS is solid
DROP POLICY IF EXISTS "employees_select_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_select_self" ON public.employees;

CREATE POLICY "employees_select_own" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "employees_select_admin" ON public.employees FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND tenant_id = public.employees.tenant_id AND role = 'admin'
    )
  );
