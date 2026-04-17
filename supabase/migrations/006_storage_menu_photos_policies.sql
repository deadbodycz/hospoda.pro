-- Policies for menu-photos Storage bucket (anon role = no-auth app)
CREATE POLICY "anon can upload to menu-photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'menu-photos');

CREATE POLICY "anon can update menu-photos"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'menu-photos');

CREATE POLICY "anon can delete from menu-photos"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'menu-photos');
