############  1️⃣ builder stage  ############
FROM node:22-alpine AS builder
WORKDIR /app

# 启用 corepack 并准备 pnpm，版本随项目锁定
RUN corepack enable && corepack prepare pnpm@latest --activate

# 安装构建期需要的工具（node-gyp 用）──如果项目没有原生模块可省
RUN apk add --no-cache --virtual .build-deps python3 make g++

# 先复制 lockfile、package.json，方便利用缓存
COPY package.json pnpm-lock.yaml ./

# 装 *全部* 依赖（含 dev）
RUN pnpm install --frozen-lockfile

# 再复制源码，防止每次改 src 都失去缓存
COPY . .

# 这一步如果出错，直接 docker build --progress=plain 观察即可
RUN pnpm run build         # ts->js, dist/ 生成完毕

############  2️⃣ runtime stage  ############
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# 启用 corepack，保持 pnpm 版本一致
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制运行所需文件：dist、package.json、.npmrc
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.npmrc* ./  
# 如果你有 .npmrc / .npmrc.docker 均可

# 生产依赖，跳过 scripts，加速&安全
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# 可选：清理缓存 / 删除多余文件（pnpm store prune 也行）
RUN rm -rf /root/.cache

# 应用数据目录（非 root 用户要有写权限）
RUN mkdir -p /app/data/conversations

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S recap -u 1001
USER recap

EXPOSE 3001
CMD ["node", "dist/index.js"]