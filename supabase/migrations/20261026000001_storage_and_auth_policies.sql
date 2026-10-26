-- ==============================================================================
-- GapFinder AI Migration: Private Storage & Auth Integration
-- 1. Private Supabase Storage bucket 'study-materials' with zero arbitrary size cap
-- 2. Strict folder-isolated RLS policies for storage objects (auth.uid() = folder)
-- 3. Profile INSERT policy & automatic user profile creation trigger
-- ==============================================================================

-- 1. Create Private Storage Bucket for Study Materials (Unlimited Application Cap)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'study-materials',
    'study-materials',
    false, -- Private bucket
    NULL,  -- No arbitrary application-level file size limit (uses infra limit)
    ARRAY['application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = NULL,
    allowed_mime_types = ARRAY['application/pdf', 'text/plain'];

-- 2. Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Object Policies: Isolated to authenticated user's folder: auth.uid()/...
DROP POLICY IF EXISTS "Authenticated users can upload study materials" ON storage.objects;
CREATE POLICY "Authenticated users can upload study materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can read own study materials" ON storage.objects;
CREATE POLICY "Users can read own study materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own study materials" ON storage.objects;
CREATE POLICY "Users can update own study materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own study materials" ON storage.objects;
CREATE POLICY "Users can delete own study materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Fix Profile RLS: Allow authenticated users to insert their own profile row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. Automated Profile Trigger: Creates or updates profile whenever a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = NOW();
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
