"""
大屏操作助手 - 数据库模型定义（v3.0）
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    """用户模型：支持密码修改和强制改密"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    must_change_password = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "must_change_password": self.must_change_password,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Tag(Base):
    """标签模型：素材分类管理"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False, index=True)
    color = Column(String, default="#3B82F6")  # hex color
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MaterialTag(Base):
    """素材-标签关联表"""
    __tablename__ = "material_tags"
    __table_args__ = (
        Index("ix_material_tags_material_id", "material_id"),
        Index("ix_material_tags_tag_id", "tag_id"),
    )

    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class AuditLog(Base):
    """操作审计日志"""
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_user", "user"),
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user = Column(String, nullable=False)
    action = Column(String, nullable=False)  # upload/delete/play/approve/reject/etc.
    target_type = Column(String, nullable=True)  # material/device/playlist/etc.
    target_id = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user": self.user,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "detail": self.detail,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Device(Base):
    """设备模型：客户端设备准入控制"""
    __tablename__ = "devices"
    __table_args__ = (
        Index("ix_devices_device_id", "device_id"),
        Index("ix_devices_status", "status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, unique=True, nullable=False, index=True)
    device_name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)
    status = Column(String, default="pending")
    ip_address = Column(String, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    playing_material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "device_name": self.device_name,
            "device_type": self.device_type,
            "status": self.status,
            "ip_address": self.ip_address,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "playing_material_id": self.playing_material_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Material(Base):
    """素材模型：图片、视频、HTML、网页 URL"""
    __tablename__ = "materials"
    __table_args__ = (
        Index("ix_materials_type", "type"),
        Index("ix_materials_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    url = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    hls_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    tags = relationship("Tag", secondary="material_tags", lazy="selectin")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "type": self.type,
            "file_path": self.file_path,
            "url": self.url,
            "mime_type": self.mime_type,
            "size": self.size,
            "hls_path": self.hls_path,
            "tags": [t.to_dict() for t in self.tags] if self.tags else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PlayerState(Base):
    """播放状态模型：单例模式，记录当前播放素材及状态"""
    __tablename__ = "player_state"

    id = Column(Integer, primary_key=True, default=1)
    current_material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    status = Column(String, default="idle")  # idle|playing|stopped
    updated_at = Column(DateTime, default=datetime.now)

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


class Playlist(Base):
    """播放列表模型"""
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    play_mode = Column(String, default="sequential")
    scheduled_at = Column(DateTime, nullable=True)  # 定时播放时间
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    items = relationship("PlaylistItem", back_populates="playlist", cascade="all, delete-orphan",
                         order_by="PlaylistItem.sort_order")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "play_mode": self.play_mode,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "items": [item.to_dict() for item in self.items] if self.items else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PlaylistItem(Base):
    """播放列表条目模型"""
    __tablename__ = "playlist_items"
    __table_args__ = (
        Index("ix_playlist_items_playlist_id", "playlist_id"),
        Index("ix_playlist_items_sort_order", "playlist_id", "sort_order"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"))
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"))
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    playlist = relationship("Playlist", back_populates="items")
    material = relationship("Material", lazy="noload")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "playlist_id": self.playlist_id,
            "material_id": self.material_id,
            "sort_order": self.sort_order,
            "material": self.material.to_dict() if self.material else None,
        }
