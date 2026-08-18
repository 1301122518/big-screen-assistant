package com.bigscreentv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * WebView 播放页 - 加载 Web 前端播放器
 * 
 * 架构说明：
 * - 使用 WebView 加载服务端的 Web 前端页面
 * - 通过 JavascriptInterface 与 Web 前端通信
 * - 支持 D-pad 遥控操作
 */
class WebViewActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_SERVER_URL = "server_url"
        private const val TAG = "WebViewActivity"
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvStatus: TextView
    private lateinit var app: BigScreenTVApp
    
    private var serverUrl: String = ""
    private var isFullScreen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 全屏沉浸式
        setupFullScreen()
        setContentView(R.layout.activity_webview)
        
        app = BigScreenTVApp.instance
        serverUrl = intent.getStringExtra(EXTRA_SERVER_URL) ?: app.prefs.serverUrl
        
        if (serverUrl.isEmpty()) {
            finish()
            return
        }
        
        initViews()
        setupWebView()
        loadPlayerPage()
    }

    private fun setupFullScreen() {
        // 保持屏幕常亮
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // 沉浸式全屏
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
        
        // 隐藏状态栏和导航栏
        @Suppress("DEPRECATION")
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
    }

    private fun initViews() {
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        tvStatus = findViewById(R.id.tvStatus)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        // WebView 基础设置
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            
            // 缓存设置
            cacheMode = WebSettings.LOAD_DEFAULT
            
            // 缩放设置
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            
            // 混合内容
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            
            // 用户代理
            userAgentString = "$userAgentString BigScreenTV/1.0"
        }
        
        // 添加 JavaScript 接口
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidTV")
        
        // WebViewClient - 处理页面加载
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                tvStatus.visibility = View.GONE
                
                // 注入 TV 优化脚本
                injectTVOptimizations()
            }
            
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                tvStatus.text = "加载失败: $description"
                tvStatus.visibility = View.VISIBLE
            }
            
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                // 拦截外部链接，用系统浏览器打开
                val url = request?.url?.toString() ?: return false
                if (!url.startsWith(serverUrl) && !url.startsWith("file://")) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (e: Exception) {
                        // 忽略
                    }
                    return true
                }
                return false
            }
        }
        
        // WebChromeClient - 处理进度和全屏视频
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                progressBar.progress = newProgress
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    tvStatus.text = "加载中... $newProgress%"
                }
            }
            
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    android.util.Log.d(TAG, "[JS] ${it.message()}")
                }
                return true
            }
        }
        
        // 长按菜单（调试用）
        webView.setOnLongClickListener {
            showDebugMenu()
            true
        }
    }

    private fun loadPlayerPage() {
        tvStatus.text = "正在连接服务器..."
        progressBar.visibility = View.VISIBLE
        tvStatus.visibility = View.VISIBLE
        
        // 加载播放器页面
        val playerUrl = "$serverUrl/player"
        webView.loadUrl(playerUrl)
    }

    private fun injectTVOptimizations() {
        // 注入 TV 优化的 JavaScript
        val js = """
            (function() {
                // 标记为 TV 环境
                window.isTV = true;
                window.deviceType = 'android-tv';
                
                // 优化焦点管理
                document.addEventListener('keydown', function(e) {
                    // 通知 Android 原生层
                    if (window.AndroidTV) {
                        window.AndroidTV.onKeyEvent(e.key, e.keyCode, e.type);
                    }
                }, true);
                
                // 禁用触摸提示（TV 不需要）
                document.body.style.cursor = 'none';
                
                // 优化视频播放
                document.addEventListener('play', function(e) {
                    if (e.target.tagName === 'VIDEO') {
                        e.target.setAttribute('playsinline', '');
                    }
                }, true);
                
                console.log('TV optimizations injected');
            })();
        """.trimIndent()
        
        webView.evaluateJavascript(js, null)
    }

    /**
     * JavaScript 接口 - 供 Web 前端调用
     */
    inner class WebAppInterface(private val activity: Activity) {
        
        @JavascriptInterface
        fun onKeyEvent(key: String, keyCode: Int, eventType: String) {
            runOnUiThread {
                // 处理 Web 前端传来的按键事件
                when (key) {
                    "Back", "Escape" -> onBackPressed()
                    "Home" -> goToConfig()
                }
            }
        }
        
        @JavascriptInterface
        fun getServerUrl(): String = serverUrl
        
        @JavascriptInterface
        fun getDeviceId(): String {
            return android.os.Build.MODEL + "_" + android.os.Build.SERIAL
        }
        
        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                android.widget.Toast.makeText(activity, message, android.widget.Toast.LENGTH_SHORT).show()
            }
        }
        
        @JavascriptInterface
        fun goBack() {
            runOnUiThread {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    onBackPressed()
                }
            }
        }
        
        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                finish()
            }
        }
    }

    // D-pad 按键处理
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                // 确认键 - 触发点击
                webView.dispatchKeyEvent(event)
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return true
                }
                // 双击返回退出
                if (doubleBackToExitPressedOnce) {
                    finish()
                    return true
                }
                doubleBackToExitPressedOnce = true
                android.widget.Toast.makeText(this, "再按一次退出", android.widget.Toast.LENGTH_SHORT).show()
                android.os.Handler().postDelayed({ doubleBackToExitPressedOnce = false }, 2000)
                return true
            }
            KeyEvent.KEYCODE_MENU -> {
                showDebugMenu()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    private var doubleBackToExitPressedOnce = false

    private fun showDebugMenu() {
        android.app.AlertDialog.Builder(this)
            .setTitle("调试菜单")
            .setItems(arrayOf(
                "刷新页面",
                "返回配置",
                "清除缓存",
                "退出"
            )) { _, which ->
                when (which) {
                    0 -> webView.reload()
                    1 -> goToConfig()
                    2 -> {
                        webView.clearCache(true)
                        webView.clearHistory()
                        android.widget.Toast.makeText(this, "缓存已清除", android.widget.Toast.LENGTH_SHORT).show()
                    }
                    3 -> finish()
                }
            }
            .show()
    }

    private fun goToConfig() {
        startActivity(Intent(this, ConfigActivity::class.java))
        finish()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
