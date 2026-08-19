# SocialSip - TODO

## Fase 1: Configuración Base y Autenticación
- [x] Configurar tema de color elegante y minimalista
- [x] Actualizar app.config.ts con branding de SocialSip
- [x] Crear logo y assets visuales
- [x] Implementar autenticación de usuario (Manus OAuth)
- [x] Crear pantalla de login/registro

## Fase 2: Pantalla Principal (Home - Check-in)
- [x] Diseñar e implementar home screen con botón check-in grande
- [x] Crear componente de botón check-in con animaciones
- [x] Implementar selector de bar/local
- [x] Conectar check-in con backend
- [x] Mostrar último check-in del usuario
- [x] Mostrar estado actual (online/offline)

## Fase 3: Gestión de Amigos
- [x] Crear pantalla de lista de amigos
- [x] Implementar búsqueda y filtrado de amigos
- [x] Crear pantalla para añadir amigos
- [ ] Implementar solicitudes de amistad
- [x] Mostrar estado de amigos (online/offline/en bar)
- [x] Mostrar bar actual de cada amigo
- [x] Mostrar hora del check-in

## Fase 4: Funcionalidades en Tiempo Real
- [ ] Implementar notificaciones push cuando amigos hacen check-in
- [x] Crear pantalla de actividad/notificaciones
- [ ] Implementar actualización en tiempo real de estado de amigos
- [x] Crear indicador de amigos cercanos

## Fase 5: Mapa y Ubicación
- [x] Implementar pantalla de mapa
- [x] Mostrar ubicación actual del usuario
- [ ] Mostrar ubicación de amigos en el mapa
- [x] Implementar geolocalización
- [ ] Crear marcadores de bares con amigos

## Fase 6: Perfil y Configuración
- [x] Crear pantalla de perfil
- [x] Implementar historial de check-ins
- [x] Crear configuración de privacidad
- [x] Implementar controles de notificaciones
- [x] Crear opción de cerrar sesión

## Fase 7: Base de Datos y Backend
- [x] Crear esquema de base de datos (usuarios, amigos, check-ins)
- [x] Implementar API tRPC para check-ins
- [ ] Implementar API tRPC para gestión de amigos
- [ ] Implementar API tRPC para obtener estado de amigos
- [ ] Configurar notificaciones push del servidor

## Fase 8: Pulido y Refinamiento
- [x] Revisar diseño visual general
- [ ] Optimizar animaciones y transiciones
- [x] Mejorar retroalimentación háptica
- [ ] Pruebas de flujos de usuario
- [ ] Optimización de rendimiento
- [ ] Pruebas en iOS y Android

## Fase 9: Características Avanzadas (Opcional)
- [ ] Historial de check-ins con estadísticas
- [ ] Recomendaciones de bares populares
- [ ] Integración con redes sociales
- [ ] Compartir ubicación con grupos específicos
- [ ] Modo "no molestar"


## Entrega de archivos
- [x] Preparar paquete fuente completo para edición en Android Studio, Android SDK o VS Code
- [x] Generar variante Android nativa si el entorno lo permite
- [x] Validar el contenido del archivo comprimido y documentar la apertura
- [x] Entregar el paquete descargable al usuario

## Nota de entrega

El proyecto usa Expo/React Native. La carpeta `android/` se generará solo para la variante Android nativa; el código fuente principal seguirá siendo compartido entre iOS y Android.



## Autenticación y Backend Real (Fase Activa)
- [ ] Revisar esquema Drizzle y tablas de base de datos en el servidor
- [ ] Implementar autenticación real de usuarios con sesión persistente
- [ ] Crear tablas de perfiles, amistades, bares y check-ins en PostgreSQL
- [ ] Implementar endpoints tRPC para check-ins en tiempo real
- [ ] Implementar gestión de solicitudes de amistad en backend
- [x] Conectar pantallas móviles de SocialSip con tRPC y TanStack Query
- [ ] Validar flujos de autenticación, errores de red y estados vacíos


## Uso real en dispositivo y Historias (Fase Activa)
- [x] Exigir inicio de sesión antes de mostrar las pestañas
- [x] Añadir pantalla de login con OAuth y estado de carga/error
- [x] Solicitar permiso de ubicación y obtener coordenadas reales
- [x] Mostrar ubicación real en mapa nativo con marcador propio
- [x] Conectar check-ins y feed con la sesión y base de datos reales
- [x] Crear tablas y APIs para historias y música
- [x] Crear pantalla de Historias de amigos y contenido público
- [x] Permitir subir foto/video con audio y elegir audiencia
- [x] Añadir controles de privacidad para ubicación e historias
- [ ] Probar el flujo completo en un dispositivo Android y otro iOS


## Arquitectura Independiente (Fuera de Manus)
- [x] Diseñar arquitectura backend y servicios externos propios
- [x] Seleccionar proveedores para autenticación, base de datos, almacenamiento y mapas
- [x] Documentar guía paso a paso de migración y configuración externa


## Migración Independiente a Supabase (Fase Activa)
- [x] Diseñar plan de migración paso a paso a Supabase y servicios propios
- [x] Solicitar al usuario la URL y la Anon Key de su proyecto Supabase mediante secretos seguros
- [x] Crear esquema SQL en Supabase para usuarios, perfiles, amistades, bares, check-ins e historias
- [x] Instalar `@supabase/supabase-js` en la aplicación móvil
- [x] Reemplazar la autenticación Manus por Supabase Auth (correo, contraseña y sesión persistente)
- [x] Reemplazar las llamadas tRPC/backend por consultas directas a Supabase
- [x] Configurar Supabase Storage para subir fotos y música de las Historias
- [x] Documentar la configuración externa y guardar checkpoint final


## Corrección de confirmación de email móvil
- [x] Añadir `socialsip://auth/callback` a las Redirect URLs permitidas en Supabase Auth
- [x] Fijar el esquema móvil estable `socialsip` en app.config.ts
- [x] Añadir `emailRedirectTo` al registro de Supabase
- [x] Crear callback `app/auth/callback.tsx` para intercambiar el código PKCE
- [ ] Regenerar el APK después del cambio de esquema
- [ ] Probar registro, correo de confirmación y retorno al APK


## Google OAuth (Supabase Auth)
- [x] Diseñar integración de Google Sign-In con Supabase Auth y deep linking `socialsip://auth/callback`
- [x] Implementar botón de Google en `app/login.tsx` usando `supabase.auth.signInWithOAuth`
- [x] Guiar al usuario paso a paso para configurar Google Cloud Console y Supabase Provider
- [ ] Validar compilación y probar inicio de sesión rápido con Google en el APK nuevo


## Corrección de autenticación en APK
- [x] Corregir `Invalid flow state` al volver de Google OAuth
- [x] Corregir el callback PKCE y la persistencia de sesión en Android
- [ ] Corregir el registro por email y los enlaces inválidos/caducados
- [ ] Configurar y documentar la opción de desactivar confirmación de email para pruebas
- [ ] Validar login Google y registro email en un APK nuevo

## Corrección solicitada: experiencia limpia y ubicación real
- [x] Eliminar nombres, bares, ubicaciones, actividades y datos ficticios de todas las pantallas; dejar estados vacíos reales para una cuenta nueva.
- [x] Mostrar el nombre elegido por el usuario y usar el correo como respaldo tras iniciar sesión.
- [x] Corregir el mapa nativo para que renderice en Android/iOS y muestre la posición real del dispositivo.
- [x] Implementar actualización de ubicación en tiempo real con permisos, manejo de errores y limpieza de suscripciones.
- [x] Revisar que check-ins, amigos e Historias consuman solo datos reales de Supabase y no mocks.
- [x] Ejecutar check, lint y pruebas; guardar checkpoint estable.

## Nuevo branding solicitado: Sky Night
- [x] Cambiar el nombre visible de la aplicación a Sky Night.
- [x] Usar “time to drink” como subtítulo visible en bienvenida, autenticación y superficies principales.
- [x] Eliminar referencias visibles restantes a SocialSip en la interfaz y documentación de uso final.
- [x] Actualizar la configuración Expo y el identificador de branding sin modificar el slug técnico ni el esquema socialsip.

## Evolución social solicitada (Fase Activa)
- [x] Añadir botón de ojo (toggle) en campos de contraseña para login y registro
- [x] Incluir mensaje claro y consciente sobre el uso de la ubicación en todo momento durante el inicio de sesión
- [x] Mover Historias desde la pestaña independiente hacia el Perfil, añadiendo foto de perfil, foto de portada y gestor de historias
- [x] Integrar un catálogo de música variada estilo Facebook en la creación de Historias
- [x] Añadir código QR personal en Amigos para escanear y conectar con otros usuarios cercanos
- [x] Ocultar la pestaña independiente de Historias y reestructurar el menú inferior
- [x] Actualizar el esquema SQL y validar compilación, linter y pruebas

## Privacidad, música y descubrimiento cercano
- [x] Mover el aviso de ubicación desde Login a una tarjeta posterior al inicio de sesión, con opción clara de aceptar o posponer.
- [x] Hacer desplazable la pantalla de Login para mostrar todos los controles en dispositivos pequeños.
- [x] No integrar Jamendo: decisión final del usuario; se mantiene la biblioteca propia de Supabase.
- [x] Mantener Historias con expiración real de 24 horas y permitir eliminación manual inmediata.
- [x] Añadir opción de Perfil público y consentimiento separado para aparecer en descubrimiento cercano.
- [x] Mostrar solo usuarios cercanos que tengan Perfil público y descubrimiento activados, sin exponer coordenadas exactas.
- [x] Implementar match/solicitud desde el descubrimiento cercano con estado real en Supabase.
- [x] Validar TypeScript, linter, pruebas y guardar checkpoint actualizado.

- [ ] Ejecutar `supabase/migrations/0004_discovery_story_privacy.sql` en el SQL Editor de Supabase.
- [x] No introducir `JAMENDO_CLIENT_ID`: decisión final del usuario.

- [x] Retirar integración de Jamendo y dejar exclusivamente la biblioteca musical propia de Supabase.

## Nuevas peticiones detalladas:
- [x] Investigar bares y lugares de bebida reales en Venezuela y permitir filtrarlos cerca de la dirección o país del usuario.
- [x] Permitir agregar un nuevo bar seleccionando directamente un punto exacto en el mapa o ingresando su dirección.
- [x] Mostrar en el mapa los check-ins activos de los amigos para saber exactamente dónde están.
- [x] Enviar notificaciones de actividad en tiempo real a la pestaña Actividad cuando los amigos realizan check-in o check-out.
- [x] Corregir el escáner QR de la cámara para que lea códigos y abra perfiles reales sin errores.
- [x] Reparar la subida de fotos de perfil y de portada guardándolas de forma segura en Supabase Storage.
- [x] Centrar y perfeccionar el diseño de los botones en la pantalla de Configuración.
- [x] Validar TypeScript, linter, pruebas y guardar checkpoint estable.

- [ ] Ejecutar `supabase/migrations/0005_venues_activity.sql` en Supabase para activar venues geolocalizados, actividad y Realtime.

## Rediseño nocturno y nuevas funciones:
- [x] Definir tokens visuales para azul marino, azul medianoche, negro azabache, plata y blanco lunar en `theme.config.js`.
- [x] Extender la base de datos con reacciones emoji en la tabla `activities`.
- [x] Rediseñar la interfaz global de Sky Night con el nuevo sistema nocturno profesional.
- [x] Añadir selector de reacciones emoji (🍺, 🔥, 🍻, 🚀, ❤️) en las notificaciones de check-in de la pestaña Actividad.
- [x] Mostrar indicadores de progreso, porcentajes y estados animados al subir fotos de perfil y portada.
- [x] Validar compilación TypeScript, linter y guardar checkpoint estable.

## Optimización de Storage multimedia:
- [x] Crear bucket `profiles` separado con políticas RLS por usuario.
- [x] Comprimir y limitar avatares, portadas e imágenes de historias antes de subirlas.
- [x] Eliminar la imagen anterior después de guardar correctamente un nuevo avatar o portada.
- [x] Limpiar archivos multimedia de historias eliminadas o expiradas mediante una cola segura.
- [x] Validar el flujo multimedia y guardar un checkpoint optimizado.

## Nuevas mejoras multimedia y mapa 3D:
- [x] Validar vídeos de historias con límite de 15 segundos y tamaño máximo antes de comprimir.
- [x] Comprimir automáticamente vídeos de historias con progreso visible.
- [x] Añadir caché persistente de Expo Image para avatares, portadas y perfiles públicos.
- [x] Crear visor inmersivo de historias con barra de progreso de 24 horas.
- [x] Ampliar el mapa y añadir perspectiva 3D con cámara inclinada.
- [x] Validar compilación, pruebas y rendimiento nativo.

## Reparación de perfil y edición de nombre:
- [x] Verificar que avatar y portada se guarden, se lean y se puedan recargar desde Storage antes de mostrar éxito.
- [x] Añadir migración para limitar el cambio de nombre a una vez cada 7 días.
- [x] Añadir lápiz y formulario de edición de nombre en Perfil.
- [x] Eliminar la etiqueta visual Sky Night VIP.
- [x] Validar permisos, errores, compilación y pruebas del perfil.

## Biografía personal:
- [x] Añadir el campo `bio` de hasta 120 caracteres en profiles.
- [x] Añadir edición inline de biografía bajo el nombre del usuario.
- [x] Mostrar la biografía en perfiles públicos.
- [x] Validar TypeScript, linter y pruebas antes de generar APK.
- [ ] Ejecutar `supabase/migrations/0010_profile_bio.sql` en Supabase antes de probar el guardado.

## Limpieza de autenticación:
- [x] Eliminar la tarjeta informativa sobre Supabase de la pantalla de inicio de sesión sin afectar los controles de acceso.

## Compilación local Android:
- [x] Aumentar el timeout del Gradle Wrapper para conexiones lentas durante la primera descarga.

## Estados avanzados:
- [x] Añadir respuestas rápidas con emojis persistentes por Estado y usuario.
- [x] Registrar vistas únicas por Estado y mostrar al autor quién lo abrió.
- [x] Añadir privacidad de Estado para todos los amigos, amigos cercanos o público.
- [x] Añadir gestión de amigos cercanos desde la pestaña Amigos.
- [x] Mantener música, audio, vídeo, expiración de 24 horas y limpieza de Storage.
- [ ] Ejecutar `supabase/migrations/0011_story_reactions_views_privacy.sql` en Supabase.
- [ ] Generar y probar el APK o compilación local con los flujos nativos.
- [ ] Intentar una compilación remota APK mediante una cuenta Expo autorizada y entregar el archivo resultante.
- [ ] Guiar la compilación local en Linux usando Node.js aislado de los conflictos de apt y validar el APK generado.
- [x] Reintentar el envío de una compilación Android remota mediante Expo y registrar su resultado.
- [x] Inventariar las funciones actuales de Sky Night y registrar las nuevas modificaciones acordadas con el usuario.

## Evolución a Tragos Sociales
- [x] Cambiar el nombre visible y los textos de marca de Sky Night a Tragos Sociales.
- [x] Reforzar la actualización automática de datos mediante Realtime y refresco al volver a primer plano.
- [x] Rediseñar el mapa nativo como una vista oscura de pantalla completa con cabecera y controles flotantes inspirados en la referencia aprobada.
- [x] Revisar los flujos principales para eliminar estados desactualizados y mejorar la respuesta de la interfaz.
- [x] Validar TypeScript, linter y pruebas después de las mejoras.

## Notificaciones push reales
- [x] Registrar permiso y token Expo Push por dispositivo físico.
- [x] Crear tabla y políticas RLS para guardar tokens de notificaciones del usuario.
- [x] Preparar función segura en Supabase para enviar push por check-ins, solicitudes y reacciones.
- [x] Abrir la sección correcta al tocar una notificación recibida.
- [ ] Configurar credenciales Android/iOS y probar push en una compilación nativa física.
- [x] Validar TypeScript, linter y pruebas de la integración.
- [x] Guiar la ejecución de la migración 0013 y confirmar las tablas de tokens.
- [ ] Guiar el despliegue de la función y el webhook de actividad en Supabase.
- [x] Crear y aplicar el trigger SQL de actividades como alternativa al menú Webhooks no disponible.
- [ ] Vincular Expo, crear una build nativa y probar notificaciones entre dos dispositivos.

## Entrega local actualizada
- [x] Crear y entregar el ZIP actualizado de Tragos Sociales con Android nativo y la integración push.
- [x] Corregir el acceso a notificaciones nativas cuando la aplicación se abre en web y regenerar el ZIP.

## Vinculación Expo
- [ ] Verificar Node.js y preparar Expo CLI en la laptop Linux.
- [ ] Iniciar sesión y vincular el proyecto local con la cuenta Expo del usuario.
- [ ] Guardar el Expo Project ID en la configuración para notificaciones push.
- [ ] Confirmar el enlace y explicar la compilación de prueba en dispositivo.
- [x] Reparar la instalación de Node.js que causa segmentación y restaurar npm mediante NVM.
- [x] Recrear el directorio NVM faltante y completar la carga de nvm.sh.
- [x] Cargar NVM desde /root/.config/nvm y eliminar temporalmente PREFIX antes de instalar Node.js.
- [ ] Corregir app.config.ts en la copia local para que EAS pueda leer Expo config.
- [ ] Convertir la configuración local a app.config.js compatible con EAS y conservar respaldo TypeScript.
- [ ] Aislar la carpeta TragosSociales como repositorio para que EAS no empaquete archivos grandes de /root.

## Corrección de arranque Android
- [x] Diagnosticar por qué la APK queda detenida en el logo inicial.
- [ ] Corregir el flujo de inicialización y validar el arranque en una build Android nueva.

## Validación integral antes de próxima build
- [x] Auditar de nuevo el arranque Android, la configuración Expo y dependencias nativas antes de otra subida.
- [x] Añadir una pantalla de recuperación o error visible para que la app nunca quede detenida silenciosamente en el logo.
- [x] Preparar una única sustitución completa y validada para la próxima build Expo.
- [x] Instalar expo-asset y alinear las versiones requeridas por Expo SDK 54 según Expo Doctor.

## Cierre al aceptar notificaciones
- [x] Aislar el cierre causado al conceder el permiso Android de notificaciones.
- [x] Diferir y blindar el registro del token push para que nunca cierre la app.

## Automatización de Expo solicitada
- [ ] Comprobar si hay acceso autorizado a Expo para enviar la build corregida sin operar la laptop del usuario.

## Organización local de la laptop
- [ ] Inventariar las copias del proyecto, ZIPs y APKs presentes en la laptop del usuario.
- [ ] Crear una única estructura de carpetas para proyecto, actualizaciones y APKs.
- [ ] Mover archivos sin pérdida y eliminar solo duplicados confirmados.
- [ ] Documentar el lugar exacto donde guardar y aplicar cada actualización futura.

## Validación local posterior al reemplazo
- [x] Cargar temporalmente la configuración pública de Supabase y Google Maps en la terminal Linux para completar las pruebas sin iniciar una build Expo.

## Empaquetado EAS bloqueado
- [x] Identificar la carpeta que eleva el proyecto local a 633 MB: `node_modules` ocupa 629 MB.
- [x] Excluir temporalmente `node_modules` del archivo de subida EAS sin eliminar código fuente.
- [x] Confirmar una compresión pequeña antes de reintentar la build APK.
- [x] Crear una copia temporal de compilación sin `node_modules` para preservar intacta la carpeta original del usuario.
- [x] Enlazar las dependencias existentes desde la copia ligera para que Expo resuelva plugins sin agregar 629 MB al paquete.
- [x] Aislar la copia temporal en un repositorio Git propio para evitar que EAS recorra `/root/.local/share/pnpm/store`.
- [x] Retirar el enlace `node_modules` de la copia EAS para impedir que su destino de 629 MB entre en el tarball.
- [x] Desactivar `app.config.js` únicamente en la copia EAS para que Expo lea el `app.json` estático sin plugins.
- [x] Analizar el log remoto de la build EAS 636fae99 fallida en la fase Install dependencies antes de otro intento.
- [x] No recomendar otra build APK hasta corregir y verificar la causa exacta del fallo remoto de dependencias.
- [x] Confirmar que el lockfile v9 se instala correctamente con pnpm 9.12.0 y fijar esa versión mediante Corepack en el perfil EAS preview.
- [x] Analizar el primer error de la fase Run gradlew de la build EAS 35d45a4e antes de otro intento de APK.
- [x] Fijar Java 17 en el perfil EAS preview para sustituir el Java 11 remoto incompatible con Android Gradle Plugin.

## Retorno de autenticación Android
- [x] Contrastar el callback `socialsip://` de Supabase/Google con el esquema, intent filter y manejador OAuth de la APK compilada.
- [x] Corregir el retorno tras login por correo y Google para que abra la app instalada en vez de mostrar “No pudimos abrir Tragos Sociales”.
- [x] Corregir el flujo del navegador integrado que permanece bloqueado al recibir el retorno de Google o confirmación por correo.

## Auditoría integral previa a una nueva APK
- [x] Revisar todos los flujos de autenticación, callbacks y rutas legacy para eliminar redirecciones conflictivas.
- [x] Revisar manifiesto Android, esquema de enlace, dependencias nativas y configuración EAS contra Expo SDK 54.
- [x] Ejecutar validaciones de tipo, lint, regresiones de arranque, autenticación y configuración antes de otra build.
- [ ] Generar e instalar la APK auditada para probar físicamente Google, correo y retorno al inicio de la app.

## Aplicación de la actualización auditada
- [ ] Aplicar `TragosSociales-Auth-Audited-Fix.zip` sobre la carpeta original en la laptop.
- [ ] Crear el contexto ligero `/root/TragosSociales-EAS` con el script auditado.
- [ ] Ejecutar una única build EAS preview desde el contexto ligero y realizar la prueba física de autenticación.

## Diagnóstico de callback en APK instalada
- [x] Revisar el manifiesto efectivo y la configuración de expo-web-browser de la APK aa5b69ae; se identificó BrowserLauncherActivity desactivada.
- [x] Corregir el retorno Android habilitando BrowserLauncherActivity, su ciclo de vida y el intent-filter exacto de `socialsip://auth/callback`.
- [ ] Generar e instalar una APK con BrowserLauncherActivity para confirmar el retorno físico de Google y correo.

## Análisis del fallo persistente en dispositivo
- [x] Analizar la grabación: el callback llega a la app, pero dos manejadores confirman la misma sesión y muestran el error interno.
- [x] Corregir la condición de carrera PKCE con una promesa compartida por código, un único manejador de intercambio y cierre seguro del navegador.
- [x] Validar TypeScript, lint, 8 regresiones y Expo Doctor 18/18 antes de otra APK.
- [ ] Generar una APK con la corrección de carrera PKCE y verificar Google y correo en el dispositivo físico.
