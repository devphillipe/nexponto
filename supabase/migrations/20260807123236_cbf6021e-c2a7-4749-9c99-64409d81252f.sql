DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (COALESCE(qual,'') ILIKE '%avatars%' OR COALESCE(with_check,'') ILIKE '%avatars%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "avatars_select_own_or_tenant_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = (storage.foldername(name))[1] AND public.is_admin_of_tenant(p.tenant_id))
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id::text = (storage.foldername(name))[1] AND public.is_admin_of_tenant(e.tenant_id))
  )
);

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);