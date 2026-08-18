"""
大屏操作助手 - WebSocket 连接管理器
"""
import json
from typing import Set
from fastapi import WebSocket


class WebSocketHub:
    """管理所有播放端 WebSocket 连接"""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        """接受并注册新的 WebSocket 连接"""
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """移除已断开的连接"""
        self.active_connections.discard(websocket)

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

    @property
    def connection_count(self) -> int:
        """当前在线播放端数量"""
        return len(self.active_connections)


# 全局单例
ws_hub = WebSocketHub()
