
CREATE OR REPLACE FUNCTION public.is_admin_of_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND role = 'admin'::app_role
  )
$$;

DROP POLICY IF EXISTS user_roles_select_tenant_admin ON public.user_roles;

CREATE POLICY user_roles_select_tenant_admin
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_of_tenant(tenant_id));
