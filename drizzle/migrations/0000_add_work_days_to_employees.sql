ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS work_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}';

ALTER TABLE public.employees
  ADD CONSTRAINT employees_work_days_valid
  CHECK (
    array_length(work_days, 1) >= 1
    AND work_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
  );