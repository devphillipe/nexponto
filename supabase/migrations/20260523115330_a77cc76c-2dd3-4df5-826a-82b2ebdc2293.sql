-- Create updated_at handler if it doesn't exist in public
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create absence type enum (check if exists first to be safe, though usually fresh)
DO $$ BEGIN
    CREATE TYPE public.absence_reason AS ENUM ('atestado', 'folga', 'feriado', 'licenca', 'falta_justificada', 'outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create absences table
CREATE TABLE IF NOT EXISTS public.absences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    reason public.absence_reason NOT NULL DEFAULT 'outro',
    description TEXT,
    document_url TEXT,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add configuration columns to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Add adjustment flag to time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_adjustment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_entry_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS for absences
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Policies for absences
DROP POLICY IF EXISTS "Admins can manage absences of their tenant" ON public.absences;
CREATE POLICY "Admins can manage absences of their tenant"
ON public.absences
FOR ALL
USING (public.is_admin_of_tenant(tenant_id));

DROP POLICY IF EXISTS "Employees can view their own absences" ON public.absences;
CREATE POLICY "Employees can view their own absences"
ON public.absences
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.id = absences.employee_id 
        AND e.user_id = auth.uid()
    )
);

-- Policies for tenants (Update)
DROP POLICY IF EXISTS "Admins can update their own tenant" ON public.tenants;
CREATE POLICY "Admins can update their own tenant"
ON public.tenants
FOR UPDATE
USING (public.is_admin_of_tenant(id));

-- Trigger for absences updated_at
DROP TRIGGER IF EXISTS update_absences_updated_at ON public.absences;
CREATE TRIGGER update_absences_updated_at
BEFORE UPDATE ON public.absences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
