-- Tragos Sociales: tokens Expo Push registrados por dispositivo.
-- Esta migración no envía notificaciones por sí sola: el envío seguro se realiza
-- desde la Edge Function send-activity-push al recibir un Database Webhook de activities.

create table if not exists public.user_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create index if not exists user_push_devices_user_idx
  on public.user_push_devices (user_id, enabled, updated_at desc);

alter table public.user_push_devices enable row level security;

drop policy if exists user_push_devices_select_own on public.user_push_devices;
create policy user_push_devices_select_own
on public.user_push_devices
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_push_devices_delete_own on public.user_push_devices;
create policy user_push_devices_delete_own
on public.user_push_devices
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.register_push_device(
  p_expo_push_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if p_platform not in ('android', 'ios') then
    raise exception 'invalid platform';
  end if;

  if p_expo_push_token !~ '^(Exponent|Expo)PushToken\[[^]]+\]$' then
    raise exception 'invalid Expo push token';
  end if;

  insert into public.user_push_devices (user_id, expo_push_token, platform, enabled)
  values (auth.uid(), p_expo_push_token, p_platform, true)
  on conflict (expo_push_token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        enabled = true,
        updated_at = now();
end;
$$;

revoke all on function public.register_push_device(text, text) from public;
grant execute on function public.register_push_device(text, text) to authenticated;

grant select, delete on table public.user_push_devices to authenticated;
