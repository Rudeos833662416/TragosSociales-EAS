# Tragos Sociales — Reemplazo validado para Android

Este paquete reemplaza la base anterior que podía quedar detenida en el logo o cerrarse después de aceptar el permiso de notificaciones. **No solicita ni registra notificaciones push al arrancar la aplicación.** Por ese motivo, aceptar el permiso Android ya no dispara el registro FCM/Expo que causaba el cierre. Las notificaciones reales quedan preservadas en el código, pero desactivadas hasta completar sus credenciales nativas y una prueba física controlada.

| Área | Estado de esta entrega |
|---|---|
| Inicio de sesión | Incluye límite de ocho segundos y pantalla de recuperación visible ante un fallo inesperado. |
| Permiso de notificaciones | El registro automático queda desactivado de forma explícita durante el inicio. |
| Configuración Expo/EAS | Usa `app.config.js`, con propietario y Project ID correctos de Expo. |
| Google Maps Android | El proyecto Android incluido ya contiene la clave de Maps en su manifiesto. |
| APK | El perfil `preview` genera un APK instalable, no un AAB. |
| Validación | TypeScript, lint, pruebas, Expo Doctor y exportación del bundle Android fueron correctos. |

## Aplicación única del reemplazo

Guarda el archivo ZIP descargado exactamente aquí: `/root/TragosSociales/updates/TragosSociales-Complete-Fix.zip`. Después, abre una terminal y ejecuta este bloque completo. El comando sustituye los archivos de la aplicación, conserva las carpetas `updates` y `apks`, e instala exactamente las dependencias declaradas en el lockfile.

```bash
cd /root/TragosSociales
unzip -o updates/TragosSociales-Complete-Fix.zip -d .
unset PREFIX
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
pnpm install --frozen-lockfile
pnpm check && pnpm lint && pnpm test
```

> No ejecutes una build si alguno de esos comandos termina con un error. Esta comprobación evita consumir una build de Expo con archivos incompletos o una configuración incorrecta.

## Una sola build APK

Antes de compilar, conserva la variable de Maps en EAS para futuras regeneraciones nativas. Si el secreto no existe aún, ejecútalo una vez. Si EAS indica que ya existe, no lo recrees.

```bash
cd /root/TragosSociales
unset PREFIX
export NVM_DIR="$HOME/.config/nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
npx eas-cli@latest secret:create --name GOOGLE_MAPS_API_KEY --value AIzaSyAxiTyf1nTtKj931KtvjVytCUov6Hl4ABg --scope project
npx eas-cli@latest build --platform android --profile preview
```

Al finalizar, abre el enlace que imprime Expo, descarga el APK y reinstálalo sobre la versión anterior. Si Android no permite actualizarla por una firma distinta, desinstala únicamente la versión vieja y vuelve a instalar el nuevo APK.

## Prueba física obligatoria

Primero abre la app y confirma que llega a Login o al mapa si ya existe sesión. Después abre Ajustes del sistema Android, busca **Tragos Sociales**, habilita **Notificaciones** y vuelve a abrirla. La app debe seguir disponible; no se debe cerrar ni quedar bloqueada en el logo. En esta entrega no se enviarán pushes reales todavía: es intencional mientras se termina la configuración FCM y se prueba el registro manual en dos teléfonos.

## Resultado de validación local

La entrega se preparó tras obtener estos resultados: `pnpm check` correcto, `pnpm lint` correcto, Vitest con **4 pruebas aprobadas** y 1 omitida, `expo-doctor` con **18/18 comprobaciones aprobadas**, y `expo export --platform android` capaz de producir el bundle Hermes de Android. La compilación Gradle completa no se terminó en este entorno porque no dispone de Android SDK configurado; eso no es un error del código ni usa cuota de Expo.
