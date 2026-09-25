-- ============================================================================
-- GymOS: Multi-Tenant Gym Management SaaS Database Schema
-- Target: PostgreSQL / Supabase
-- Core Features: Multi-tenancy with RLS, Role-based Access, Members,
--                Memberships, Payments, Holds, Optional Attendance, Audits
-- ============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create gyms table
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

-- 3. Create profiles table (links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create gym_users table (multi-tenant membership & roles)
CREATE TABLE IF NOT EXISTS public.gym_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist', 'trainer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (gym_id, user_id)
);

-- 5. Create members table
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

-- 6. Create membership_plans table
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

-- 7. Create memberships table
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
    total_fee NUMERIC(10, 2) NOT NULL CHECK (total_fee >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'UPI', 'card', 'bank_transfer', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Create membership_holds table
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

-- 10. Create attendance table (optional module)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Create audit_logs table
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

-- ============================================================================
-- INDEXES FOR SPEED & SEARCH OPTIMIZATION
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_gym_users_lookup ON public.gym_users(user_id, gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_active ON public.members(gym_id, is_active);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(gym_id, phone);
CREATE INDEX IF NOT EXISTS idx_memberships_gym_status ON public.memberships(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(gym_id, end_date);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON public.memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON public.payments(gym_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_today ON public.attendance(gym_id, check_in);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Function to check if user has access to a gym
CREATE OR REPLACE FUNCTION public.user_belongs_to_gym(check_gym_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.gym_users
        WHERE gym_id = check_gym_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Gyms: Users can view gyms they belong to
CREATE POLICY "Users can view their gyms" ON public.gyms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.gym_users
            WHERE gym_users.gym_id = gyms.id AND gym_users.user_id = auth.uid()
        )
    );
CREATE POLICY "Authenticated users can create gym" ON public.gyms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Gym owners can update their gym" ON public.gyms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.gym_users
            WHERE gym_users.gym_id = gyms.id AND gym_users.user_id = auth.uid() AND gym_users.role IN ('owner', 'manager')
        )
    );

-- Gym Users:
CREATE POLICY "View gym staff" ON public.gym_users
    FOR SELECT USING (
        user_belongs_to_gym(gym_id) OR user_id = auth.uid()
    );
CREATE POLICY "Owners can manage gym staff" ON public.gym_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gym_users gu
            WHERE gu.gym_id = gym_users.gym_id AND gu.user_id = auth.uid() AND gu.role = 'owner'
        )
        OR (user_id = auth.uid()) -- Allow initial creator to link themselves
    );

-- Members
CREATE POLICY "Tenant isolation for members" ON public.members
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- Membership Plans
CREATE POLICY "Tenant isolation for membership_plans" ON public.membership_plans
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- Memberships
CREATE POLICY "Tenant isolation for memberships" ON public.memberships
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- Payments
CREATE POLICY "Tenant isolation for payments" ON public.payments
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- Membership Holds
CREATE POLICY "Tenant isolation for holds" ON public.membership_holds
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- Attendance
CREATE POLICY "Tenant isolation for attendance" ON public.attendance
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- Audit Logs
CREATE POLICY "Tenant isolation for audit_logs" ON public.audit_logs
    FOR ALL USING (user_belongs_to_gym(gym_id));

-- ============================================================================
-- HELPER TRIGGERS FOR FINANCIAL INTEGRITY & EXPIRY EXTENSIONS
-- ============================================================================

-- Automatically update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gyms_modtime BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER update_members_modtime BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER update_memberships_modtime BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER update_plans_modtime BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
