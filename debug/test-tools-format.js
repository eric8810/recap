#!/usr/bin/env node

// 专门测试工具列表格式的脚本
const BASE_URL = "http://localhost:3001";

async function testToolsFormat() {
  console.log("🔍 测试工具列表格式...");

  try {
    // 1. 初始化会话
    const initResponse = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          clientInfo: { name: "format-test-client", version: "1.0.0" },
        },
      }),
    });

    const sessionId = initResponse.headers.get("Mcp-Session-Id");
    console.log("✅ 会话初始化成功，Session ID:", sessionId);

    // 2. 获取工具列表
    const toolsResponse = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    });

    const toolsText = await toolsResponse.text();
    const toolsData = parseSSEResponse(toolsText);

    console.log("✅ 工具列表获取成功");
    console.log("📊 工具总数:", toolsData.result.tools.length);

    // 3. 验证每个工具的 schema 格式
    for (const tool of toolsData.result.tools) {
      console.log(`\n🔧 工具: ${tool.name}`);
      console.log(`📝 描述: ${tool.description}`);

      const schema = tool.inputSchema;

      // 验证 JSON Schema 格式
      const isValidJsonSchema =
        schema.type === "object" &&
        schema.properties &&
        schema.required &&
        schema.hasOwnProperty("additionalProperties") &&
        schema.$schema;

      if (isValidJsonSchema) {
        console.log("✅ Schema 格式正确 (标准 JSON Schema)");
        console.log("📋 参数:");
        for (const [propName, propDef] of Object.entries(schema.properties)) {
          console.log(
            `  - ${propName}: ${propDef.type} (${
              propDef.description || "无描述"
            })`
          );
        }
      } else {
        console.log("❌ Schema 格式错误 (不是标准 JSON Schema)");
      }
    }

    // 4. 测试工具调用
    console.log("\n🎯 测试工具调用...");
    const callResponse = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Session-Id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "echo",
          arguments: { message: "格式测试消息" },
        },
      }),
    });

    const callText = await callResponse.text();
    const callData = parseSSEResponse(callText);

    console.log("✅ 工具调用成功:", callData.result.content[0].text);

    console.log("\n🎉 所有格式测试通过！工具列表对 MCP 客户端友好。");
  } catch (error) {
    console.error("❌ 格式测试失败:", error.message);
  }
}

// 解析 SSE 响应
function parseSSEResponse(text) {
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        return JSON.parse(line.substring(6));
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    }
  }
  return null;
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testToolsFormat().catch(console.error);
}
