#!/usr/bin/env node

const BASE_URL = "http://localhost:3001";

// 主要测试函数
async function testConnection() {
  console.log("🔍 测试 MCP 连接...");
  console.log(`🎯 目标服务器: ${BASE_URL}`);

  try {
    // 1. 测试健康检查
    console.log("\n1️⃣ 测试健康检查...");
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`健康检查失败: ${healthResponse.status}`);
    }
    console.log("✅ 健康检查通过");

    // 2. 测试 MCP 状态
    console.log("\n2️⃣ 测试 MCP 状态...");
    const statusResponse = await fetch(`${BASE_URL}/mcp/status`);
    if (!statusResponse.ok) {
      throw new Error(`状态检查失败: ${statusResponse.status}`);
    }
    console.log("✅ MCP 状态正常");

    // 3. 测试 MCP 初始化
    console.log("\n3️⃣ 测试 MCP 初始化...");
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
          capabilities: {
            tools: {},
          },
          clientInfo: {
            name: "debug-client",
            version: "1.0.0",
          },
        },
      }),
    });

    if (!initResponse.ok) {
      throw new Error(
        `Initialize failed: ${initResponse.status} ${initResponse.statusText}`
      );
    }

    const sessionId = initResponse.headers.get("Mcp-Session-Id");

    // 解析 SSE 响应
    const initText = await initResponse.text();
    console.log("🔍 原始初始化响应:", initText);
    const initData = parseSSEResponse(initText);
    console.log("✅ MCP 初始化成功:", JSON.stringify(initData, null, 2));
    console.log("📝 Session ID:", sessionId);

    // 4. 测试工具列表
    console.log("\n4️⃣ 测试工具列表...");
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

    if (!toolsResponse.ok) {
      throw new Error(`Tools list failed: ${toolsResponse.status}`);
    }

    const toolsText = await toolsResponse.text();
    console.log("🔍 原始工具列表响应:", toolsText);
    const toolsData = parseSSEResponse(toolsText);
    console.log("✅ 工具列表获取成功:", JSON.stringify(toolsData, null, 2));

    // 5. 测试工具调用
    console.log("\n5️⃣ 测试工具调用...");
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
          arguments: {
            message: "Hello from debug script!",
          },
        },
      }),
    });

    if (!callResponse.ok) {
      throw new Error(`Tool call failed: ${callResponse.status}`);
    }

    const callText = await callResponse.text();
    console.log("🔍 原始工具调用响应:", callText);
    const callData = parseSSEResponse(callText);
    console.log("✅ 工具调用成功:", JSON.stringify(callData, null, 2));

    console.log("\n🎉 所有测试通过！MCP 服务器工作正常。");

    return {
      success: true,
      sessionId,
      endpoints: {
        health: `${BASE_URL}/health`,
        status: `${BASE_URL}/mcp/status`,
        mcp: `${BASE_URL}/mcp`,
      },
    };
  } catch (error) {
    console.error("\n❌ 测试失败:", error.message);
    console.error("\n🔧 可能的解决方案:");
    console.error("1. 确保服务器正在运行: pnpm start http 3001");
    console.error("2. 检查端口是否被占用: lsof -i :3001");
    console.error("3. 检查防火墙设置");
    console.error("4. 确保使用正确的 URL 和端口");
    console.error("5. 检查是否包含正确的 Accept 头部");

    return {
      success: false,
      error: error.message,
    };
  }
}

// 解析 SSE 响应
function parseSSEResponse(text) {
  const lines = text.split("\n");
  let data = null;

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        data = JSON.parse(line.substring(6));
        break;
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    }
  }

  return data;
}

// 网络连接诊断
async function diagnoseNetwork() {
  console.log("\n🌐 网络连接诊断...");

  const tests = [
    { name: "localhost:3001", url: "http://localhost:3001" },
    { name: "127.0.0.1:3001", url: "http://127.0.0.1:3001" },
    { name: "0.0.0.0:3001", url: "http://0.0.0.0:3001" },
  ];

  for (const test of tests) {
    try {
      const response = await fetch(`${test.url}/health`, { timeout: 2000 });
      console.log(`✅ ${test.name}: 连接成功`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
MCP 连接测试工具

用法:
  node debug/test-mcp-connection.js [选项]

选项:
  --network   网络连接诊断
  --help, -h  显示帮助信息

示例:
  node debug/test-mcp-connection.js
  node debug/test-mcp-connection.js --network
    `);
    return;
  }

  if (args.includes("--network")) {
    await diagnoseNetwork();
    return;
  }

  // 默认运行完整测试
  const result = await testConnection();

  if (result.success) {
    console.log("\n📋 连接信息总结:");
    console.log(`Session ID: ${result.sessionId}`);
    console.log("可用端点:");
    Object.entries(result.endpoints).forEach(([name, url]) => {
      console.log(`  ${name}: ${url}`);
    });
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testConnection, diagnoseNetwork };
