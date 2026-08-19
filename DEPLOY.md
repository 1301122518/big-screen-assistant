# 大屏操作助手 - 部署指南

## 服务器要求

- **操作系统**：Ubuntu 20.04+ / CentOS 7+ / Windows Server 2019+
- **Docker**：20.10+（Docker 部署方式）
- **或** Python 3.10+（手动部署方式）
- **部署端口**：默认 8080（可配置）

## 方式一：Docker 部署（推荐）

### 1. 上传文件到服务器

```bash
# 打包后上传
tar -czf big-screen-assistant.tar.gz big-screen-assistant/
scp big-screen-assistant.tar.gz awx@123.57.232.163:~/
ssh awx@123.57.232.163 "tar -xzf big-screen-assistant.tar.gz && rm big-screen-assistant.tar.gz"
```

### 2. 启动服务

```bash
cd ~/big-screen-assistant

# 使用 docker-compose（推荐）
docker-compose up -d

# 或使用部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 3. 验证部署

```bash
# 查看容器状态
docker ps | grep big-screen-assistant

# 查看日志
docker logs -f big-screen-assistant

# 测试访问
curl http://localhost:8080/docs
```

### 4. 访问

```
http://123.57.232.163:8080/admin
```

## 方式二：手动部署

### 1. 安装依赖

```bash
# 后端
pip install -r requirements.txt

# 前端
cd frontend
npm install
npm run build
cd ..
```

### 2. 配置环境变量

```bash
export JWT_SECRET="your-random-secret-key"
export ADMIN_PASSWORD="your-strong-password"
export PORT=8080
```

### 3. 启动服务

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### 4. 使用 systemd（Linux）

创建 `/etc/systemd/system/big-screen-assistant.service`：

```ini
[Unit]
Description=Big Screen Assistant
After=network.target

[Service]
Type=simple
User=awx
WorkingDirectory=/opt/big-screen-assistant
Environment="JWT_SECRET=your-random-secret-key"
Environment="ADMIN_PASSWORD=your-strong-password"
ExecStart=/usr/bin/python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8080
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable big-screen-assistant
sudo systemctl start big-screen-assistant
```

## 常用运维命令

```bash
# Docker 方式
docker logs -f big-screen-assistant     # 查看实时日志
docker restart big-screen-assistant     # 重启服务
docker stop big-screen-assistant        # 停止服务
docker stats big-screen-assistant       # 查看资源使用

# systemd 方式
sudo journalctl -u big-screen-assistant -f   # 查看日志
sudo systemctl restart big-screen-assistant  # 重启
sudo systemctl status big-screen-assistant   # 状态
```

## 数据备份

数据存储在 `data/` 目录：

```bash
# 备份数据库
cp data/app.db data/app.db.backup

# 备份上传文件
tar -czf uploads-backup.tar.gz uploads/
```

## 更新部署

```bash
# 1. 上传新版本文件
scp -r big-screen-assistant/* awx@123.57.232.163:~/big-screen-assistant/

# 2. 重启服务
docker restart big-screen-assistant
# 或
sudo systemctl restart big-screen-assistant
```

## 故障排查

### 容器启动失败

```bash
docker logs big-screen-assistant    # 查看详细错误
netstat -tlnp | grep 8080          # 检查端口占用
```

### 无法访问服务

1. 检查防火墙是否开放对应端口
2. 检查 Docker 容器 / systemd 服务是否正常运行
3. 查看日志定位问题

### 数据库问题

```bash
# 备份当前数据库
cp data/app.db data/app.db.bak

# 重置数据库（谨慎！会丢失所有数据）
rm data/app.db
docker restart big-screen-assistant
```

## 安全建议

1. **修改默认密码**：通过环境变量 `ADMIN_PASSWORD` 设置强密码
2. **修改 JWT 密钥**：通过环境变量 `JWT_SECRET` 设置随机密钥
3. **启用 HTTPS**：使用 Nginx 反向代理 + Let's Encrypt 证书
4. **限制访问**：配置防火墙规则，仅允许信任的 IP 访问管理面板
