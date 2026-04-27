plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.remis.remis_driver"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
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

        // Google Maps API key injected via --dart-define-from-file
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = ""
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = false
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    implementation("com.google.android.gms:play-services-location:21.3.0")
}
