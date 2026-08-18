# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# WebView JavaScript interface
-keepclassmembers class com.bigscreentv.WebAppInterface {
    public *;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class com.bigscreentv.model.** { *; }
