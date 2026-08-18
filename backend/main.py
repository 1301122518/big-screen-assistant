"""
大屏操作助手 - FastAPI 主应用入口
"""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import PORT, UPLOAD_DIR
from backend.database import init_db
from backend.routers import materials, player
from backend.schemas import ApiResponse, SystemInfoResponse
from backend.utils.network import get_local_ip
from backend.websocket_hub import ws_hub


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时初始化数据库和目录"""
    # 确保必要目录存在
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Path(__file__).parent.parent / "data" / "app.db"
    (Path(__file__).parent.parent / "data").mkdir(parents=True, exist_ok=True)

    # 初始化数据库表
    await init_db()
    yield


app = FastAPI(
    title="大屏操作助手",
    description="本地大屏播放控制系统",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(materials.router)
app.include_router(player.router)

# 前端构建产物目录
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

# 挂载上传文件静态目录
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# 挂载前端构建产物（JS/CSS 等静态资源）
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")


@app.get("/api/system/info", response_model=ApiResponse)
async def system_info() -> dict:
    """获取系统信息，包括局域网 IP 和访问地址"""
    local_ip = get_local_ip()
    data = SystemInfoResponse(
        version="1.0.0",
        local_ip=local_ip,
        port=PORT,
        admin_url=f"http://{local_ip}:{PORT}/admin",
        player_url=f"http://{local_ip}:{PORT}/player",
        connected_players=ws_hub.connection_count,
    )
    return {"code": 0, "data": data, "message": "success"}


@app.get("/")
async def root_redirect() -> FileResponse:
    """根路径重定向到管理端"""
    from starlette.responses import RedirectResponse
    return RedirectResponse(url="/admin")


@app.get("/admin/{full_path:path}")
async def serve_admin(request: Request, full_path: str) -> FileResponse:
    """服务管理端 SPA 页面"""
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        status_code=503,
        content={"error": "前端未构建，请先运行 npm run build"},
    )


@app.get("/player/{full_path:path}")
async def serve_player(request: Request, full_path: str) -> FileResponse:
    """服务播放端 SPA 页面"""
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        status_code=503,
        content={"error": "前端未构建，请先运行 npm run build"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
    )
