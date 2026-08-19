-- Sky Night: añadir biografía corta o estado del día al perfil (máximo 100 caracteres)

alter table if exists public.profiles
  add column if not exists bio text check (char_length(bio) <= 100);

create or replace view public.public_profiles as
select id, name, avatar_url, cover_url, bio
from public.profiles
where coalesce(is_public, false) = true;

grant select on public.public_profiles to authenticated;
