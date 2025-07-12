#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { randomUUID } from "node:crypto";
import {
  ConversationTool,
  ConversationToolSchema,
} from "./tools/ConversationTool.js";

// 创建 MCP 服务器实例的工厂函数
function createMCPServer(): Server {
  const server = new Server(
    {
      name: "recap-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 列出可用工具
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: ConversationTool.name,
          description: ConversationTool.description,
          inputSchema: zodToJsonSchema(ConversationTool.schema),
        },
      ],
    };
  });

  // 调用工具
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case ConversationTool.name: {
          const parsed = ConversationToolSchema.parse(args);
          const result = await ConversationTool.execute(parsed);
          return {
            content: [result],
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `参数验证失败: ${error.message}`
        );
      }
      throw error;
    }
  });

  return server;
}

class RecapMCPServer {
  private app: express.Application;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } =
    {};

  constructor() {
    this.app = express();
    this.setupExpress();
    this.setupHttpRoutes();
  }

  private setupExpress() {
    this.app.use(express.json());
    this.app.use(
      cors({
        origin: "*",
        exposedHeaders: ["Mcp-Session-Id"],
      })
    );
  }

  private setupHttpRoutes() {
    // 健康检查端点
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // MCP 服务器状态端点
    this.app.get("/mcp/status", (req: Request, res: Response) => {
      res.json({
        name: "recap-mcp-server",
        version: "1.0.0",
        capabilities: ["tools"],
        tools: [ConversationTool.name],
      });
    });

    // Streamable HTTP Transport 端点
    this.app.all("/mcp", async (req, res) => {
      console.log(`Received ${req.method} request to /mcp`);
      try {
        const sessionId = req.headers["mcp-session-id"] as string;
        let transport: StreamableHTTPServerTransport | undefined;

        if (sessionId && this.transports[sessionId]) {
          transport = this.transports[sessionId];
        } else if (
          !sessionId &&
          req.method === "POST" &&
          isInitializeRequest(req.body)
        ) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              console.log(
                `StreamableHTTP session initialized with ID: ${sessionId}`
              );
              this.transports[sessionId] = transport!;
            },
          });

          transport.onclose = () => {
            const sid = transport!.sessionId;
            if (sid && this.transports[sid]) {
              console.log(`Transport closed for session ${sid}`);
              delete this.transports[sid];
            }
          };

          const server = createMCPServer();
          await server.connect(transport);
        } else {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Bad Request: No valid session ID provided",
            },
            id: null,
          });
          return;
        }

        if (transport) {
          await transport.handleRequest(req, res, req.body);
        }
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    });
  }

  async runWithStdio() {
    console.error("启动 MCP 服务器 (stdio transport)...");
    const transport = new StdioServerTransport();
    const server = createMCPServer();
    await server.connect(transport);
    console.error("MCP 服务器已启动");
  }

  async runWithHttp(port: number = 3001) {
    console.error(`启动 MCP 服务器 (HTTP transport) 在端口 ${port}...`);
    this.app.listen(port, () => {
      console.error(`MCP 服务器运行在 http://localhost:${port}`);
      console.error(`
==============================================
MCP 传输端点:

1. Streamable HTTP - 协议版本 2025-03-26
   端点: /mcp
   方法: GET, POST, DELETE
   使用方式:
     - POST /mcp (初始化)
     - GET /mcp (建立 SSE 流)
     - POST /mcp (发送请求)
     - DELETE /mcp (终止会话)

2. 状态端点:
   - GET /health (健康检查)
   - GET /mcp/status (MCP 服务器状态)
==============================================
      `);
    });
  }

  async start() {
    const args = process.argv.slice(2);
    const mode = args[0] || "stdio";
    const port = parseInt(args[1]) || 3001;

    if (mode === "http") {
      await this.runWithHttp(port);
    } else {
      await this.runWithStdio();
    }
  }
}

// 启动服务器
const server = new RecapMCPServer();
server.start().catch(console.error);
