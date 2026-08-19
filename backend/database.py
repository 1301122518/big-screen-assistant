"""
大屏操作助手 - 数据库连接与会话管理
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from backend.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """SQLAlchemy 模型基类"""
    pass


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：获取数据库会话"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """初始化数据库，创建所有表 + 自动迁移缺失列"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 自动迁移：为已有表添加缺失的列（SQLite 不支持 DROP COLUMN，只处理 ADD）
        await conn.run_sync(_migrate_columns)


def _migrate_columns(sync_conn) -> None:
    """检查并添加缺失的列（SQLite ALTER TABLE ADD COLUMN）"""
    import sqlalchemy as sa
    inspector = sa.inspect(sync_conn)

    # 定义需要迁移的列: {表名: [(列名, 类型), ...]}
    expected_columns = {
        "materials": [
            ("hls_path", sa.String),
        ],
        "devices": [
            ("playing_material_id", sa.Integer),
        ],
        "playlists": [
            ("scheduled_at", sa.DateTime),
        ],
    }

    for table_name, columns in expected_columns.items():
        existing = {col["name"] for col in inspector.get_columns(table_name)}
        for col_name, col_type in columns:
            if col_name not in existing:
                type_str = col_type() if isinstance(col_type, type) else col_type
                sync_conn.execute(
                    sa.text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {type_str}")
                )
