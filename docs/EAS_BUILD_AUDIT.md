# Auditoría de compilación EAS

La revisión de `android/gradle.properties` no encontró ninguna propiedad `org.gradle.java.home` ni otro ajuste que fuerce Java 11. El módulo `android/app/build.gradle` usa la configuración estándar de Expo/React Native y tampoco fija una versión de Java.

Por tanto, el fallo remoto de Gradle se originó en la imagen de compilación EAS que proporcionó Java 11. El perfil `preview` debe usar la imagen oficial `ubuntu-24.04-jdk-17-ndk-r27b`, compatible con Expo SDK 54 y Java 17.
