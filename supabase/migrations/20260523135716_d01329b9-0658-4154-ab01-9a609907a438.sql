
-- Fix: user_roles missing INSERT/DELETE policies (privilege escalation risk)
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_of_tenant(tenant_id));

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin_of_tenant(tenant_id));

CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin_of_tenant(tenant_id))
  WITH CHECK (public.is_admin_of_tenant(tenant_id));

-- Fix: employees missing INSERT/DELETE policies
CREATE POLICY "employees_insert_admin" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_of_tenant(tenant_id));

CREATE POLICY "employees_delete_admin" ON public.employees
  FOR DELETE TO authenticated
  USING (public.is_admin_of_tenant(tenant_id));

-- Fix: revoke EXECUTE on trigger-only SECURITY DEFINER functions from end users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
