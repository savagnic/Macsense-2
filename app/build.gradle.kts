plugins {
 alias(libs.plugins.android.application)
 alias(libs.plugins.kotlin.android)
 alias(libs.plugins.kotlin.compose)
 alias(libs.plugins.google.devtools.ksp)
 alias(libs.plugins.secrets)
 alias(libs.plugins.kotlin.serialization)
}

ksp {
 arg("room.schemaLocation", "$projectDir/schemas")
}

android {
 namespace = "com.macsense.ai"
 compileSdk = 35

 defaultConfig {
 applicationId = "com.macsense.ai"
 minSdk = 26
 targetSdk = 35
 versionCode = 1
 versionName = "1.0"
 testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

 // Crash reporting is OFF by default in debug/default config.
 // Sentry is activated in the release build type below.
 // See SentryCrashReporter.kt and CrashReporting.kt for details.
 buildConfigField("boolean", "CRASH_REPORTING_ENABLED", "false")

 // SENTRY_DSN is injected from .env (via gradle-secrets-plugin).
 // Add SENTRY_DSN=https://your-key@sentry.io/project-id to your .env file.
 // Set to empty string here so debug builds compile without a real DSN.
 buildConfigField("String", "SENTRY_DSN", "\"${findProperty("SENTRY_DSN") ?: ""}\"")

 // Supabase sync credentials injected from .env / CI secrets; blank = offline-only build.
 buildConfigField("String", "SUPABASE_URL", "\"${findProperty("SUPABASE_URL") ?: ""}\"")
 buildConfigField("String", "SUPABASE_ANON_KEY", "\"${findProperty("SUPABASE_ANON_KEY") ?: ""}\"")
 // NOTE: there is deliberately no SUPABASE_ACCESS_TOKEN build field. A user session token
 // must never be compiled into a shipped artifact — it would be a shared, long-lived
 // credential belonging to whoever ran the build, readable by anyone who unzips the APK.
 // The token is supplied at runtime by SupabaseSessionProvider once a real authenticated
 // session exists; until then the install stays local-only.

 ndk {
 abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
 }
 externalNativeBuild {
 cmake {
 cppFlags += "-std=c++17"
 }
 }
 }

 externalNativeBuild {
 cmake {
 path = file("src/main/cpp/CMakeLists.txt")
 version = "3.22.1"
 }
 }

 buildTypes {
 release {
 isMinifyEnabled = true
 proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
 // Enable Sentry crash reporting in release builds.
 // Requires SENTRY_DSN to be set in your CI secrets / local .env.
 buildConfigField("boolean", "CRASH_REPORTING_ENABLED", "true")
 // Sentry DSN forwarded from project properties (injected by gradle-secrets)
 buildConfigField("String", "SENTRY_DSN", "\"${findProperty("SENTRY_DSN") ?: ""}\"")
 }
 }
 compileOptions {
 sourceCompatibility = JavaVersion.VERSION_11
 targetCompatibility = JavaVersion.VERSION_11
 }
 kotlinOptions {
 jvmTarget = "11"
 }
 buildFeatures {
 compose = true
 buildConfig = true
 }
 packaging {
 resources {
 excludes += "/META-INF/{AL2.0,LGPL2.1}"
 }
 }
}

secrets {
 propertiesFileName = ".env"
 defaultPropertiesFileName = ".env.example"
}

dependencies {
 testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
 implementation(libs.androidx.core.ktx)
 implementation(libs.retrofit)
 implementation(libs.retrofit.converter.kotlinx.serialization)
 implementation(libs.kotlinx.serialization.json)
 implementation(libs.okhttp)
 implementation(libs.androidx.work.runtime.ktx)
 implementation(libs.androidx.lifecycle.runtime.ktx)
 implementation(libs.androidx.activity.compose)
 implementation(platform(libs.androidx.compose.bom))
 implementation(libs.androidx.ui)
 implementation(libs.androidx.ui.graphics)
 implementation(libs.androidx.ui.tooling.preview)
 implementation(libs.androidx.material3)
 // Mic and other icons outside the small core set (VocalScanner, FlowCapture).
 implementation(libs.androidx.material.icons.extended)

 // Room components
 implementation(libs.androidx.room.runtime)
 implementation(libs.androidx.room.ktx)
 ksp(libs.androidx.room.compiler)

 // Navigation
 implementation(libs.androidx.navigation.compose)

 // Sentry Android SDK — crash reporting + performance tracing
 // DSN is injected via BuildConfig.SENTRY_DSN from .env / CI secrets
 implementation("io.sentry:sentry-android:7.6.0")

 testImplementation(libs.junit)
 testImplementation(libs.robolectric)
 testImplementation(libs.androidx.test.core)
 testImplementation(libs.androidx.test.runner)
 testImplementation(libs.okhttp.mockwebserver)
 testImplementation(libs.retrofit.converter.kotlinx.serialization)

 androidTestImplementation(libs.androidx.junit)
 androidTestImplementation(libs.androidx.espresso.core)
 androidTestImplementation(platform(libs.androidx.compose.bom))
 androidTestImplementation(libs.androidx.ui.test.junit4)
 androidTestImplementation(libs.androidx.room.testing)

 debugImplementation(libs.androidx.ui.tooling)
 debugImplementation(libs.androidx.ui.test.manifest)
}

tasks.withType<Test> {
 testLogging {
 showStandardStreams = true
 }
}
