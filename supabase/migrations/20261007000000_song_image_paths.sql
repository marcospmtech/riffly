-- Permite várias imagens de cifra por música.
-- A ordem do array = ordem de exibição na página da música.
alter table public.songs
  add column if not exists image_paths text[] not null default '{}';

-- Migra as cifras já cadastradas (campo antigo image_path) para a nova lista.
update public.songs
set image_paths = array[image_path]
where image_path is not null
  and image_path <> ''
  and cardinality(image_paths) = 0;
