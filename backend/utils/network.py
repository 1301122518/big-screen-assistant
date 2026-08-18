"""
大屏操作助手 - 网络工具函数
"""
import socket
from typing import Optional


def get_local_ip() -> str:
    """获取本机局域网 IP 地址"""
    try:
        # 创建一个 UDP socket 来获取本机 IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # 回退方案
        try:
            hostname = socket.gethostname()
            return socket.gethostbyname(hostname)
        except Exception:
            return "127.0.0.1"
