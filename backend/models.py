"""
大屏操作助手 - 数据库模型定义
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from backend.database import Base


class Material(Base):
    """素材模型：图片、视频、网页 URL"""
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # image|video|webpage
    file_path = Column(String, nullable=True)
    url = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "title": self.title,
            "type": self.type,
            "file_path": self.file_path,
            "url": self.url,
            "mime_type": self.mime_type,
            "size": self.size,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PlayerState(Base):
    """播放状态模型：单例模式，记录当前播放素材及状态"""
    __tablename__ = "player_state"

    id = Column(Integer, primary_key=True, default=1)
    current_material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    status = Column(String, default="idle")  # idle|playing|stopped
    updated_at = Column(DateTime, default=datetime.utcnow)

    current_material = relationship("Material", lazy="noload")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "current_material_id": self.current_material_id,
            "status": self.status,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "current_material": self.current_material.to_dict() if self.current_material else None,
        }
