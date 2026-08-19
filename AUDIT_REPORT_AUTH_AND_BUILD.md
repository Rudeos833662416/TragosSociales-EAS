# Auditoría integral: autenticación Android y build EAS

## Resultado

La fuente de **Tragos Sociales** fue revisada después de la APK que logró compilar pero quedó bloqueada al regresar de Google o de la confirmación por correo. Se corrigieron los dos grupos de problemas comprobados por registros reales: el entorno de compilación EAS y el retorno móvil de Supabase.

## Hallazgos y correcciones

| Área | Evidencia | Corrección aplicada |
|---|---|---|
| Dependencias remotas | EAS ignoró el lockfile y falló con `ERR_PNPM_NO_LOCKFILE`. | El perfil `preview` activa Corepack y fija `pnpm` en `9.12.0`, la versión que acepta el lockfile. |
| Java remoto | Gradle indicó: “Android Gradle plugin requires Java 17… using Java 11”. | El perfil `preview` fija la imagen oficial `ubuntu-24.04-jdk-17-ndk-r27b`, correspondiente a Expo SDK 54 y Java 17. |
| Callback Android | El retorno `socialsip://auth/callback` quedaba atrapado en el navegador de autenticación. | Se reemplazó el filtro wildcard por el callback exacto: esquema `socialsip`, host `auth`, ruta `/callback`. |
| Procesamiento OAuth | El enlace podía llegar antes de que la pantalla callback estuviera montada. | Se añadió un manejador global de enlaces que completa la sesión desde el primer URL recibido. |
| Resultado del navegador | Android puede entregar el enlace al listener antes de resolver la sesión del navegador. | Google verifica primero si ya existe una sesión antes de mostrar una falsa cancelación. |
| PKCE y tokens | Una URL reconstruida podía perder hash, tokens o parámetros. | La ruta callback conserva el URL entrante original. |

## Validaciones ejecutadas

| Control | Resultado |
|---|---|
| TypeScript (`pnpm check`) | Aprobado |
| Linter Expo (`pnpm lint`) | Aprobado; solo aviso no bloqueante de módulo ESLint |
| Regresiones Vitest | 7 aprobadas; 1 omitida deliberadamente |
| Expo Doctor | 18/18 comprobaciones aprobadas |
| Config Expo resuelta | Esquema `socialsip`, paquete `com.app.socialsip`, callback exacto y plugins válidos |
| Script de contexto EAS | Genera una copia aislada de 5.5 MB sin `node_modules` |

## Prueba pendiente e imprescindible

La única validación que no puede realizarse sin el teléfono del usuario es la prueba física posterior a instalar la nueva APK. Deben probarse, en este orden: arranque, acceso con contraseña, Google y confirmación de una cuenta nueva. No se debe iniciar otra build hasta aplicar el ZIP y seguir `AUTH_CALLBACK_FIX_GUIDE.md`.
