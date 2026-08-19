"""
大屏操作助手 - 素材管理路由（v3.0 增强版）
支持：批量删除、排序、搜索、多文件上传、进度追踪
"""
import asyncio
import uuid
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from backend.database import get_db
from backend.schemas import ApiResponse, MaterialResponse
from backend.services.material_service import MaterialService
from backend.services.hls_service import transcode_to_hls
from backend.utils.file_helper import (
    is_allowed_file,
    get_mime_type,
    get_material_type,
    generate_unique_filename,
)
from backend.config import UPLOAD_DIR, MAX_UPLOAD_SIZE
from backend.models import Material

router = APIRouter(prefix="/api/materials", tags=["素材管理"])

# 上传进度追踪（内存存储，重启后丢失）
upload_progress: dict[str, dict] = {}


@router.get("", response_model=ApiResponse)
async def list_materials(
    q: Optional[str] = Query(None, description="搜索关键词"),
    sort_by: Optional[str] = Query("created_at", description="排序字段: created_at/size/title"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc/desc"),
    tag_id: Optional[int] = Query(None, description="标签ID筛选"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取素材列表（支持搜索、排序、标签筛选）"""
    query = select(Material)

    # 搜索
    if q and q.strip():
        keyword = f"%{q.strip()}%"
        query = query.where(or_(
            Material.title.ilike(keyword),
            Material.file_path.ilike(keyword),
        ))

    # 标签筛选
    if tag_id:
        query = query.join(Material.tags).where(Material.tags.any(id=tag_id))

    # 排序
    sort_column = getattr(Material, sort_by, Material.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    result = await db.execute(query)
    materials = result.scalars().all()

    data = [
        MaterialResponse(
            id=m.id,
            title=m.title,
            type=m.type,
            file_path=m.file_path,
            url=m.url,
            mime_type=m.mime_type,
            size=m.size,
            hls_path=m.hls_path,
            tags=[t.to_dict() for t in m.tags] if m.tags else [],
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in materials
    ]
    return {"code": 0, "data": data, "message": "success"}


@router.post("/upload", response_model=ApiResponse)
async def upload_material(
    files: List[UploadFile] = File(...),
    titles: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """上传一个或多个素材文件（支持多文件并行上传）"""
    task_id = str(uuid.uuid4())[:8]
    results = []
    total = len(files)

    # 初始化进度
    upload_progress[task_id] = {
        "total": total,
        "completed": 0,
        "files": [],
    }

    for idx, file in enumerate(files):
        file_progress = {
            "name": file.filename or f"file_{idx}",
            "size": 0,
            "status": "uploading",
            "progress": 0,
        }
        upload_progress[task_id]["files"].append(file_progress)

        if not file.filename:
            file_progress["status"] = "error"
            file_progress["error"] = "未提供文件名"
            continue

        if not is_allowed_file(file.filename):
            file_progress["status"] = "error"
            file_progress["error"] = "不支持的文件类型"
            continue

        # 生成唯一文件名并保存
        unique_name = generate_unique_filename(file.filename)
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_path = UPLOAD_DIR / unique_name

        total_size = 0
        try:
            with open(file_path, "wb") as f:
                while chunk := await file.read(1024 * 1024):
                    total_size += len(chunk)
                    if total_size > MAX_UPLOAD_SIZE:
                        f.close()
                        file_path.unlink(missing_ok=True)
                        raise HTTPException(status_code=400, detail=f"文件 {file.filename} 过大")
                    f.write(chunk)
                    # 更新进度
                    file_progress["size"] = total_size
                    file_progress["progress"] = min(99, int(total_size / max(1, file.size or total_size) * 100))

            material_type = get_material_type(file.filename)
            title_list = titles.split("|") if titles else []
            title = title_list[idx] if idx < len(title_list) else file.filename

            service = MaterialService(db)
            material = await service.create_material_from_upload(
                title=title,
                file_path=unique_name,
                mime_type=get_mime_type(file.filename),
                size=total_size,
                material_type=material_type,
            )

            # 视频异步 HLS 转码
            if material_type == "video":
                asyncio.create_task(_do_hls_transcode(material.id, unique_name))

            file_progress["status"] = "completed"
            file_progress["progress"] = 100
            file_progress["material_id"] = material.id
            results.append(MaterialResponse.model_validate(material))

        except Exception as e:
            file_progress["status"] = "error"
            file_progress["error"] = str(e)
            file_path.unlink(missing_ok=True)

        upload_progress[task_id]["completed"] += 1

    return {
        "code": 0,
        "data": {"task_id": task_id, "materials": results, "count": len(results)},
        "message": f"成功上传 {len(results)} 个文件",
    }


@router.get("/upload-progress/{task_id}")
async def get_upload_progress(task_id: str):
    """获取上传进度（SSE 兼容）"""
    progress = upload_progress.get(task_id)
    if not progress:
        return {"code": 0, "data": {"completed": True, "progress": 100}, "message": "success"}

    return {
        "code": 0,
        "data": {
            "total": progress["total"],
            "completed": progress["completed"],
            "progress": int(progress["completed"] / max(1, progress["total"]) * 100),
            "files": progress["files"],
        },
        "message": "success",
    }


@router.post("/batch-delete", response_model=ApiResponse)
async def batch_delete_materials(
    ids: List[int],
    db: AsyncSession = Depends(get_db),
) -> dict:
    """批量删除素材"""
    service = MaterialService(db)
    deleted = 0
    for material_id in ids:
        if await service.delete_material(material_id):
            deleted += 1

    return {"code": 0, "data": {"deleted": deleted}, "message": f"成功删除 {deleted} 个素材"}


async def _do_hls_transcode(material_id: int, file_path: str):
    """后台执行 HLS 转码"""
    from backend.database import async_session
    from sqlalchemy import select

    hls_path = await transcode_to_hls(file_path)
    if hls_path:
        async with async_session() as db:
            result = await db.execute(select(Material).where(Material.id == material_id))
            material = result.scalar_one_or_none()
            if material:
                material.hls_path = hls_path
                await db.commit()


@router.post("/url", response_model=ApiResponse)
async def add_url_material(
    title: str = Form(...),
    url: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """添加网页 URL 素材"""
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL 必须以 http:// 或 https:// 开头")

    service = MaterialService(db)
    material = await service.create_material_from_url(title=title, url=url)

    return {
        "code": 0,
        "data": MaterialResponse.model_validate(material),
        "message": "添加成功",
    }


@router.put("/{material_id}", response_model=ApiResponse)
async def update_material(
    material_id: int,
    title: str = Form(None),
    url: str = Form(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """修改素材信息"""
    service = MaterialService(db)
    material = await service.update_material(material_id, title=title, url=url)
    if not material:
        raise HTTPException(status_code=404, detail="素材不存在")

    return {
        "code": 0,
        "data": MaterialResponse.model_validate(material),
        "message": "更新成功",
    }


@router.delete("/{material_id}", response_model=ApiResponse)
async def delete_material(
    material_id: int, db: AsyncSession = Depends(get_db)
) -> dict:
    """删除素材"""
    service = MaterialService(db)
    success = await service.delete_material(material_id)
    if not success:
        raise HTTPException(status_code=404, detail="素材不存在")

    return {"code": 0, "data": None, "message": "删除成功"}


@router.post("/scan-local", response_model=ApiResponse)
async def scan_local_files(db: AsyncSession = Depends(get_db)) -> dict:
    """扫描 uploads 目录中未被数据库记录的文件"""
    from sqlalchemy import select

    service = MaterialService(db)

    result = await db.execute(select(Material.file_path))
    existing_files = {row[0] for row in result.fetchall()}

    new_materials = []
    for file in UPLOAD_DIR.iterdir():
        if file.is_file() and file.name not in existing_files:
            if not is_allowed_file(file.name):
                continue

            file_stat = file.stat()
            material_type = get_material_type(file.name)

            material = await service.create_material_from_upload(
                title=file.name,
                file_path=file.name,
                mime_type=get_mime_type(file.name),
                size=file_stat.st_size,
                material_type=material_type,
            )

            if material_type == "video":
                asyncio.create_task(_do_hls_transcode(material.id, file.name))

            new_materials.append(MaterialResponse.model_validate(material))

    return {
        "code": 0,
        "data": {"added_count": len(new_materials), "materials": new_materials},
        "message": f"扫描完成，新增 {len(new_materials)} 个素材",
    }
