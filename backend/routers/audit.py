"""
大屏操作助手 - 审计日志路由（v3.0 新增）
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database import get_db
from backend.models import AuditLog

router = APIRouter(prefix="/api/audit-logs", tags=["审计日志"])


async def log_action(
    db: AsyncSession,
    user: str,
    action: str,
    target_type: str = None,
    target_id: int = None,
    detail: str = None,
    ip_address: str = None,
):
    """记录审计日志（内部调用）"""
    log = AuditLog(
        user=user,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()


@router.get("")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取审计日志列表（分页）"""
    query = select(AuditLog)

    if action:
        query = query.where(AuditLog.action == action)
    if user:
        query = query.where(AuditLog.user == user)

    # 总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.order_by(AuditLog.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "code": 0,
        "data": {
            "items": [log.to_dict() for log in logs],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
        "message": "success",
    }


@router.get("/recent")
async def recent_audit_logs(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取最近的审计日志"""
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "code": 0,
        "data": [log.to_dict() for log in logs],
        "message": "success",
    }
