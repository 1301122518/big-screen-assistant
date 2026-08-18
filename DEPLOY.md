# 大屏操作助手 - 部署指南

## 服务器信息

- **服务器**: <YOUR_SERVER_IP>
- **用户**: <YOUR_USERNAME>（无 sudo 权限）
- **Docker**: 已安装
- **部署端口**: 8787

## 部署步骤

### 1. 上传文件到服务器

在本地执行：

```bash
# 方式一：使用 scp 上传整个目录
scp -r deliverables/software-company/big-screen-assistant/* <YOUR_USERNAME>@<YOUR_SERVER_IP>:~/big-screen-assistant/

# 方式二：打包后上传
cd deliverables/software-company
tar -czf big-screen-assistant.tar.gz big-screen-assistant/
scp big-screen-assistant.tar.gz <YOUR_USERNAME>@<YOUR_SERVER_IP>:~/
ssh <YOUR_USERNAME>@<YOUR_SERVER_IP> "tar -xzf big-screen-assistant.tar.gz && rm big-screen-assistant.tar.gz"
```

### 2. SSH 登录服务器

```bash
ssh <YOUR_USERNAME>@<YOUR_SERVER_IP>
```

### 3. 执行部署

```bash
cd ~/big-screen-assistant
chmod +x deploy.sh
./deploy.sh
```

### 4. 验证部署

```bash
# 查看容器状态
docker ps | grep big-screen-assistant

# 查看日志
docker logs -f big-screen-assistant

# 测试访问
curl http://localhost:8787/health
```

## 访问地址

部署成功后，通过浏览器访问：

```
http://<YOUR_SERVER_IP>:8787
```

## 常用运维命令

```bash
# 查看实时日志
docker logs -f big-screen-assistant

# 重启服务
docker restart big-screen-assistant

# 停止服务
docker stop big-screen-assistant

# 启动服务
docker start big-screen-assistant

# 进入容器
docker exec -it big-screen-assistant /bin/bash

# 查看资源使用
docker stats big-screen-assistant
```

## 数据备份

数据存储在 `~/big-screen-assistant/data/` 目录：

```bash
# 备份数据库
cp ~/big-screen-assistant/data/assistant.db ~/big-screen-assistant/data/assistant.db.backup

# 备份日志
cp ~/big-screen-assistant/data/server.log ~/big-screen-assistant/data/server.log.backup
```

## 更新部署

```bash
# 1. 上传新版本文件
scp -r big-screen-assistant/* <YOUR_USERNAME>@<YOUR_SERVER_IP>:~/big-screen-assistant/

# 2. SSH 登录服务器
ssh <YOUR_USERNAME>@<YOUR_SERVER_IP>

# 3. 重新构建并启动
cd ~/big-screen-assistant
docker stop big-screen-assistant
docker rm big-screen-assistant
docker build -t big-screen-assistant:latest .
docker run -d \
    --name big-screen-assistant \
    --restart unless-stopped \
    -p 8787:8000 \
    -v $(pwd)/data:/app/data \
    -e DATABASE_URL=sqlite+aiosqlite:///./data/assistant.db \
    big-screen-assistant:latest
```

## 故障排查

### 容器启动失败

```bash
# 查看详细错误
docker logs big-screen-assistant

# 检查端口占用
netstat -tlnp | grep 8787

# 检查文件权限
ls -la ~/big-screen-assistant/data/
```

### 无法访问服务

1. 检查防火墙是否开放 8787 端口
2. 检查 Docker 容器是否正常运行
3. 查看容器日志定位问题

### 数据库问题

```bash
# 备份当前数据库
cp ~/big-screen-assistant/data/assistant.db ~/big-screen-assistant/data/assistant.db.bak

# 重置数据库（谨慎！）
rm ~/big-screen-assistant/data/assistant.db
docker restart big-screen-assistant
```

## 技术栈

- **后端**: Python 3.11 + FastAPI + SQLite + WebSocket
- **前端**: React 18 + TypeScript + Vite 5 + Tailwind CSS 3
- **部署**: Docker + docker-compose

## 联系支持

如有问题，请联系开发团队。
