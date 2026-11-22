CREATE TABLE public.author_photos (
  name TEXT PRIMARY KEY,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.album_photos (
  name TEXT PRIMARY KEY,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.author_photos, public.album_photos TO anon, authenticated;
GRANT ALL ON public.author_photos, public.album_photos TO service_role;
ALTER TABLE public.author_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Author photos are publicly readable" ON public.author_photos FOR SELECT USING (true);
CREATE POLICY "Only staff can modify author photos" ON public.author_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Album photos are publicly readable" ON public.album_photos FOR SELECT USING (true);
CREATE POLICY "Only staff can modify album photos" ON public.album_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Bucket das fotos. Mesmo padrão de avatars/comment-proofs.
insert into storage.buckets (id, name, public)
values ('catalog-photos', 'catalog-photos', false)
on conflict (id) do nothing;

CREATE POLICY "Allow public read on catalog-photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'catalog-photos');
CREATE POLICY "Allow service role full access on catalog-photos" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'catalog-photos') WITH CHECK (bucket_id = 'catalog-photos');
