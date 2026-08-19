"""
大屏操作助手 - HLS 转码服务
使用 ffmpeg 将视频转为 HLS 格式（.m3u8 + .ts 分片）
支持超时控制，防止大文件卡住
"""
import asyncio
import shutil
import logging
from pathlib import Path
from typing import Optional
from backend.config import HLS_DIR, UPLOAD_DIR, HLS_TIMEOUT

logger = logging.getLogger(__name__)


async def transcode_to_hls(video_filename: str) -> Optional[str]:
    """将视频文件转码为 HLS 格式

    Args:
        video_filename: uploads/ 下的相对文件名（如 uuid.mp4）

    Returns:
        HLS 输出目录名（如 "hls/uuid/"），失败返回 None
    """
    source = UPLOAD_DIR / video_filename
    if not source.exists():
        return None

    # 输出目录
    output_name = Path(video_filename).stem
    output_dir = HLS_DIR / output_name
    output_dir.mkdir(parents=True, exist_ok=True)

    playlist_path = output_dir / "master.m3u8"

    # 先尝试直接复制流（快速，不重编码）
    cmd = [
        "ffmpeg", "-y",
        "-i", str(source),
        "-c:v", "copy",
        "-c:a", "copy",
        "-start_number", "0",
        "-hls_time", "10",
        "-hls_list_size", "0",
        "-f", "hls",
        "-hls_segment_filename", str(output_dir / "segment_%03d.ts"),
        str(playlist_path),
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        # 添加超时控制
        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=HLS_TIMEOUT)
        except asyncio.TimeoutError:
            logger.error(f"HLS transcode timeout ({HLS_TIMEOUT}s) for {video_filename}")
            proc.kill()
            await proc.wait()
            return None

        if proc.returncode != 0:
            # copy 模式失败（某些编码不支持），重新编码
            cmd_reencode = [
                "ffmpeg", "-y",
                "-i", str(source),
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-start_number", "0",
                "-hls_time", "10",
                "-hls_list_size", "0",
                "-f", "hls",
                "-hls_segment_filename", str(output_dir / "segment_%03d.ts"),
                str(playlist_path),
            ]
            proc2 = await asyncio.create_subprocess_exec(
                *cmd_reencode,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                _, stderr2 = await asyncio.wait_for(proc2.communicate(), timeout=HLS_TIMEOUT)
            except asyncio.TimeoutError:
                logger.error(f"HLS re-encode timeout ({HLS_TIMEOUT}s) for {video_filename}")
                proc2.kill()
                await proc2.wait()
                return None
            if proc2.returncode != 0:
                return None

        return f"hls/{output_name}"
    except FileNotFoundError:
        # ffmpeg 未安装
        logger.warning("ffmpeg not found, HLS transcode skipped")
        return None
    except Exception as e:
        logger.error(f"HLS transcode error: {e}")
        return None


def delete_hls(hls_path: str):
    """删除 HLS 转码文件"""
    if not hls_path:
        return
    full_path = UPLOAD_DIR / hls_path
    if full_path.exists():
        shutil.rmtree(full_path, ignore_errors=True)
