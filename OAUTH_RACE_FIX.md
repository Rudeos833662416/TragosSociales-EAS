# Corrección del callback de Google: carrera PKCE

## Qué mostraba la grabación

La grabación confirmó que Chrome entregaba el retorno de Google a Tragos Sociales. El primer mensaje visible, “No se pudo confirmar la sesión”, ocurría dentro de la app antes de que apareciera la pantalla de recuperación.

## Causa corregida

El mismo enlace `socialsip://auth/callback?code=...` era procesado a la vez por el manejador global y por la pantalla de callback. El segundo intento podía consultar la sesión antes de que el primer intercambio PKCE terminara, obteniendo una sesión vacía y provocando el error.

## Cambios incluidos

El intercambio ahora se comparte mediante una única promesa por código PKCE. El manejador raíz es el único responsable de completar la sesión y cerrar el navegador Android de forma segura. La pantalla de callback solo muestra el estado de confirmación y ya no ejecuta un segundo intercambio.

## Aplicación de la actualización

Extrae este ZIP sobre `/root/TragosSociales`, recrea el contexto limpio y compila desde esa copia:

```bash
cd /root
unzip -o TragosSociales-OAuth-Race-Fix.zip -d TragosSociales
cd /root/TragosSociales
bash scripts/create-eas-build-copy.sh
cd /root/TragosSociales-EAS
npx eas-cli@latest build --platform android --profile preview
```

Tras instalar la APK, prueba Google primero. Al elegir una cuenta, el navegador debe cerrarse y Tragos Sociales debe entrar a la sesión sin mostrar “No se pudo confirmar la sesión”.
