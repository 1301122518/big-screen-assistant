#!/bin/bash
# 大屏操作助手 - Docker 部署脚本
# 适用于无 sudo 权限但有 Docker 的服务器环境

set -e

APP_NAME="big-screen-assistant"
APP_DIR="/home/<YOUR_USERNAME>/big-screen-assistant"
PORT=8787

echo "=========================================="
echo "  大屏操作助手 - Docker 部署"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker 权限
if ! docker ps &> /dev/null; then
    echo "❌ 当前用户无 Docker 权限，请确保用户在 docker 组中"
    exit 1
fi

# 创建应用目录
echo "📁 创建应用目录..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 检查必要文件
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile 不存在，请先上传项目文件"
    exit 1
fi

if [ ! -d "frontend/dist" ]; then
    echo "❌ 前端构建产物不存在 (frontend/dist/)，请先构建前端"
    exit 1
fi

# 创建数据目录
mkdir -p data

# 停止旧容器（如果存在）
echo "🛑 停止旧容器..."
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker build -t $APP_NAME:latest .

# 运行容器
echo "🚀 启动容器..."
docker run -d \
    --name $APP_NAME \
    --restart unless-stopped \
    -p ${PORT}:8000 \
    -v ${APP_DIR}/data:/app/data \
    -e DATABASE_URL=sqlite+aiosqlite:///./data/assistant.db \
    $APP_NAME:latest

# 等待启动
echo "⏳ 等待服务启动..."
sleep 3

# 检查状态
if docker ps | grep -q $APP_NAME; then
    echo ""
    echo "=========================================="
    echo "  ✅ 部署成功！"
    echo "=========================================="
    echo ""
    echo "  访问地址: http://$(hostname -I | awk '{print $1}'):${PORT}"
    echo "  容器名称: $APP_NAME"
    echo "  数据目录: ${APP_DIR}/data"
    echo ""
    echo "  常用命令:"
    echo "    查看日志: docker logs -f $APP_NAME"
    echo "    重启服务: docker restart $APP_NAME"
    echo "    停止服务: docker stop $APP_NAME"
    echo "=========================================="
else
    echo "❌ 容器启动失败，请检查日志: docker logs $APP_NAME"
    exit 1
fi
