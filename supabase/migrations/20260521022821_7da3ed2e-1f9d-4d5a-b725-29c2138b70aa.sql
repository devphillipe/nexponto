
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.entry_type AS ENUM ('entrada', 'saida_almoco', 'retorno_almoco', 'saida');
CREATE TYPE public.entry_source AS ENUM ('automatico', 'manual_admin');

-- TENANTS
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  default_daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);

-- EMPLOYEES
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  hire_date DATE,
  daily_hours NUMERIC(4,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);

-- TIME ENTRIES
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  entry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_type public.entry_type NOT NULL,
  source public.entry_source NOT NULL DEFAULT 'automatico',
  ip TEXT,
  user_agent TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, entry_date, entry_type)
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_time_entries_employee_date ON public.time_entries(employee_id, entry_date);
CREATE INDEX idx_time_entries_tenant_date ON public.time_entries(tenant_id, entry_date);

-- SECURITY DEFINER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND role = 'admin'
  )
$$;

-- TRIGGER: auto-create tenant + profile + admin role on signup with metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_signup_type TEXT;
BEGIN
  v_signup_type := COALESCE(NEW.raw_user_meta_data->>'signup_type', 'admin');

  -- Only auto-create tenant for admin signups. Employee accounts are created
  -- by admin via server function which sets up profile/role explicitly.
  IF v_signup_type = 'admin' THEN
    INSERT INTO public.tenants (name, document, phone, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'tenant_name', 'Escritório'),
      NEW.raw_user_meta_data->>'tenant_document',
      NEW.raw_user_meta_data->>'tenant_phone',
      NEW.raw_user_meta_data->>'tenant_email'
    )
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.profiles (id, tenant_id, full_name, email)
    VALUES (
      NEW.id,
      v_tenant_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email
    );

    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, v_tenant_id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- TENANTS
CREATE POLICY "tenants_select_own" ON public.tenants FOR SELECT TO authenticated
  USING (id = public.current_tenant_id());
CREATE POLICY "tenants_update_admin" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(id));

-- PROFILES
CREATE POLICY "profiles_select_own_tenant" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- USER ROLES (read-only from client; writes go through server functions / trigger)
CREATE POLICY "user_roles_select_own_tenant" ON public.user_roles FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- EMPLOYEES
CREATE POLICY "employees_select_admin" ON public.employees FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "employees_select_self" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "employees_update_admin" ON public.employees FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- TIME ENTRIES
CREATE POLICY "time_entries_select_admin" ON public.time_entries FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "time_entries_select_self" ON public.time_entries FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "time_entries_insert_self" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid() AND active = true)
    AND tenant_id = public.current_tenant_id()
    AND source = 'automatico'
  );
