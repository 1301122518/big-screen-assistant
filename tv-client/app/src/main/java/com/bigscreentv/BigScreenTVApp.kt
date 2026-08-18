package com.bigscreentv

import android.app.Application
import android.content.Context

/**
 * 大屏操作助手 TV 版 - Application 类
 */
class BigScreenTVApp : Application() {

    companion object {
        lateinit var instance: BigScreenTVApp
            private set
    }

    val prefs: AppPreferences by lazy { AppPreferences(this) }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}

/**
 * 应用配置存储
 */
class AppPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("big_screen_tv", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_AUTO_CONNECT = "auto_connect"
        private const val KEY_LAST_CONNECTED = "last_connected"
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "") ?: ""
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value).apply()

    var autoConnect: Boolean
        get() = prefs.getBoolean(KEY_AUTO_CONNECT, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_CONNECT, value).apply()

    var lastConnectedTime: Long
        get() = prefs.getLong(KEY_LAST_CONNECTED, 0)
        set(value) = prefs.edit().putLong(KEY_LAST_CONNECTED, value).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }
}
