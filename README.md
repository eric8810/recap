# Recap MCP Server

一个基于 Express 的 MCP (Model Context Protocol) 服务器，用于对话记录和回顾管理。

## 功能特性

- 📝 **对话记录工具** - 记录、查询和管理对话历史
- 🌐 **双传输模式** - 支持 stdio 和 HTTP 传输
- 💾 **文件系统存储** - 基于 JSON 文件的本地存储
- 🏷️ **标签管理** - 支持对话标签分类和搜索
- 📊 **统计分析** - 提供对话统计和趋势分析
- 🎯 **TypeScript 优先** - 完整的类型安全支持
- 🚀 **Express 集成** - 提供 RESTful API 端点

## 安装和运行

### 前置要求

- Node.js 18+
- pnpm 8+

### 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd recap

# 安装依赖
pnpm install

# 开发模式运行 (stdio transport)
pnpm run dev

# 或者以 HTTP 模式运行
pnpm run dev http 3001
```

### 构建和部署

```bash
# 构建项目
pnpm run build

# 运行生产版本 (stdio transport)
pnpm start

# 或者以 HTTP 模式运行
pnpm start http 3001
```

## 可用工具

### 1. 对话记录工具 (conversation_recorder)

记录、查询和管理对话历史记录。

**参数：**

- `conversationContent` (string): 需要记录的对话内容
- `action` (enum): 操作类型 - `record`, `query`, `stats`
- `metadata` (object, 可选): 包含标题、参与者、持续时间和对话类型
- `tags` (array, 可选): 对话标签数组
- `summary` (string, 可选): 对话摘要 - "今天聊了什么"
- `thoughts` (string, 可选): 个人想法 - "我觉得..."
- `factual_notes` (string, 可选): 事实记录 - "发生了什么事"
- `queryParams` (object, 可选): 查询参数，用于查询历史记录

**支持的对话类型：**

- 技术讨论 (technical_discussion)
- 问题解决 (problem_solving)
- 创意头脑风暴 (creative_brainstorming)
- 教育 (educational)
- 休闲聊天 (casual_chat)
- 计划 (planning)
- 审查反馈 (review_feedback)
- 其他 (other)

**示例：**

记录对话：

```json
{
  "name": "conversation_recorder",
  "arguments": {
    "conversationContent": "今天我们讨论了项目的进展，需要在下周完成设计稿的修改。",
    "action": "record",
    "metadata": {
      "title": "项目进展讨论",
      "participants": ["小明", "小红"],
      "duration": 30,
      "conversationType": "technical_discussion"
    },
    "tags": ["项目", "设计"],
    "summary": "讨论了项目进展和设计稿修改计划",
    "thoughts": "项目时间有点紧张，需要合理安排任务",
    "factual_notes": "确定在下周完成设计稿修改"
  }
}
```

查询历史记录：

```json
{
  "name": "conversation_recorder",
  "arguments": {
    "conversationContent": "",
    "action": "query",
    "queryParams": {
      "type": "by_tags",
      "tags": ["项目"]
    }
  }
}
```

获取统计信息：

```json
{
  "name": "conversation_recorder",
  "arguments": {
    "conversationContent": "",
    "action": "stats"
  }
}
```

## API 端点

当以 HTTP 模式运行时，服务器提供以下端点：

### 管理端点

- `GET /health` - 健康检查
- `GET /mcp/status` - MCP 服务器状态信息和可用工具列表

### MCP 协议端点

- `ALL /mcp` - Streamable HTTP 传输

所有 MCP 工具都可以通过这些端点访问，包括 `conversation_recorder`。

### 数据存储

- 对话记录存储在 `data/conversations/` 目录下
- 每个对话记录保存为独立的 JSON 文件
- 索引文件 `index.json` 用于快速查询和统计
- 支持按标签、时间范围、对话类型等多种方式查询

## 传输模式

### Stdio Transport (默认)

```bash
pnpm start
```

### HTTP Transport

```bash
pnpm start http 3001
```

HTTP 模式提供了完整的 MCP 协议支持：

- **Streamable HTTP** - 协议版本 2025-03-26
  - 端点: `/mcp`
  - 支持完整的 MCP 会话管理
  - 使用单一端点处理所有 MCP 请求

详细的 HTTP 模式使用指南请参考 [HTTP_USAGE.md](docs/HTTP_USAGE.md)

## Docker 部署

### 快速启动

```bash
# 构建和启动服务 (HTTP 模式)
docker-compose up -d

# 查看日志
docker-compose logs -f recap-mcp

# 停止服务
docker-compose down
```

### 访问服务

- **健康检查**: http://localhost:3001/health
- **MCP 状态**: http://localhost:3001/mcp/status
- **MCP 协议端点**: http://localhost:3001/mcp

### 数据持久化

对话数据将自动保存到本地 `./data` 目录，即使容器重启也不会丢失数据。

详细的 Docker 使用指南请参考 [DOCKER_USAGE.md](docs/DOCKER_USAGE.md)

## GitHub Actions 自动化

项目配置了 GitHub Actions workflow 来自动构建和推送 Docker 镜像：

### 自动触发条件

- **Push 到 main/master 分支** - 构建并推送到 Docker Hub
- **创建版本标签** (如 v1.0.0) - 构建并推送带版本标签的镜像
- **Pull Request** - 仅构建镜像进行测试，不推送

### 使用发布的镜像

```bash
# 拉取最新镜像
docker pull zerob13/recap-mcp-server:latest

# 拉取特定版本
docker pull zerob13/recap-mcp-server:v1.0.0

# 运行容器
docker run -d \
  --name recap-mcp \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  zerob13/recap-mcp-server:latest \
  node dist/index.js http 3001
```

### 配置说明

要使用 GitHub Actions 自动化：

1. 在 GitHub 仓库中设置 Docker Hub 凭证
2. 修改 workflow 文件中的镜像名称
3. 推送代码或创建版本标签即可自动构建

详细配置指南请参考 [GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md)

## 项目结构

```
recap/
├── src/
│   ├── tools/              # 工具定义
│   │   └── ConversationTool.ts
│   ├── storage/            # 存储实现
│   │   └── FileStorage.ts
│   ├── types/              # 类型定义
│   │   └── ConversationRecord.ts
│   ├── resources/          # 资源定义 (预留)
│   ├── prompts/            # 提示定义 (预留)
│   └── index.ts            # 主服务器文件
├── data/                   # 数据存储目录
│   └── conversations/      # 对话记录存储
├── debug/                  # 调试脚本
├── dist/                   # 构建输出
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目文档
```

## 开发指南

### 添加新工具

1. 在 `src/tools/` 目录下创建新工具文件
2. 使用 Zod 定义工具的输入架构
3. 实现工具的执行逻辑
4. 在 `src/index.ts` 中导入并注册工具

### 示例工具结构

```typescript
import { z } from "zod";

export const MyToolSchema = z.object({
  input: z.string().describe("工具输入描述"),
  action: z.enum(["create", "update", "delete"]).describe("操作类型"),
});

export class MyTool {
  static readonly name = "my_tool";
  static readonly description = "工具描述";
  static readonly schema = MyToolSchema;

  static async execute(input: z.infer<typeof MyToolSchema>) {
    // 实现工具逻辑
    try {
      // 处理业务逻辑
      const result = await this.processInput(input);

      return {
        type: "text",
        text: `处理结果: ${result}`,
      };
    } catch (error) {
      return {
        type: "text",
        text: `处理失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      };
    }
  }

  private static async processInput(input: z.infer<typeof MyToolSchema>) {
    // 具体的处理逻辑
    return `已执行 ${input.action} 操作`;
  }
}
```

### 扩展存储功能

如果需要添加新的存储后端，可以实现 `ConversationStorage` 接口：

```typescript
import { ConversationStorage } from "./types/ConversationRecord.js";

export class MyStorage implements ConversationStorage {
  async save(record: ConversationRecord): Promise<void> {
    // 实现保存逻辑
  }

  async getAll(): Promise<ConversationRecord[]> {
    // 实现获取逻辑
  }

  // 实现其他必需方法...
}
```

## 配置 MCP 客户端

### Claude Desktop 配置

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "recap": {
      "command": "node",
      "args": ["/path/to/recap/dist/index.js"]
    }
  }
}
```

### HTTP 模式配置

```json
{
  "mcpServers": {
    "recap-http": {
      "url": "http://localhost:3001/mcp",
      "transport": "streamable-http"
    }
  }
}
```

> **注意：** 不同的 MCP 客户端可能对 HTTP 传输的支持有所不同。请查阅您使用的客户端文档以了解正确的配置格式。

## 技术栈

- **Node.js** - 运行时环境
- **TypeScript** - 类型安全的 JavaScript
- **Express** - Web 框架
- **@modelcontextprotocol/sdk** - MCP 协议 SDK
- **Zod** - 运行时类型验证和架构定义
- **zod-to-json-schema** - Zod 架构转换为 JSON Schema
- **CORS** - 跨域资源共享支持
- **File System** - 基于文件系统的本地存储
- **pnpm** - 包管理器

## 许可证

ISC

## 贡献

欢迎提交 Issues 和 Pull Requests！

## 更新日志

### v1.0.0

- 初始版本
- 支持基本的 MCP 协议
- 包含对话记录工具 (conversation_recorder)
- 支持 stdio 和 HTTP 传输模式
- 基于文件系统的本地存储
- 支持对话标签、分类和搜索功能
- 提供对话统计和查询功能
- 包含调试脚本和测试工具
