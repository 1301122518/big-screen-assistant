"""
大屏操作助手 - 认证路由（v3.0 支持密码修改）
"""
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.auth import verify_credentials, create_access_token, get_current_user, change_user_password

router = APIRouter(prefix="/api/auth", tags=["认证"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
async def login(req: LoginRequest):
    """用户登录，返回 JWT Token"""
    is_valid, must_change = await verify_credentials(req.username, req.password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_access_token(req.username)
    return {
        "code": 0,
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "must_change_password": must_change,
        },
        "message": "登录成功",
    }


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, user: str = Depends(get_current_user)):
    """修改密码"""
    # 密码强度检查：至少 8 位，包含字母和数字
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="密码长度至少 8 个字符")
    if not re.search(r'[a-zA-Z]', req.new_password):
        raise HTTPException(status_code=400, detail="密码必须包含字母")
    if not re.search(r'[0-9]', req.new_password):
        raise HTTPException(status_code=400, detail="密码必须包含数字")

    success = await change_user_password(user, req.old_password, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="当前密码错误")

    # 返回新 token
    token = create_access_token(user)
    return {
        "code": 0,
        "data": {"access_token": token, "token_type": "bearer"},
        "message": "密码修改成功",
    }


@router.get("/me")
async def me(user: str = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return {"code": 0, "data": {"username": user}, "message": "success"}
