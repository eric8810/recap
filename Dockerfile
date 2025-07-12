# 使用 Node.js 22 Alpine 基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml (如果存在)
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm run build

# 创建数据目录
RUN mkdir -p data/conversations

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口 (用于 HTTP 模式)
EXPOSE 3001

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S recap -u 1001

# 更改目录权限
RUN chown -R recap:nodejs /app
USER recap

# 启动命令 (默认使用 stdio 模式)
CMD ["node", "dist/index.js"] 