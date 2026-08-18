"""
大屏操作助手 - 播放控制路由
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas import ApiResponse, PlayerStateResponse
from backend.services.player_service import PlayerService
from backend.websocket_hub import ws_hub

router = APIRouter(prefix="/api/player", tags=["播放控制"])


@router.get("/status", response_model=ApiResponse)
async def get_player_status(db: AsyncSession = Depends(get_db)) -> dict:
    """获取当前播放状态"""
    service = PlayerService(db)
    state = await service.get_state()
    return {
        "code": 0,
        "data": PlayerStateResponse.model_validate(state),
        "message": "success",
    }


@router.post("/play/{material_id}", response_model=ApiResponse)
async def play_material(
    material_id: int, db: AsyncSession = Depends(get_db)
) -> dict:
    """播放指定素材"""
    service = PlayerService(db)
    result = await service.play(material_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return {"code": 0, "data": None, "message": result["message"]}


@router.post("/stop", response_model=ApiResponse)
async def stop_player(db: AsyncSession = Depends(get_db)) -> dict:
    """停止播放"""
    service = PlayerService(db)
    result = await service.stop()
    return {"code": 0, "data": None, "message": result["message"]}


@router.post("/refresh", response_model=ApiResponse)
async def refresh_player() -> dict:
    """刷新播放端"""
    service = PlayerService(None)  # type: ignore
    result = await service.refresh()
    return {"code": 0, "data": None, "message": result["message"]}


@router.websocket("/ws/player")
async def player_websocket(websocket: WebSocket) -> None:
    """播放端 WebSocket 连接端点"""
    await ws_hub.connect(websocket)
    try:
        while True:
            # 接收播放端消息（心跳等），保持连接活跃
            data = await websocket.receive_json()
            # 目前播放端不需要发送指令，仅保持连接
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception:
        ws_hub.disconnect(websocket)
