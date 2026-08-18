package com.bigscreentv

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * 配置页面 - 首次启动时显示
 * 用于输入服务器地址并测试连接
 */
class ConfigActivity : AppCompatActivity() {

    private lateinit var app: BigScreenTVApp
    private lateinit var etServerUrl: EditText
    private lateinit var btnTest: Button
    private lateinit var btnConnect: Button
    private lateinit var btnSettings: Button
    private lateinit var tvStatus: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var client: OkHttpClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_config)

        app = BigScreenTVApp.instance
        initViews()
        loadSavedConfig()
        
        // 如果已配置且开启自动连接，直接进入播放页
        if (app.prefs.serverUrl.isNotEmpty() && app.prefs.autoConnect) {
            startPlayer()
        }
    }

    private fun initViews() {
        etServerUrl = findViewById(R.id.etServerUrl)
        btnTest = findViewById(R.id.btnTest)
        btnConnect = findViewById(R.id.btnConnect)
        btnSettings = findViewById(R.id.btnSettings)
        tvStatus = findViewById(R.id.tvStatus)
        progressBar = findViewById(R.id.progressBar)

        client = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .build()

        btnTest.setOnClickListener { testConnection() }
        btnConnect.setOnClickListener { startPlayer() }
        btnSettings.setOnClickListener { showSettings() }

        // D-pad 焦点设置
        etServerUrl.requestFocus()
    }

    private fun loadSavedConfig() {
        val savedUrl = app.prefs.serverUrl
        if (savedUrl.isNotEmpty()) {
            etServerUrl.setText(savedUrl)
            tvStatus.text = "上次连接: $savedUrl"
        }
    }

    private fun testConnection() {
        val url = etServerUrl.text.toString().trim()
        if (url.isEmpty()) {
            showToast("请输入服务器地址")
            return
        }

        setLoading(true)
        tvStatus.text = "正在测试连接..."

        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    val apiUrl = normalizeUrl(url) + "/api/health"
                    val request = Request.Builder().url(apiUrl).build()
                    val response = client.newCall(request).execute()
                    if (response.isSuccessful) {
                        Result.success("连接成功")
                    } else {
                        Result.failure(Exception("服务器返回: ${response.code}"))
                    }
                } catch (e: Exception) {
                    Result.failure(e)
                }
            }

            setLoading(false)
            result.onSuccess {
                tvStatus.text = "✓ 连接成功"
                app.prefs.serverUrl = url
                app.prefs.lastConnectedTime = System.currentTimeMillis()
            }.onFailure {
                tvStatus.text = "✗ 连接失败: ${it.message}"
            }
        }
    }

    private fun startPlayer() {
        val url = etServerUrl.text.toString().trim()
        if (url.isEmpty()) {
            showToast("请输入服务器地址")
            return
        }

        app.prefs.serverUrl = url
        app.prefs.lastConnectedTime = System.currentTimeMillis()

        val intent = Intent(this, WebViewActivity::class.java).apply {
            putExtra(WebViewActivity.EXTRA_SERVER_URL, normalizeUrl(url))
        }
        startActivity(intent)
    }

    private fun showSettings() {
        // 简单的设置弹窗，可以扩展为完整的设置页面
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle("设置")
            .setItems(arrayOf("清除配置", "关于")) { _, which ->
                when (which) {
                    0 -> {
                        app.prefs.clear()
                        etServerUrl.setText("")
                        tvStatus.text = "配置已清除"
                        showToast("配置已清除")
                    }
                    1 -> {
                        android.app.AlertDialog.Builder(this)
                            .setTitle("关于")
                            .setMessage("大屏操作助手 TV 版\n版本: 1.0.0\n\n连接到服务端后可播放图片、视频、网页素材")
                            .setPositiveButton("确定", null)
                            .show()
                    }
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnTest.isEnabled = !loading
        btnConnect.isEnabled = !loading
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
