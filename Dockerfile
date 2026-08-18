# 大屏操作助手 - Docker 镜像
FROM python:3.11-slim

WORKDIR /app

# 安装依赖（requirements.txt 在项目根目录）
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY backend/ ./backend/

# 复制前端构建产物
COPY frontend/dist/ ./frontend/dist/

# 创建数据和上传目录
RUN mkdir -p /app/data /app/uploads

# 环境变量
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite+aiosqlite:///./data/app.db
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

# 启动命令
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
