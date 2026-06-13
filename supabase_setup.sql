-- Supabase Setup Script for Car-Sharing Fleet (צי רכב שיתופי)
-- Run this in the Supabase SQL Editor to create tables, set up triggers, and configure RLS.

-- 1. Create Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id text PRIMARY KEY,
    name text NOT NULL,
    model text NOT NULL,
    license_plate text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    permissions text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Invited Users Table (whitelisting)
CREATE TABLE IF NOT EXISTS public.invited_users (
    email text PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    permissions text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id text PRIMARY KEY,
    vehicle_id text NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name text NOT NULL,
    date text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    purpose text DEFAULT '',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invited_users ENABLE ROW LEVEL SECURITY;

-- 5. Vehicles RLS Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.vehicles;
CREATE POLICY "Enable read access for authenticated users" ON public.vehicles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable write access for admins only" ON public.vehicles;
CREATE POLICY "Enable write access for admins only" ON public.vehicles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 6. Profiles RLS Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable update access for admins only" ON public.profiles;
CREATE POLICY "Enable update access for admins only" ON public.profiles
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Enable delete access for admins only" ON public.profiles;
CREATE POLICY "Enable delete access for admins only" ON public.profiles
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 7. Bookings RLS Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.bookings;
CREATE POLICY "Enable read access for authenticated users" ON public.bookings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for authorized users" ON public.bookings;
CREATE POLICY "Enable insert access for authorized users" ON public.bookings
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR vehicle_id = ANY(profiles.permissions))
        )
    );

DROP POLICY IF EXISTS "Enable delete access for owner or admin" ON public.bookings;
CREATE POLICY "Enable delete access for owner or admin" ON public.bookings
    FOR DELETE TO authenticated USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 8. Invited Users RLS Policies
DROP POLICY IF EXISTS "Enable full access for admins only" ON public.invited_users;
CREATE POLICY "Enable full access for admins only" ON public.invited_users
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 9. Automatically synchronize auth.users with public.profiles on signup (Whitelisting mode)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    invited_record record;
BEGIN
    -- 1. Automatically make the owner's email 'amitinbar111@gmail.com' an admin
    IF LOWER(new.email) = 'amitinbar111@gmail.com' THEN
        INSERT INTO public.profiles (id, email, name, role, permissions)
        VALUES (
            new.id,
            new.email,
            'Amit Inbar Ben Ze''ev',
            'admin',
            '{}'::text[]
        )
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
        RETURN new;
    END IF;

    -- 2. Verify that the email is whitelisted in invited_users
    SELECT * INTO invited_record FROM public.invited_users WHERE LOWER(email) = LOWER(new.email);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not allowed. This email has not been invited by an administrator.';
    END IF;

    -- 3. If email is already confirmed on insert (e.g. confirmation is disabled), create profile immediately
    IF new.email_confirmed_at IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, name, role, permissions)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'name', invited_record.name),
            invited_record.role,
            invited_record.permissions
        );
        DELETE FROM public.invited_users WHERE LOWER(email) = LOWER(new.email);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition for user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9b. Automatically create profile when user confirms their email / logs in
CREATE OR REPLACE FUNCTION public.handle_user_confirmation()
RETURNS trigger AS $$
DECLARE
    invited_record record;
    profile_exists boolean;
BEGIN
    -- Only proceed if the email is confirmed
    IF new.email_confirmed_at IS NULL THEN
        RETURN new;
    END IF;

    -- Check if profile already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) INTO profile_exists;
    IF profile_exists THEN
        RETURN new;
    END IF;

    -- Get invite details
    SELECT * INTO invited_record FROM public.invited_users WHERE LOWER(email) = LOWER(new.email);

    IF FOUND THEN
        -- Create public profile using the invite configuration
        INSERT INTO public.profiles (id, email, name, role, permissions)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'name', invited_record.name),
            invited_record.role,
            invited_record.permissions
        );

        -- Delete the invitation now that it has been claimed
        DELETE FROM public.invited_users WHERE LOWER(email) = LOWER(new.email);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition for user confirmation
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmation();

-- 9c. Automatically clean up auth.users when a pending invite is deleted
CREATE OR REPLACE FUNCTION public.handle_deleted_invite()
RETURNS trigger AS $$
BEGIN
    DELETE FROM auth.users WHERE LOWER(email) = LOWER(old.email) AND email_confirmed_at IS NULL;
    RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invite_deleted ON public.invited_users;
CREATE TRIGGER on_invite_deleted
    AFTER DELETE ON public.invited_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_invite();

-- 9d. Automatically clean up auth.users when a profile is deleted
CREATE OR REPLACE FUNCTION public.handle_deleted_profile()
RETURNS trigger AS $$
BEGIN
    DELETE FROM auth.users WHERE id = old.id;
    RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
    AFTER DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_profile();

-- 10. Insert Initial Mock Vehicles (Optional, but useful to populate database)
INSERT INTO public.vehicles (id, name, model, license_plate, notes) VALUES
    ('car-1', 'יונדאי איוניק 5', '2023 חשמלי', '12-345-67', 'רכב חשמלי מלא. נא להחזיר תמיד לעמדת הטענה ולחבר לחשמל בסיום הנסיעה!'),
    ('car-2', 'טויוטה יאריס היברידית', '2022 היברידי', '98-765-43', 'רכב סופר-מיני חסכוני ונוח במיוחד לנסיעות עירוניות וחניות צפופות.'),
    ('car-3', 'סובארו פורסטר', '2021 בנזין 4x4', '55-666-77', 'רכב פנאי-שטח מרווח. מעולה לנסיעות ארוכות וטיולים משפחתיים.')
ON CONFLICT (id) DO NOTHING;
