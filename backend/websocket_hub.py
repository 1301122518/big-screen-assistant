"""
大屏操作助手 - WebSocket 连接管理器
支持心跳检测，自动清理死连接，支持设备准入控制，支持设备状态追踪
"""
import asyncio
import json
import logging
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketHub:
    """管理所有播放端 WebSocket 连接，带心跳检测和设备准入"""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        # 记录每个 WebSocket 连接对应的 device_id
        self._connection_device_map: Dict[WebSocket, str] = {}
        # 设备播放状态追踪: {device_id: {material_id, current_time, duration, status}}
        self._device_statuses: Dict[str, Dict[str, Any]] = {}
        self._heartbeat_task: asyncio.Task | None = None
        self._heartbeat_interval = 30  # 心跳间隔（秒）

    async def connect(self, websocket: WebSocket, device_id: str = None) -> None:
        """接受并注册新的 WebSocket 连接"""
        await websocket.accept()
        self.active_connections.add(websocket)
        if device_id:
            self._connection_device_map[websocket] = device_id
        logger.info(f"WebSocket connected (device={device_id}), total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """移除已断开的连接"""
        self.active_connections.discard(websocket)
        self._connection_device_map.pop(websocket, None)
        logger.info(f"WebSocket disconnected, total: {len(self.active_connections)}")

    async def broadcast(self, message: dict) -> None:
        """向所有连接的播放端广播消息"""
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        # 清理断开的连接
        for conn in disconnected:
            self.active_connections.discard(conn)
            self._connection_device_map.pop(conn, None)

    async def send_to_device(self, device_id: str, message: dict) -> bool:
        """向指定设备发送消息"""
        for ws, did in self._connection_device_map.items():
            if did == device_id:
                try:
                    await ws.send_json(message)
                    return True
                except Exception:
                    return False
        return False

    async def _heartbeat_loop(self) -> None:
        """心跳检测循环，定期发送 ping 并清理死连接"""
        while True:
            await asyncio.sleep(self._heartbeat_interval)
            disconnected = set()
            for connection in self.active_connections:
                try:
                    # 发送 ping 消息
                    await connection.send_json({"type": "ping"})
                except Exception:
                    disconnected.add(connection)
            # 清理死连接
            for conn in disconnected:
                self.active_connections.discard(conn)
                self._connection_device_map.pop(conn, None)
                logger.info(f"Removed dead WebSocket connection, total: {len(self.active_connections)}")

    def start_heartbeat(self) -> None:
        """启动心跳检测任务"""
        if self._heartbeat_task is None or self._heartbeat_task.done():
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            logger.info("WebSocket heartbeat started")

    def stop_heartbeat(self) -> None:
        """停止心跳检测任务"""
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            logger.info("WebSocket heartbeat stopped")

    def get_connected_device_ids(self) -> set:
        """返回当前所有已连接的设备 ID 集合"""
        return set(self._connection_device_map.values())

    def update_device_status(self, device_id: str, status: dict) -> None:
        """更新设备播放状态（由客户端 WebSocket 上报）"""
        self._device_statuses[device_id] = status

    def get_device_statuses(self) -> Dict[str, Dict[str, Any]]:
        """获取所有设备的播放状态"""
        result = {}
        for ws, did in self._connection_device_map.items():
            result[did] = self._device_statuses.get(did, {"status": "connected"})
        return result

    @property
    def connection_count(self) -> int:
        """当前在线播放端数量"""
        return len(self.active_connections)


# 全局单例
ws_hub = WebSocketHub()
