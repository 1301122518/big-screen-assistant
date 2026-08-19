package com.bigscreentv

import android.app.Application
import android.content.Context
import java.util.UUID

/**
 * 大屏操作助手 TV 版 - Application 类
 */
class BigScreenTVApp : Application() {

    companion object {
        lateinit var instance: BigScreenTVApp
            private set
    }

    val prefs: AppPreferences by lazy { AppPreferences(this) }

    /**
     * 从 assets/config.json 读取配置
     * 如果 SharedPreferences 中有用户自定义别名，优先使用
     */
    fun loadAssetConfig(): AssetConfig {
        return try {
            val json = assets.open("config.json").bufferedReader().use { it.readText() }
            // 简单解析 JSON（避免引入额外依赖）
            val serverUrl = Regex("\"serverUrl\"\\s*:\\s*\"([^\"]+)\"").find(json)?.groupValues?.get(1) ?: ""
            val defaultName = Regex("\"deviceName\"\\s*:\\s*\"([^\"]+)\"").find(json)?.groupValues?.get(1) ?: "未命名设备"
            // 优先使用用户自定义别名
            val deviceName = prefs.deviceAlias.takeIf { it.isNotEmpty() } ?: defaultName
            AssetConfig(serverUrl = serverUrl, deviceName = deviceName)
        } catch (e: Exception) {
            AssetConfig(serverUrl = "", deviceName = "未命名设备")
        }
    }

    /**
     * 获取或生成设备唯一ID（首次运行时生成并保存）
     */
    fun getOrCreateDeviceId(): String {
        var deviceId = prefs.deviceId
        if (deviceId.isEmpty()) {
            deviceId = UUID.randomUUID().toString()
            prefs.deviceId = deviceId
        }
        return deviceId
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}

/**
 * assets/config.json 配置数据
 */
data class AssetConfig(
    val serverUrl: String,
    val deviceName: String
)

/**
 * 应用配置存储
 */
class AppPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("big_screen_tv", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_AUTO_CONNECT = "auto_connect"
        private const val KEY_LAST_CONNECTED = "last_connected"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_ALIAS = "device_alias"
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

    var deviceId: String
        get() = prefs.getString(KEY_DEVICE_ID, "") ?: ""
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var deviceAlias: String
        get() = prefs.getString(KEY_DEVICE_ALIAS, "") ?: ""
        set(value) = prefs.edit().putString(KEY_DEVICE_ALIAS, value).apply()

    fun clear() {
        // 保留 deviceId，清除其他配置
        val id = deviceId
        prefs.edit().clear().apply()
        deviceId = id
    }
}
