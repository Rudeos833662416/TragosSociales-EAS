# Tragos Sociales — Activación de notificaciones push reales

La aplicación ya registra los dispositivos físicos y maneja las notificaciones recibidas. Para que las alertas lleguen cuando la aplicación esté en segundo plano o cerrada, completa una sola vez la configuración externa de Supabase y Expo.

## Qué eventos notifican

Cada nuevo registro de `activities` puede producir una alerta: check-in, check-out, solicitud de amistad, reacción a un check-in y reacción a un Estado. Al tocar la alerta, la aplicación abre **Actividad** o **Amigos** según corresponda.

## 1. Aplicar la migración

En Supabase Dashboard, abre **SQL Editor → New query**, pega el archivo `supabase/migrations/0013_push_notifications.sql` y pulsa **Run**. Esto crea la tabla privada de tokens de dispositivos y la función segura que registra cada token.

## 2. Crear y desplegar la Edge Function

Desde un ordenador con Supabase CLI y una sesión iniciada en tu proyecto:

```bash
supabase functions deploy send-activity-push --no-verify-jwt
```

Genera una clave aleatoria larga y guárdala solo como secreto de la función:

```bash
supabase secrets set PUSH_WEBHOOK_SECRET="PEGA_AQUI_UN_SECRETO_LARGO_ALEATORIO"
```

La función usa automáticamente `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` proporcionados por Supabase. No pongas la service role key dentro de la aplicación.

## 3. Crear el Database Webhook

En Supabase Dashboard abre **Database → Webhooks → Create a new hook**. Configúralo así:

| Campo | Valor |
|---|---|
| Nombre | `send-activity-push` |
| Tabla | `public.activities` |
| Evento | `INSERT` |
| Tipo | `HTTP Request` |
| Método | `POST` |
| URL | `https://cymhbwgxmezrwofkbdqz.supabase.co/functions/v1/send-activity-push` |
| Encabezado | `x-push-webhook-secret: EL_MISMO_SECRETO_LARGO` |
| Encabezado | `Content-Type: application/json` |

Guarda el webhook. A partir de ese momento, los check-ins, solicitudes y reacciones que creen una actividad activarán la función de entrega push.

## 4. Vincular el proyecto Expo antes de generar una build

Las notificaciones push remotas no funcionan en Expo Go en Android con SDK 54. Necesitas un APK o build de desarrollo/release y un proyecto Expo/EAS vinculado. Al vincularlo, configura el identificador recibido como variable de entorno:

```text
EXPO_PUBLIC_EAS_PROJECT_ID=tu-id-de-proyecto-expo
```

Después recompila la aplicación. En Android, Expo solicitará el permiso de notificaciones al crear el canal de actividad. En iOS debes configurar las credenciales APNs en Expo antes de generar la build de distribución.

## 5. Prueba real

1. Instala la build en dos teléfonos físicos y entra con dos cuentas distintas.
2. En ambos dispositivos, acepta el permiso de notificaciones.
3. Desde la primera cuenta haz check-in o reacciona a un Estado de la segunda.
4. La segunda debe recibir una alerta de **Tragos Sociales**, incluso con la aplicación en segundo plano.

> La actividad dentro de la aplicación y la actualización Realtime siguen funcionando aunque un usuario rechace las notificaciones push.
