-- Tragos Sociales: activa la Edge Function de notificaciones al crear una actividad.
-- Se usa como alternativa directa cuando el panel no muestra Database Webhooks.

create extension if not exists pg_net;

create or replace function public.dispatch_activity_push()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url := 'https://cymhbwgxmezrwofkbdqz.supabase.co/functions/v1/send-activity-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-webhook-secret', '9781d77139b86de15e70e398c5c407ad9bd1b665aaed340bb94599c782cb507e'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW)
    )
  );
  return NEW;
end;
$$;

drop trigger if exists activities_push_after_insert on public.activities;
create trigger activities_push_after_insert
after insert on public.activities
for each row execute function public.dispatch_activity_push();

revoke all on function public.dispatch_activity_push() from public;
