# Corrección auditada de inicio de sesión Android

Esta actualización corrige el retorno de Google OAuth y de confirmación por correo en la APK de **Tragos Sociales**. El problema reportado no depende de la cuenta Expo ni del registro de `Redirect URLs` de Supabase, que ya contiene correctamente `socialsip://auth/callback`.

## Cambios incluidos

| Área | Corrección |
|---|---|
| Enlace Android | Se registra de forma explícita `socialsip://auth/callback` con host `auth` y ruta `/callback`; se elimina el host comodín no verificable. |
| Supabase | La URL de retorno se genera con `expo-linking`, conservando el esquema nativo de la aplicación. |
| Navegador OAuth | Un manejador global procesa el enlace apenas llega a Android, incluso si la navegación aún está montándose. |
| Sesión | Google no se interpreta como cancelado si Android ya entregó y guardó la sesión por el enlace profundo. |
| Callback | La pantalla conserva la URL original para no perder el código PKCE, tokens o mensajes de error. |
| EAS | `pnpm 9.12.0`, Corepack y la imagen `ubuntu-24.04-jdk-17-ndk-r27b` (Java 17) quedan fijados en `preview`. |

## Verificaciones ejecutadas

La fuente actual fue validada con TypeScript, linter Expo, Vitest y Expo Doctor. La suite incluye regresiones para el arranque Android, el callback exacto, el manejador global de enlaces, el lockfile de pnpm y la imagen Java 17 de EAS.

## Preparar la próxima build sin copiar `node_modules`

Desde la carpeta original ya actualizada, ejecuta:

```bash
cd /root/TragosSociales
bash scripts/create-eas-build-copy.sh
```

El script conserva intacta la carpeta original, crea `/root/TragosSociales-EAS` de pocos MB y deja lista una configuración estática local para EAS. Después se usará únicamente esa carpeta para la build:

```bash
cd /root/TragosSociales-EAS
npx eas-cli@latest build --platform android --profile preview
```

No ejecutes la build hasta que se hayan aplicado todos los archivos de esta actualización y se haya confirmado que Supabase mantiene `socialsip://auth/callback` en **Authentication → URL Configuration → Redirect URLs**.

## Prueba física tras instalar la APK

Primero abre la APK y confirma que llega a la pantalla de acceso. Luego prueba Google y, en una cuenta nueva, el enlace de confirmación por correo. Cada flujo debe volver a Tragos Sociales, cerrar el navegador de autenticación y entrar en la pestaña principal. Si aparece una pantalla de error, guarda una captura con la URL visible antes de iniciar otro intento de build.
