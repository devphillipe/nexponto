ALTER TABLE public.time_entries
  ADD COLUMN latitude numeric,
  ADD COLUMN longitude numeric;

DROP POLICY IF EXISTS time_entries_insert_employee ON public.time_entries;

CREATE POLICY time_entries_insert_employee ON public.time_entries
FOR INSERT TO authenticated
WITH CHECK (
  (employee_id IN (SELECT employees.id FROM employees WHERE employees.user_id = auth.uid() AND employees.active = true))
  AND (source = 'automatico'::entry_source)
  AND (tenant_id = (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
  AND (is_adjustment IS NOT TRUE)
  AND (created_by IS NULL)
  AND (original_entry_at IS NULL)
  AND (entry_at >= (now() - '00:02:00'::interval))
  AND (entry_at <= (now() + '00:02:00'::interval))
  AND (entry_date = ((now() AT TIME ZONE 'America/Sao_Paulo'::text))::date)
  AND (latitude IS NULL OR latitude BETWEEN -90 AND 90)
  AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);