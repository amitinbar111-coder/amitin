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

-- 5. Vehicles RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for admins only" ON public.vehicles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 6. Profiles RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update access for admins only" ON public.profiles
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Enable delete access for admins only" ON public.profiles
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 7. Bookings RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.bookings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authorized users" ON public.bookings
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR vehicle_id = ANY(profiles.permissions))
        )
    );

CREATE POLICY "Enable delete access for owner or admin" ON public.bookings
    FOR DELETE TO authenticated USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 8. Automatically synchronize auth.users with public.profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role text := 'member';
    default_perms text[] := '{}'::text[];
BEGIN
    -- Automatically set 'amitinbar111@gmail.com' as admin
    IF new.email = 'amitinbar111@gmail.com' THEN
        default_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, email, name, role, permissions)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'משתמש חדש'),
        default_role,
        default_perms
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Insert Initial Mock Vehicles (Optional, but useful to populate database)
INSERT INTO public.vehicles (id, name, model, license_plate, notes) VALUES
    ('car-1', 'יונדאי איוניק 5', '2023 חשמלי', '12-345-67', 'רכב חשמלי מלא. נא להחזיר תמיד לעמדת הטענה ולחבר לחשמל בסיום הנסיעה!'),
    ('car-2', 'טויוטה יאריס היברידית', '2022 היברידי', '98-765-43', 'רכב סופר-מיני חסכוני ונוח במיוחד לנסיעות עירוניות וחניות צפופות.'),
    ('car-3', 'סובארו פורסטר', '2021 בנזין 4x4', '55-666-77', 'רכב פנאי-שטח מרווח. מעולה לנסיעות ארוכות וטיולים משפחתיים.')
ON CONFLICT (id) DO NOTHING;
