# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep all Firebase classes (needed for FCM)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep WorkManager classes
-keep class androidx.work.** { *; }

# Keep OkHttp (HTTP client)
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }

# Keep app classes
-keep class com.smsgw.app.** { *; }
