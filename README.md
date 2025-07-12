# Recap MCP Server

一个基于 Express 的 MCP (Model Context Protocol) 服务器，用于对话回顾和分析。

## 功能特性

- 🔧 **模块化工具系统** - 支持多种分析工具
- 🌐 **双传输模式** - 支持 stdio 和 HTTP 传输
- 📊 **对话分析** - 提供摘要、见解和行动项提取
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

### 1. 对话分析工具

分析对话内容，提取摘要、见解或行动项。

**参数：**

- `conversation` (string): 需要分析的对话内容
- `type` (enum): 分析类型 - `summary`, `insights`, `action_items`

**示例：**

```json
{
  "name": "conversation_analysis",
  "arguments": {
    "conversation": "今天我们讨论了项目的进展，需要在下周完成设计稿的修改。",
    "type": "action_items"
  }
}
```

## API 端点

当以 HTTP 模式运行时，服务器提供以下端点：

### 管理端点

- `GET /health` - 健康检查
- `GET /mcp/status` - MCP 服务器状态信息

### MCP 协议端点

- `ALL /mcp` - Streamable HTTP 传输

所有 MCP 工具都可以通过这些端点访问，包括 `conversation_analysis`。

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

## 项目结构

```
recap/
├── src/
│   ├── tools/              # 工具定义
│   │   └── ConversationTool.ts
│   ├── resources/          # 资源定义
│   ├── prompts/            # 提示定义
│   ├── types/              # 类型定义
│   └── index.ts            # 主服务器文件
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
});

export class MyTool {
  static readonly name = "my_tool";
  static readonly description = "工具描述";
  static readonly schema = MyToolSchema;

  static async execute(input: z.infer<typeof MyToolSchema>) {
    // 实现工具逻辑
    return {
      type: "text",
      text: `处理结果: ${input.input}`,
    };
  }
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
- **Zod** - 运行时类型验证
- **pnpm** - 包管理器

## 许可证

ISC

## 贡献

欢迎提交 Issues 和 Pull Requests！

## 更新日志

### v1.0.0

- 初始版本
- 支持基本的 MCP 协议
- 包含 对话分析工具
- 支持 stdio 和 HTTP 传输模式
