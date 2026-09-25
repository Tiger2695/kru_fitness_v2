export const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- KRU FITNESS - POSTGRESQL MULTI-TENANT SCHEMA (SUPABASE)
-- ============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GYMS TABLE (Multi-Tenant Core)
CREATE TABLE IF NOT EXISTS public.gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    city TEXT,
    logo_url TEXT,
    attendance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROFILES TABLE (Links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. GYM USERS & ROLES
CREATE TABLE IF NOT EXISTS public.gym_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist', 'trainer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (gym_id, user_id)
);

-- Add explicit foreign key to profiles so Supabase PostgREST can resolve gym_users -> profiles join
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_gym_users_profile'
    ) THEN
        -- Safely backfill profile entries for existing users so constraint doesn't violate
        INSERT INTO public.profiles (id, full_name)
        SELECT DISTINCT gu.user_id, 'Gym User'
        FROM public.gym_users gu
        WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = gu.user_id)
        ON CONFLICT (id) DO NOTHING;

        ALTER TABLE public.gym_users
        ADD CONSTRAINT fk_gym_users_profile
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4.1 MULTI-TENANT RLS HELPER FUNCTION
-- Declared early so functions and policies can reference it safely
CREATE OR REPLACE FUNCTION public.user_belongs_to_gym(check_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.gym_users
        WHERE gym_id = check_gym_id AND user_id = auth.uid()
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.user_belongs_to_gym FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_gym TO authenticated;

-- 4.2 ATOMIC GYM CREATION & ONBOARDING (SECURITY DEFINER)
-- Prevents arbitrary self-insert into gym_users by creating gym & owner role atomically
CREATE OR REPLACE FUNCTION public.create_gym_workspace(
    p_name TEXT,
    p_owner_name TEXT,
    p_phone TEXT,
    p_email TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_attendance_enabled BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_gym RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a gym workspace';
    END IF;

    IF TRIM(COALESCE(p_name, '')) = '' THEN
        RAISE EXCEPTION 'Gym name cannot be empty';
    END IF;

    -- 1. Insert gym
    INSERT INTO public.gyms (
        name,
        owner_name,
        phone,
        email,
        address,
        city,
        attendance_enabled
    ) VALUES (
        TRIM(p_name),
        TRIM(p_owner_name),
        TRIM(p_phone),
        NULLIF(TRIM(p_email), ''),
        NULLIF(TRIM(p_address), ''),
        NULLIF(TRIM(p_city), ''),
        COALESCE(p_attendance_enabled, FALSE)
    )
    RETURNING * INTO v_gym;

    -- 2. Link authenticated user as owner
    INSERT INTO public.gym_users (
        gym_id,
        user_id,
        role
    ) VALUES (
        v_gym.id,
        v_user_id,
        'owner'
    );

    RETURN to_jsonb(v_gym);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_gym_workspace FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_gym_workspace TO authenticated;

-- 5. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_code TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility and column harmonization for members
DO $$
BEGIN
    -- Harmonize full_name and name so both exist and are populated
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'full_name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.members ADD COLUMN full_name TEXT;
        UPDATE public.members SET full_name = name WHERE full_name IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.members ADD COLUMN name TEXT;
        UPDATE public.members SET name = full_name WHERE name IS NULL;
    END IF;

    -- Ensure status exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;

    -- Ensure is_active exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- 6. MEMBERSHIP PLANS TABLE
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility if created with duration_months or missing is_active
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'membership_plans' AND column_name = 'duration_months'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'membership_plans' AND column_name = 'duration_days'
    ) THEN
        ALTER TABLE public.membership_plans ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 30;
        UPDATE public.membership_plans SET duration_days = duration_months * 30;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'membership_plans' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.membership_plans ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- 7. MEMBERSHIPS (SUBSCRIPTIONS) TABLE
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'on_hold', 'cancelled')),
    basic_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (basic_fee >= 0),
    pt_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    pt_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (pt_fee >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_fee >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required fee columns exist if memberships was created with minimal schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'basic_fee') THEN
        ALTER TABLE public.memberships ADD COLUMN basic_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'pt_enabled') THEN
        ALTER TABLE public.memberships ADD COLUMN pt_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'pt_fee') THEN
        ALTER TABLE public.memberships ADD COLUMN pt_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'discount') THEN
        ALTER TABLE public.memberships ADD COLUMN discount NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'total_fee') THEN
        ALTER TABLE public.memberships ADD COLUMN total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'total_amount') THEN
        ALTER TABLE public.memberships ADD COLUMN total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'paid_amount') THEN
        ALTER TABLE public.memberships ADD COLUMN paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'remaining_amount') THEN
        ALTER TABLE public.memberships ADD COLUMN remaining_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'UPI', 'upi', 'card', 'bank_transfer', 'other', 'cheque')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure created_by column exists if table was created in an earlier migration
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'payments' 
          AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 9. MEMBERSHIP HOLDS TABLE
CREATE TABLE IF NOT EXISTS public.membership_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    number_of_days INTEGER NOT NULL CHECK (number_of_days > 0),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- 10. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ATOMIC PAYMENT RECORDING & BALANCE UPDATE (DATABASE TRANSACTION)
CREATE OR REPLACE FUNCTION public.record_payment_atomic(
    p_gym_id UUID,
    p_member_id UUID,
    p_membership_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_transaction_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ms RECORD;
    v_new_paid NUMERIC;
    v_new_remaining NUMERIC;
    v_payment_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Authorization check: Require authenticated user who belongs to p_gym_id
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to process payment';
    END IF;

    IF NOT public.user_belongs_to_gym(p_gym_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to the specified gym';
    END IF;

    -- 2. Validate payment amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than 0';
    END IF;

    -- 3. Lock and fetch membership row for update (strictly scoped to gym and member)
    SELECT * INTO v_ms
    FROM public.memberships
    WHERE id = p_membership_id
      AND gym_id = p_gym_id
      AND member_id = p_member_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership not found or does not belong to specified member and gym';
    END IF;

    -- 4. Verify member actively belongs to specified gym
    IF NOT EXISTS (
        SELECT 1 FROM public.members
        WHERE id = p_member_id AND gym_id = p_gym_id
    ) THEN
        RAISE EXCEPTION 'Member not found or does not belong to specified gym';
    END IF;

    -- 5. Check overpayment against current remaining amount
    IF p_amount > COALESCE(v_ms.remaining_amount, 0) THEN
        RAISE EXCEPTION 'Payment amount (₹%) exceeds remaining balance (₹%)', p_amount, COALESCE(v_ms.remaining_amount, 0);
    END IF;

    -- 5. Insert payment record
    INSERT INTO public.payments (
        gym_id,
        member_id,
        membership_id,
        amount,
        payment_method,
        payment_date,
        transaction_reference,
        notes,
        created_by
    ) VALUES (
        p_gym_id,
        p_member_id,
        p_membership_id,
        p_amount,
        p_payment_method,
        COALESCE(p_payment_date, CURRENT_DATE),
        p_transaction_reference,
        p_notes,
        auth.uid()
    )
    RETURNING id INTO v_payment_id;

    -- 6. Calculate new financial totals and update membership atomically
    v_new_paid := COALESCE(v_ms.paid_amount, 0) + p_amount;
    v_new_remaining := GREATEST(0, COALESCE(v_ms.remaining_amount, 0) - p_amount);

    UPDATE public.memberships
    SET paid_amount = v_new_paid,
        remaining_amount = v_new_remaining
    WHERE id = p_membership_id;

    -- 7. Construct JSON response
    v_result := jsonb_build_object(
        'payment_id', v_payment_id,
        'gym_id', p_gym_id,
        'member_id', p_member_id,
        'membership_id', p_membership_id,
        'amount', p_amount,
        'payment_method', p_payment_method,
        'payment_date', COALESCE(p_payment_date, CURRENT_DATE),
        'transaction_reference', p_transaction_reference,
        'notes', p_notes,
        'new_paid_amount', v_new_paid,
        'new_remaining_amount', v_new_remaining
    );

    RETURN v_result;
END;
$$;

-- Restrict function execution privileges
REVOKE EXECUTE ON FUNCTION public.record_payment_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_atomic TO authenticated;

-- 13. SPEED INDEXES
CREATE INDEX IF NOT EXISTS idx_gym_users_lookup ON public.gym_users(user_id, gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_status ON public.members(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(gym_id, phone);
CREATE INDEX IF NOT EXISTS idx_memberships_gym_status ON public.memberships(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(gym_id, end_date);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON public.memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON public.payments(gym_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_today ON public.attendance(gym_id, check_in);

-- 14. FORCE ROW LEVEL SECURITY (RLS) ACROSS ALL TABLES
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.membership_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_holds FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Dynamic drop of ALL existing policies on the target tables to purge legacy permissive policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('gyms', 'gym_users', 'profiles', 'members', 'membership_plans', 'memberships', 'payments', 'membership_holds', 'attendance', 'audit_logs')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- 15. COMPREHENSIVE HARDENED RLS POLICIES (USING + WITH CHECK)
-- ============================================================================

-- 15.1 PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 15.2 GYMS
-- SELECT only for users belonging to that gym
CREATE POLICY "Users can view their gyms" ON public.gyms
    FOR SELECT USING (user_belongs_to_gym(id));

-- NO direct INSERT policy on gyms. Gym creation must happen strictly via create_gym_workspace() SECURITY DEFINER RPC.

-- UPDATE only for owner/manager belonging to that gym
CREATE POLICY "Gym owners can update their gym" ON public.gyms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.gym_users
            WHERE gym_users.gym_id = gyms.id
              AND gym_users.user_id = auth.uid()
              AND gym_users.role IN ('owner', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gym_users
            WHERE gym_users.gym_id = gyms.id
              AND gym_users.user_id = auth.uid()
              AND gym_users.role IN ('owner', 'manager')
        )
    );

-- 15.3 GYM USERS (Staff & Owners)
-- SELECT only own record or coworkers belonging to the same gym
CREATE POLICY "View gym staff" ON public.gym_users
    FOR SELECT USING (
        user_id = auth.uid() OR user_belongs_to_gym(gym_id)
    );

-- INSERT only when performed by an existing owner of that specific gym
CREATE POLICY "Insert gym staff" ON public.gym_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gym_users gu
            WHERE gu.gym_id = gym_users.gym_id
              AND gu.user_id = auth.uid()
              AND gu.role = 'owner'
        )
    );

-- UPDATE only by an existing owner of that specific gym
CREATE POLICY "Owners can update gym staff" ON public.gym_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.gym_users gu
            WHERE gu.gym_id = gym_users.gym_id
              AND gu.user_id = auth.uid()
              AND gu.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gym_users gu
            WHERE gu.gym_id = gym_users.gym_id
              AND gu.user_id = auth.uid()
              AND gu.role = 'owner'
        )
    );

-- DELETE only by an existing owner of that specific gym
CREATE POLICY "Owners can delete gym staff" ON public.gym_users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.gym_users gu
            WHERE gu.gym_id = gym_users.gym_id
              AND gu.user_id = auth.uid()
              AND gu.role = 'owner'
        )
    );

-- 15.4 TENANT ENTITIES (Strict USING + WITH CHECK via user_belongs_to_gym)
CREATE POLICY "Tenant isolation for members" ON public.members
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));

CREATE POLICY "Tenant isolation for membership_plans" ON public.membership_plans
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));

CREATE POLICY "Tenant isolation for memberships" ON public.memberships
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));

CREATE POLICY "Tenant isolation for payments" ON public.payments
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));

CREATE POLICY "Tenant isolation for holds" ON public.membership_holds
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));

CREATE POLICY "Tenant isolation for attendance" ON public.attendance
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));

CREATE POLICY "Tenant isolation for audit_logs" ON public.audit_logs
    FOR ALL
    USING (user_belongs_to_gym(gym_id))
    WITH CHECK (user_belongs_to_gym(gym_id));
`;
