# GitHub Actions 配置指南

本文档介绍如何配置 GitHub Actions 来自动构建和推送 Recap MCP 服务器的 Docker 镜像。

## 概述

GitHub Actions workflow 会在以下情况下自动触发：

- **Push 到 main/master 分支** - 构建并推送到 Docker Hub
- **创建版本标签** (如 v1.0.0) - 构建并推送带版本标签的镜像
- **Pull Request** - 仅构建镜像进行测试，不推送

## 配置步骤

### 1. 设置 Docker Hub 凭证

在 GitHub 仓库中设置以下 Secrets：

1. 进入 GitHub 仓库页面
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 添加以下 Repository secrets：

   - `DOCKERHUB_USERNAME`: 您的 Docker Hub 用户名
   - `DOCKERHUB_TOKEN`: 您的 Docker Hub 访问令牌

### 2. 创建 Docker Hub 访问令牌

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 点击右上角头像 → **My Account**
3. 选择 **Security** 标签页
4. 点击 **New Access Token**
5. 创建一个有 **Read, Write, Delete** 权限的令牌
6. 复制生成的令牌并保存到 GitHub Secrets

### 3. 修改镜像名称

在 `.github/workflows/docker-build-push.yml` 文件中，修改以下配置：

```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: your-username/recap-mcp-server # 替换为您的 Docker Hub 用户名
```

### 4. 自定义构建配置

#### 支持的平台

当前配置支持以下平台：

- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64)

如需修改支持的平台，编辑 workflow 文件中的 `platforms` 字段：

```yaml
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

#### 标签策略

当前配置的标签策略：

- **分支推送**: `branch-name`
- **PR**: `pr-123`
- **语义版本**: `v1.0.0`, `1.0`, `1`
- **最新版本**: `latest` (仅限默认分支)

### 5. 手动触发构建

您也可以手动触发构建：

1. 进入 GitHub 仓库的 **Actions** 页面
2. 选择 **Build and Push Docker Image** workflow
3. 点击 **Run workflow** 按钮

## 使用发布的镜像

### 拉取最新镜像

```bash
docker pull your-username/recap-mcp-server:latest
```

### 拉取特定版本

```bash
docker pull your-username/recap-mcp-server:v1.0.0
```

### 运行容器

```bash
# HTTP 模式
docker run -d \
  --name recap-mcp \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  your-username/recap-mcp-server:latest \
  node dist/index.js http 3001

# Stdio 模式
docker run -it \
  --name recap-mcp-stdio \
  -v $(pwd)/data:/app/data \
  your-username/recap-mcp-server:latest
```

## 工作流程详解

### 触发条件

```yaml
on:
  push:
    branches: [main, master]
    tags: ["v*"]
  pull_request:
    branches: [main, master]
```

### 构建步骤

1. **检出代码** - 获取最新的源代码
2. **设置 Docker Buildx** - 启用高级构建功能
3. **登录 Docker Hub** - 使用存储的凭证登录
4. **提取元数据** - 生成标签和标签信息
5. **构建和推送** - 多平台构建并推送镜像
6. **更新描述** - 自动更新 Docker Hub 仓库描述
7. **测试镜像** - 在 PR 中测试构建的镜像

### 缓存策略

workflow 使用 GitHub Actions 缓存来加速构建：

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

这可以显著减少重复构建的时间。

## 监控和调试

### 查看构建日志

1. 进入 GitHub 仓库的 **Actions** 页面
2. 点击相应的 workflow run
3. 查看各个步骤的详细日志

### 常见问题

#### 1. 认证失败

**错误**: `unauthorized: incorrect username or password`

**解决**: 检查 GitHub Secrets 中的 `DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN` 是否正确。

#### 2. 推送失败

**错误**: `denied: requested access to the resource is denied`

**解决**: 确保 Docker Hub 访问令牌有正确的权限，并且镜像名称正确。

#### 3. 构建超时

**错误**: `The job was canceled because it exceeded the maximum execution time`

**解决**:

- 检查 Dockerfile 是否有不必要的操作
- 确保缓存配置正确
- 考虑减少构建的平台数量

### 构建状态徽章

您可以在 README.md 中添加构建状态徽章：

```markdown
[![Docker Build](https://github.com/your-username/recap/actions/workflows/docker-build-push.yml/badge.svg)](https://github.com/your-username/recap/actions/workflows/docker-build-push.yml)
```

## 高级配置

### 条件构建

如果您想要在特定条件下构建，可以添加条件：

```yaml
- name: Build and push Docker image
  if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/')
  uses: docker/build-push-action@v6
```

### 多个 Dockerfile

如果您有多个 Dockerfile，可以创建多个 job：

```yaml
jobs:
  build-server:
    # 构建服务器镜像
  build-client:
    # 构建客户端镜像
```

### 安全扫描

添加安全扫描步骤：

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
    format: "sarif"
    output: "trivy-results.sarif"
```

## 最佳实践

1. **使用特定的 Action 版本** - 避免使用 `@latest`
2. **限制权限** - 只给必要的权限
3. **使用 Secrets** - 永远不要在代码中硬编码凭证
4. **标签管理** - 使用语义化版本控制
5. **缓存优化** - 合理使用缓存减少构建时间
6. **多平台支持** - 考虑不同的目标平台

## 许可证

此配置遵循项目的 ISC 许可证。
