-- Tighten time_entries employee INSERT to prevent timestamp falsification
DROP POLICY IF EXISTS time_entries_insert_employee ON public.time_entries;

CREATE POLICY time_entries_insert_employee
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT employees.id FROM public.employees
    WHERE employees.user_id = auth.uid() AND employees.active = true
  )
  AND source = 'automatico'::entry_source
  AND tenant_id = (
    SELECT profiles.tenant_id FROM public.profiles WHERE profiles.id = auth.uid()
  )
  AND is_adjustment IS NOT TRUE
  AND created_by IS NULL
  AND original_entry_at IS NULL
  -- Restrict timestamp to a tight window around now() to prevent back/forward dating
  AND entry_at >= (now() - interval '2 minutes')
  AND entry_at <= (now() + interval '2 minutes')
  -- Restrict entry_date to today in tenant timezone (São Paulo default)
  AND entry_date = ((now() AT TIME ZONE 'America/Sao_Paulo')::date)
);

-- Tighten user_roles INSERT/UPDATE to ensure target user belongs to the same tenant
DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;

CREATE POLICY user_roles_insert_admin
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_of_tenant(tenant_id)
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.tenant_id = user_roles.tenant_id)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = user_roles.user_id AND e.tenant_id = user_roles.tenant_id)
  )
);

CREATE POLICY user_roles_update_admin
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin_of_tenant(tenant_id))
WITH CHECK (
  public.is_admin_of_tenant(tenant_id)
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.tenant_id = user_roles.tenant_id)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = user_roles.user_id AND e.tenant_id = user_roles.tenant_id)
  )
);