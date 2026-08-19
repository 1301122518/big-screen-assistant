"""
大屏操作助手 - FastAPI 主入口（v3.0）
"""
import socket
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.config import PORT, UPLOAD_DIR, HLS_DIR
from backend.database import init_db
from backend.auth import ensure_default_user
from backend.routers import materials, player, auth, playlists, devices, tags, dashboard, audit
from backend.websocket_hub import ws_hub

# 前端构建目录
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# 管理端 WebSocket 连接管理
admin_ws_connections: dict[str, WebSocket] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    await init_db()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    HLS_DIR.mkdir(parents=True, exist_ok=True)
    ws_hub.start_heartbeat()
    # 确保默认用户存在
    await ensure_default_user()
    yield
    ws_hub.stop_heartbeat()
    # 关闭所有管理端 WS
    for ws in list(admin_ws_connections.values()):
        try:
            await ws.close()
        except Exception:
            pass


app = FastAPI(
    title="大屏操作助手",
    description="素材管理与大屏播放控制系统",
    version="3.0.0",
    lifespan=lifespan,
)

# GZip 压缩中间件
app.add_middleware(GZipMiddleware, minimum_size=1024)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"code": 0, "data": {"status": "ok", "version": "3.0.0"}, "message": "success"}


# 注册路由
app.include_router(auth.router)
app.include_router(materials.router)
app.include_router(player.router)
app.include_router(playlists.router)
app.include_router(devices.router)
app.include_router(tags.router)
app.include_router(dashboard.router)
app.include_router(audit.router)

# 挂载上传文件静态目录
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# 管理端 WebSocket（v3.0 新增）
@app.websocket("/api/ws/admin")
async def admin_websocket(websocket: WebSocket):
    """管理端 WebSocket - 推送设备状态、播放状态等实时更新"""
    # 简单认证：检查 query 参数中的 token
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="未提供认证凭据")
        return

    # 验证 JWT
    try:
        from jose import jwt
        from backend.config import JWT_SECRET, JWT_ALGORITHM
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("sub") is None:
            await websocket.close(code=4001, reason="无效的认证凭据")
            return
        user = payload["sub"]
    except Exception:
        await websocket.close(code=4001, reason="认证凭据无效")
        return

    await websocket.accept()
    conn_id = f"admin_{user}_{id(websocket)}"
    admin_ws_connections[conn_id] = websocket

    try:
        while True:
            # 保持连接，接收客户端心跳
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        admin_ws_connections.pop(conn_id, None)


async def broadcast_to_admins(event: str, data: dict):
    """向所有管理端 WebSocket 广播事件"""
    import json
    message = json.dumps({"event": event, "data": data})
    disconnected = []
    for conn_id, ws in admin_ws_connections.items():
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(conn_id)
    for conn_id in disconnected:
        admin_ws_connections.pop(conn_id, None)


# 认证中间件
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path

    public_paths = [
        "/api/auth/login",
        "/api/health",
        "/uploads/",
        "/api/player/ws/",
        "/api/devices/register",
        "/api/devices/check/",
        "/api/ws/admin",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/assets/",
    ]

    is_public = any(path.startswith(p) or path == p for p in public_paths)

    if path == "/" or path.startswith("/player") or path.startswith("/admin") or path.startswith("/login"):
        is_public = True

    if path == "/favicon.ico":
        is_public = True

    if is_public:
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={"code": 401, "data": None, "message": "未提供认证凭据"},
        )

    token = auth_header[7:]
    try:
        from jose import jwt, JWTError
        from backend.config import JWT_SECRET, JWT_ALGORITHM
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("sub") is None:
            return JSONResponse(
                status_code=401,
                content={"code": 401, "data": None, "message": "无效的认证凭据"},
            )
    except Exception:
        return JSONResponse(
            status_code=401,
            content={"code": 401, "data": None, "message": "认证凭据已过期或无效"},
        )

    return await call_next(request)


@app.get("/api/system/info")
async def get_system_info() -> dict:
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    return {
        "code": 0,
        "data": {
            "version": "3.0.0",
            "local_ip": local_ip,
            "port": PORT,
            "admin_url": f"http://{local_ip}:{PORT}/admin",
            "player_url": f"http://{local_ip}:{PORT}/player",
            "connected_players": ws_hub.connection_count,
        },
        "message": "success",
    }


# 前端静态文件服务
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="frontend-assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa_fallback(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=PORT, reload=True)
