# Corrección del retorno de Google en Android

## Causa encontrada

La APK anterior recibía la URL de Supabase `socialsip://auth/callback`, pero la actividad nativa de lanzamiento de `expo-web-browser` estaba desactivada. En Android, esa actividad mantiene el proceso de Tragos Sociales disponible mientras Chrome Custom Tabs devuelve el resultado de Google. Sin ella, el navegador puede mostrar “No pudimos abrir Tragos Sociales” y permanecer bloqueado.

## Corrección incluida

La actualización habilita `experimentalLauncherActivity`, incorpora `BrowserLauncherActivity.kt`, registra su ciclo de vida en `MainApplication.kt` y mantiene el intent filter específico de `socialsip://auth/callback`. También conserva Corepack, pnpm 9.12.0 y Java 17 para EAS.

## Aplicación y build

Extrae este ZIP sobre `/root/TragosSociales`, crea de nuevo el contexto limpio y compila únicamente desde él:

```bash
cd /root
unzip -o TragosSociales-OAuth-Launcher-Fix.zip -d TragosSociales
cd /root/TragosSociales
bash scripts/create-eas-build-copy.sh
cd /root/TragosSociales-EAS
npx eas-cli@latest build --platform android --profile preview
```

Cuando la APK esté instalada, prueba Google. Tras seleccionar una cuenta, Chrome debe cerrarse y Tragos Sociales debe abrirse en la sesión autenticada.
