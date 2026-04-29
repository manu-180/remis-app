// Tell flutter_background_geolocation to compile against play-services-location:21.x
// so it picks tslocationmanager-v21 instead of the default 20.x binary.
// Without this, geolocator_android (which uses 21.x) lands in the APK while
// Transistorsoft's code was compiled expecting the 20.x API → IncompatibleClassChangeError.
extra["playServicesLocationVersion"] = "21.3.0"

allprojects {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("${project(":flutter_background_geolocation").projectDir}/libs")
        }
        maven {
            url = uri("https://s3.amazonaws.com/transistorsoft-releases")
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    plugins.withId("org.jetbrains.kotlin.android") {
        tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
            compilerOptions {
                languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_9)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
