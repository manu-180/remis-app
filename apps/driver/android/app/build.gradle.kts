import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

val localProps = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localProps.load(localPropertiesFile.inputStream())
}

val keyProps = Properties()
val keyPropertiesFile = rootProject.file("key.properties")
if (keyPropertiesFile.exists()) {
    keyProps.load(keyPropertiesFile.inputStream())
}

val hasReleaseSigning =
    keyProps.getProperty("storeFile")?.isNotBlank() == true &&
        keyProps.getProperty("storePassword")?.isNotBlank() == true &&
        keyProps.getProperty("keyAlias")?.isNotBlank() == true &&
        keyProps.getProperty("keyPassword")?.isNotBlank() == true

android {
    namespace = "com.remis.remis_driver"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.remis.remis_driver"
        minSdk = 24          // Android 7 — spec requirement
        targetSdk = 35
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Lee la API key desde (en orden):
        //   1. Env var GOOGLE_MAPS_API_KEY  → usado por CI (más robusto que escribir a local.properties)
        //   2. local.properties             → usado por dev local (vía pnpm env:sync)
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] =
            System.getenv("GOOGLE_MAPS_API_KEY")
            ?: localProps.getProperty("GOOGLE_MAPS_API_KEY")
            ?: ""
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(keyProps.getProperty("storeFile"))
                storePassword = keyProps.getProperty("storePassword")
                keyAlias = keyProps.getProperty("keyAlias")
                keyPassword = keyProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            isShrinkResources = false
        }
        release {
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                logger.warn("⚠️ key.properties no configurado. Release se firmará con debug keystore.")
                signingConfigs.getByName("debug")
            }
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
    // play-services-location is provided transitively by flutter_background_geolocation.
    // Declaring an explicit version here caused IncompatibleClassChangeError at runtime
    // because two incompatible versions of FusedLocationProviderClient ended up in the DEX.
}
