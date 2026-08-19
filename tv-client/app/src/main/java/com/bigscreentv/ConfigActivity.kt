package com.bigscreentv

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * 配置页面 - 启动时显示
 * 从 assets/config.json 读取配置，自动注册设备
 * 如果设备未批准，显示等待界面
 */
class ConfigActivity : AppCompatActivity() {

    private lateinit var app: BigScreenTVApp
    private lateinit var tvStatus: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvDeviceInfo: TextView
    private lateinit var client: OkHttpClient

    private var assetConfig: AssetConfig = AssetConfig("", "")
    private var deviceId: String = ""
    private var currentAlias: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_config)

        app = BigScreenTVApp.instance
        assetConfig = app.loadAssetConfig()
        deviceId = app.getOrCreateDeviceId()
        currentAlias = assetConfig.deviceName

        if (assetConfig.serverUrl.isEmpty()) {
            showToast("配置文件缺少 serverUrl，请检查 config.json")
            return
        }

        initViews()
        registerAndConnect()
    }

    private fun initViews() {
        tvStatus = findViewById(R.id.tvStatus)
        progressBar = findViewById(R.id.progressBar)
        tvDeviceInfo = findViewById(R.id.etServerUrl) // 复用原有 EditText 显示设备信息

        // 显示设备信息（只读）
        tvDeviceInfo.isEnabled = false
        tvDeviceInfo.setText("设备: $currentAlias (${deviceId.take(8)}...)")

        client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()

        // 长按设备信息区域弹出编辑别名对话框
        tvDeviceInfo.setOnLongClickListener {
            showEditAliasDialog()
            true
        }
    }

    /**
     * 显示编辑别名对话框
     */
    private fun showEditAliasDialog() {
        val editText = EditText(this).apply {
            setText(currentAlias)
            setSelection(text.length)
            hint = "输入新的设备别名"
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(this, R.style.Theme_BigScreenTV)
            .setTitle("编辑设备别名")
            .setView(editText)
            .setPositiveButton("保存") { _, _ ->
                val newAlias = editText.text.toString().trim()
                if (newAlias.isNotEmpty()) {
                    updateAlias(newAlias)
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    /**
     * 更新设备别名：同步到后端 + 保存到本地
     */
    private fun updateAlias(newAlias: String) {
        tvStatus.text = "正在更新别名..."

        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    val url = "${normalizeUrl(assetConfig.serverUrl)}/api/devices/$deviceId/alias"
                    val json = JSONObject().apply {
                        put("alias", newAlias)
                    }
                    val body = json.toString().toRequestBody("application/json".toMediaType())
                    val request = Request.Builder()
                        .url(url)
                        .patch(body)
                        .build()
                    val response = client.newCall(request).execute()
                    if (response.isSuccessful) {
                        Result.success(true)
                    } else {
                        Result.failure(Exception("服务器返回: ${response.code}"))
                    }
                } catch (e: Exception) {
                    Result.failure(e)
                }
            }

            result.onSuccess {
                // 保存到 SharedPreferences
                app.prefs.deviceAlias = newAlias
                currentAlias = newAlias
                tvDeviceInfo.text = "设备: $currentAlias (${deviceId.take(8)}...)"
                tvStatus.text = "✓ 别名已更新"
                showToast("别名已更新为: $newAlias")
            }.onFailure {
                tvStatus.text = "✗ 别名更新失败: ${it.message}"
                showToast("更新失败: ${it.message}")
            }
        }
    }

    /**
     * 注册设备并检查状态
     */
    private fun registerAndConnect() {
        setLoading(true)
        tvStatus.text = "正在注册设备..."

        lifecycleScope.launch {
            // 注册设备
            val registerResult = withContext(Dispatchers.IO) {
                try {
                    val url = "${normalizeUrl(assetConfig.serverUrl)}/api/devices/register"
                    val json = JSONObject().apply {
                        put("device_id", deviceId)
                        put("device_name", assetConfig.deviceName)
                        put("device_type", "tv")
                    }
                    val body = json.toString().toRequestBody("application/json".toMediaType())
                    val request = Request.Builder()
                        .url(url)
                        .post(body)
                        .build()
                    val response = client.newCall(request).execute()
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        val responseJson = JSONObject(responseBody ?: "{}")
                        val status = responseJson.optJSONObject("data")?.optString("status", "pending") ?: "pending"
                        Result.success(status)
                    } else {
                        Result.failure(Exception("服务器返回: ${response.code}"))
                    }
                } catch (e: Exception) {
                    Result.failure(e)
                }
            }

            registerResult.onSuccess { status ->
                when (status) {
                    "approved" -> {
                        tvStatus.text = "✓ 设备已批准，正在连接..."
                        app.prefs.serverUrl = assetConfig.serverUrl
                        app.prefs.lastConnectedTime = System.currentTimeMillis()
                        // 直接进入播放页
                        startPlayer()
                    }
                    "pending" -> {
                        tvStatus.text = "⏳ 设备已注册，等待管理员审批..."
                        setLoading(false)
                        // 开始轮询
                        startPolling()
                    }
                    "rejected" -> {
                        tvStatus.text = "✗ 设备已被管理员拒绝"
                        setLoading(false)
                    }
                }
            }.onFailure {
                tvStatus.text = "✗ 连接失败: ${it.message}"
                setLoading(false)
            }
        }
    }

    /**
     * 轮询设备状态
     */
    private fun startPolling() {
        lifecycleScope.launch {
            while (true) {
                kotlinx.coroutines.delay(3000)

                val result = withContext(Dispatchers.IO) {
                    try {
                        val url = "${normalizeUrl(assetConfig.serverUrl)}/api/devices/check/$deviceId"
                        val request = Request.Builder().url(url).build()
                        val response = client.newCall(request).execute()
                        if (response.isSuccessful) {
                            val responseBody = response.body?.string()
                            val responseJson = JSONObject(responseBody ?: "{}")
                            val status = responseJson.optJSONObject("data")?.optString("status", "pending") ?: "pending"
                            Result.success(status)
                        } else {
                            Result.failure(Exception("HTTP ${response.code}"))
                        }
                    } catch (e: Exception) {
                        Result.failure(e)
                    }
                }

                result.onSuccess { status ->
                    when (status) {
                        "approved" -> {
                            tvStatus.text = "✓ 设备已批准，正在连接..."
                            app.prefs.serverUrl = assetConfig.serverUrl
                            app.prefs.lastConnectedTime = System.currentTimeMillis()
                            startPlayer()
                            return@launch
                        }
                        "rejected" -> {
                            tvStatus.text = "✗ 设备已被管理员拒绝"
                            return@launch
                        }
                        "pending" -> {
                            tvStatus.text = "⏳ 等待管理员审批中..."
                        }
                    }
                }.onFailure {
                    // 网络错误，继续轮询
                }
            }
        }
    }

    private fun startPlayer() {
        val intent = Intent(this, WebViewActivity::class.java).apply {
            putExtra(WebViewActivity.EXTRA_SERVER_URL, normalizeUrl(assetConfig.serverUrl))
        }
        startActivity(intent)
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun normalizeUrl(url: String): String {
        var normalized = url.trim()
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://$normalized"
        }
        if (normalized.endsWith("/")) {
            normalized = normalized.dropLast(1)
        }
        return normalized
    }
}
