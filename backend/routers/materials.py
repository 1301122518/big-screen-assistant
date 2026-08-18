"""
大屏操作助手 - 素材管理路由
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas import ApiResponse, MaterialResponse
from backend.services.material_service import MaterialService
from backend.utils.file_helper import (
    is_allowed_file,
    get_mime_type,
    get_material_type,
    generate_unique_filename,
)
from backend.config import UPLOAD_DIR, MAX_UPLOAD_SIZE

router = APIRouter(prefix="/api/materials", tags=["素材管理"])


@router.get("", response_model=ApiResponse)
async def list_materials(db: AsyncSession = Depends(get_db)) -> dict:
    """获取素材列表"""
    service = MaterialService(db)
    materials = await service.list_materials()
    data = [
        MaterialResponse(
            id=m.id,
            title=m.title,
            type=m.type,
            file_path=m.file_path,
            url=m.url,
            mime_type=m.mime_type,
            size=m.size,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in materials
    ]
    return {"code": 0, "data": data, "message": "success"}


@router.post("/upload", response_model=ApiResponse)
async def upload_material(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """上传图片或视频素材"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="未提供文件名")

    # 校验文件类型
    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="不支持的文件类型")

    # 读取文件内容
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件过大，最大支持 500MB")

    # 生成唯一文件名并保存
    unique_name = generate_unique_filename(file.filename)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, "wb") as f:
        f.write(content)

    # 创建素材记录
    service = MaterialService(db)
    material = await service.create_material_from_upload(
        title=title or file.filename,
        file_path=unique_name,
        mime_type=get_mime_type(file.filename),
        size=len(content),
        material_type=get_material_type(file.filename),
    )

    return {
        "code": 0,
        "data": MaterialResponse.model_validate(material),
        "message": "上传成功",
    }


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
