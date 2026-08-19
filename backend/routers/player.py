"""
大屏操作助手 - 播放控制路由
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db, async_session
from backend.models import Device
from backend.schemas import ApiResponse, PlayerStateResponse
from backend.services.player_service import PlayerService
from backend.websocket_hub import ws_hub

router = APIRouter(prefix="/api/player", tags=["播放控制"])


@router.get("/device-status", response_model=ApiResponse)
async def get_device_statuses() -> dict:
    """获取所有在线设备的播放状态"""
    statuses = ws_hub.get_device_statuses()
    return {
        "code": 0,
        "data": statuses,
        "message": "success",
    }


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


@router.post("/play-playlist/{playlist_id}", response_model=ApiResponse)
async def play_playlist(
    playlist_id: int, db: AsyncSession = Depends(get_db)
) -> dict:
    """播放播放列表"""
    service = PlayerService(db)
    result = await service.play_playlist(playlist_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return {"code": 0, "data": None, "message": result["message"]}


@router.post("/next", response_model=ApiResponse)
async def play_next(db: AsyncSession = Depends(get_db)) -> dict:
    """播放下一个"""
    service = PlayerService(db)
    result = await service.play_next()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return {"code": 0, "data": None, "message": result["message"]}


@router.post("/prev", response_model=ApiResponse)
async def play_prev(db: AsyncSession = Depends(get_db)) -> dict:
    """播放上一个"""
    service = PlayerService(db)
    result = await service.play_prev()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
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
async def player_websocket(websocket: WebSocket, device_id: str = None) -> None:
    """
    播放端 WebSocket 连接端点
    支持设备准入控制：客户端需传递 device_id 参数
    """
    # 设备准入检查
    if device_id:
        async with async_session() as session:
            result = await session.execute(
                select(Device).where(Device.device_id == device_id)
            )
            device = result.scalar_one_or_none()
            
            if not device:
                # 设备未注册，拒绝连接（不加入 hub）
                await websocket.accept()
                await websocket.send_json({
                    "type": "auth_error",
                    "message": "设备未注册，请联系管理员"
                })
                await websocket.close(code=4001, reason="设备未注册")
                return
            
            if device.status == "pending":
                # 设备待审批（不加入 hub，直接关闭）
                await websocket.accept()
                await websocket.send_json({
                    "type": "auth_pending",
                    "message": "设备已注册，等待管理员审批"
                })
                await websocket.close(code=4002, reason="设备待审批")
                return
            
            if device.status == "rejected":
                # 设备被拒绝（不加入 hub，直接关闭）
                await websocket.accept()
                await websocket.send_json({
                    "type": "auth_rejected",
                    "message": "设备已被管理员拒绝"
                })
                await websocket.close(code=4003, reason="设备被拒绝")
                return
            
            # 设备已批准，更新最后心跳时间
            device.last_seen = datetime.now()
            await session.commit()
    
    # 仅已批准设备加入 hub 进行正常通信
    await ws_hub.connect(websocket, device_id=device_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            # 处理客户端上报消息
            msg_type = data.get("type", "")
            if msg_type == "progress" and device_id:
                # 客户端播放进度上报
                ws_hub.update_device_status(device_id, {
                    "material_id": data.get("material_id"),
                    "current_time": data.get("current_time"),
                    "duration": data.get("duration"),
                    "status": data.get("status", "playing"),
                    "updated_at": datetime.now().isoformat(),
                })
            elif msg_type == "command_result" and device_id:
                # 客户端指令执行结果回传
                logger.info(f"Device {device_id} command result: {data}")
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket)
    except Exception:
        ws_hub.disconnect(websocket)
