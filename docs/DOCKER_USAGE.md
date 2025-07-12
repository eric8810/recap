# Docker 使用指南

本文档介绍如何使用 Docker 运行 Recap MCP 服务器。

## 快速开始

### 1. 构建和运行 (HTTP 模式)

```bash
# 构建和启动服务 (默认 HTTP 模式)
docker-compose up -d

# 查看日志
docker-compose logs -f recap-mcp

# 停止服务
docker-compose down
```

### 2. 访问服务

服务启动后，可以通过以下端点访问：

- **健康检查**: http://localhost:3001/health
- **MCP 状态**: http://localhost:3001/mcp/status
- **MCP 协议端点**: http://localhost:3001/mcp

### 3. 数据持久化

对话数据将自动保存到本地 `./data` 目录，即使容器重启也不会丢失数据。

## 不同运行模式

### HTTP 模式 (默认)

```bash
# 启动 HTTP 模式服务
docker-compose up -d recap-mcp
```

### Stdio 模式

```bash
# 启动 stdio 模式服务 (主要用于调试)
docker-compose --profile stdio up -d recap-mcp-stdio

# 或者直接运行
docker-compose run --rm recap-mcp-stdio
```

## 高级配置

### 自定义端口

修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  recap-mcp:
    ports:
      - "8080:3001" # 将服务映射到主机的 8080 端口
```

### 环境变量

可以通过环境变量配置服务：

```yaml
services:
  recap-mcp:
    environment:
      - NODE_ENV=production
      - PORT=3001
      - TRANSPORT_MODE=http
      - LOG_LEVEL=info
```

### 数据卷挂载

数据目录挂载配置：

```yaml
services:
  recap-mcp:
    volumes:
      - ./data:/app/data # 对话数据
      - ./logs:/app/logs # 日志文件
      - ./config:/app/config # 配置文件 (可选)
```

## 开发模式

### 开发环境构建

```bash
# 构建开发镜像
docker build -t recap-mcp:dev .

# 运行开发容器
docker run -it --rm \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/src:/app/src \
  -e NODE_ENV=development \
  recap-mcp:dev
```

### 调试模式

```bash
# 启动容器并进入 shell
docker-compose run --rm recap-mcp sh

# 查看容器内部文件
docker exec -it recap-mcp-server ls -la /app
```

## 常用命令

### 容器管理

```bash
# 查看运行中的容器
docker-compose ps

# 重启服务
docker-compose restart recap-mcp

# 查看实时日志
docker-compose logs -f

# 进入容器
docker-compose exec recap-mcp sh
```

### 镜像管理

```bash
# 重新构建镜像
docker-compose build --no-cache

# 查看镜像
docker images | grep recap

# 清理未使用的镜像
docker image prune -f
```

### 数据管理

```bash
# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 恢复数据
tar -xzf backup-20240101.tar.gz

# 清理数据 (谨慎操作)
docker-compose down -v
```

## 健康检查

服务包含了内置的健康检查机制：

```bash
# 检查服务状态
curl http://localhost:3001/health

# 查看健康检查日志
docker-compose logs recap-mcp | grep health
```

## 故障排除

### 常见问题

1. **端口冲突**

   ```bash
   # 检查端口占用
   lsof -i :3001

   # 修改端口映射
   # 编辑 docker-compose.yml 中的 ports 配置
   ```

2. **权限问题**

   ```bash
   # 检查数据目录权限
   ls -la data/

   # 修复权限
   sudo chown -R $USER:$USER data/
   ```

3. **构建失败**

   ```bash
   # 清理构建缓存
   docker-compose build --no-cache

   # 查看构建日志
   docker-compose build --progress=plain
   ```

### 日志查看

```bash
# 查看所有日志
docker-compose logs

# 查看特定服务日志
docker-compose logs recap-mcp

# 查看最近的日志
docker-compose logs --tail=50

# 实时查看日志
docker-compose logs -f
```

## 生产环境部署

### 安全配置

1. **使用非 root 用户** (已在 Dockerfile 中配置)
2. **限制容器权限**

   ```yaml
   services:
     recap-mcp:
       read_only: true
       cap_drop:
         - ALL
       security_opt:
         - no-new-privileges:true
   ```

3. **网络安全**

   ```yaml
   services:
     recap-mcp:
       networks:
         - internal

   networks:
     internal:
       driver: bridge
       internal: true
   ```

### 监控和日志

```yaml
services:
  recap-mcp:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 资源限制

```yaml
services:
  recap-mcp:
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
```

## 与 MCP 客户端集成

### Claude Desktop 配置

```json
{
  "mcpServers": {
    "recap-docker": {
      "url": "http://localhost:3001/mcp",
      "transport": "streamable-http"
    }
  }
}
```

### 其他客户端

请参考相应客户端的文档，使用 HTTP 传输模式连接到 `http://localhost:3001/mcp`。

## 许可证

此 Docker 配置遵循项目的 ISC 许可证。
