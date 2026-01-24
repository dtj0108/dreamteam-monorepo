plugins {
    id("com.android.library")
    kotlin("android")
}

group = "expo.modules.chimesdk"

android {
    namespace = "expo.modules.chimesdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 23
    }

    buildFeatures {
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation("expo:expo-modules-core:1.14.0")
    implementation("com.amazonaws:amazon-chime-sdk:0.25.0")
    implementation("com.amazonaws:amazon-chime-sdk-media:0.20.1")
}
