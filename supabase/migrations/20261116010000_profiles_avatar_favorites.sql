-- Perfil completo: bio, foto de avatar e três "favoritos" (música, autor/banda e álbum) que aparecem na página pública de perfil.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists favorite_song_id uuid references public.songs(id) on delete set null,
  add column if not exists favorite_author text,
  add column if not exists favorite_album text;

-- Bio curta, no estilo Instagram — evita que alguém cole um texto gigante
-- num campo pensado pra ser uma linha de descrição.
alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280);

-- Bucket de fotos de perfil. Ao contrário de chord-images (que já existia
-- antes de termos migrations — por isso só tem as policies, não o insert do
-- bucket), este criamos aqui pra não depender de um passo manual no painel.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Mesmo padrão de chord-images: leitura pública via policy (não via bucket
-- "public"), escrita só pelo service_role — ou seja, upload sempre passa
-- por um server function com supabaseAdmin (profile.functions.ts),
-- nunca direto do browser.
CREATE POLICY "Allow public read on avatars" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Allow service role full access on avatars" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
