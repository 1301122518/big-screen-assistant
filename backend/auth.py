"""
大屏操作助手 - JWT 认证工具（v3.0 支持密码修改）
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS, ADMIN_USERNAME, ADMIN_PASSWORD

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """密码哈希（使用 SHA-256 + salt）"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, password_hash: str) -> bool:
    """验证密码"""
    if ":" not in password_hash:
        # 兼容旧版明文密码
        return password == password_hash
    salt, hashed = password_hash.split(":", 1)
    check = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return check == hashed


def create_access_token(username: str = None) -> str:
    """创建 JWT 访问令牌"""
    if username is None:
        username = ADMIN_USERNAME
    expire = datetime.now() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def verify_credentials(username: str, password: str) -> tuple[bool, bool]:
    """
    验证用户名密码
    返回: (是否验证通过, 是否需要修改密码)
    """
    # 优先从数据库查询用户
    try:
        from backend.database import async_session
        from backend.models import User
        from sqlalchemy import select

        async with async_session() as db:
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()

            if user:
                # 数据库用户
                is_valid = verify_password(password, user.password_hash)
                return is_valid, user.must_change_password
    except Exception:
        pass

    # 回退到配置文件中的默认用户
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return True, True  # 默认密码需要修改

    return False, False


async def ensure_default_user():
    """确保默认用户存在于数据库中"""
    try:
        from backend.database import async_session
        from backend.models import User
        from sqlalchemy import select

        async with async_session() as db:
            result = await db.execute(select(User).where(User.username == ADMIN_USERNAME))
            user = result.scalar_one_or_none()

            if not user:
                # 创建默认用户，密码为配置文件中的密码，需要修改
                new_user = User(
                    username=ADMIN_USERNAME,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    must_change_password=True,
                )
                db.add(new_user)
                await db.commit()
    except Exception:
        pass


async def change_user_password(username: str, old_password: str, new_password: str) -> bool:
    """修改用户密码"""
    from backend.database import async_session
    from backend.models import User
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user:
            return False

        # 验证旧密码
        if not verify_password(old_password, user.password_hash):
            return False

        # 更新密码
        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        await db.commit()
        return True


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """从 JWT Token 中解析当前用户"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="未提供认证凭据")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="无效的认证凭据")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="认证凭据已过期或无效")
