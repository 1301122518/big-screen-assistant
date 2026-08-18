package com.bigscreentv

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * 原生播放页 - 备用方案
 * 当 WebView 方案不可用时使用
 */
class PlayerActivity : AppCompatActivity() {

    private lateinit var app: BigScreenTVApp
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvStatus: TextView
    private lateinit var container: FrameLayout

    private var serverUrl: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 全屏
        setupFullScreen()
        setContentView(R.layout.activity_player)
        
        app = BigScreenTVApp.instance
        serverUrl = intent.getStringExtra("server_url") ?: app.prefs.serverUrl
        
        if (serverUrl.isEmpty()) {
            finish()
            return
        }
        
        initViews()
    }

    private fun setupFullScreen() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )
    }

    private fun initViews() {
        container = findViewById(R.id.container)
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        tvStatus = findViewById(R.id.tvStatus)
        
        // 加载播放器
        loadPlayer()
    }

    private fun loadPlayer() {
        tvStatus.text = "正在连接..."
        
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        
        webView.loadUrl("$serverUrl/player")
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                finish()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }
}
