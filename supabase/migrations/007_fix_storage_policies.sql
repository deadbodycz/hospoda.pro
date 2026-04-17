-- Replace anon-specific policies with role-agnostic ones
-- sb_publishable_ key may not map to 'anon' role in Storage
DROP POLICY IF EXISTS "anon can upload to menu-photos" ON storage.objects;
DROP POLICY IF EXISTS "anon can update menu-photos" ON storage.objects;
DROP POLICY IF EXISTS "anon can delete from menu-photos" ON storage.objects;

CREATE POLICY "public upload menu-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-photos');

CREATE POLICY "public update menu-photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-photos');

CREATE POLICY "public delete menu-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-photos');
