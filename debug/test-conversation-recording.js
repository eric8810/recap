#!/usr/bin/env node

// 测试会话记录功能
const testConversationRecording = async () => {
  console.log("🧪 开始测试会话记录功能...\n");

  // 先初始化MCP会话
  let sessionId = null;
  try {
    console.log("🔄 初始化MCP会话...");
    const initResponse = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {
            tools: {},
          },
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      }),
    });

    const initResult = await initResponse.json();
    sessionId = initResponse.headers.get("mcp-session-id");
    console.log(`✅ 会话初始化成功，Session ID: ${sessionId}\n`);
  } catch (error) {
    console.error("❌ 初始化会话失败:", error.message);
    return;
  }

  // 模拟 MCP 请求
  const testRequests = [
    {
      name: "测试记录会话",
      request: {
        method: "tools/call",
        params: {
          name: "conversation_recorder",
          arguments: {
            action: "record",
            conversationContent: `用户: 你好，我想了解如何搭建一个MCP服务器。

AI: 你好！我很乐意帮助你了解如何搭建MCP服务器。MCP（Model Context Protocol）是一个用于AI模型和应用程序之间通信的协议。

用户: 具体需要什么技术栈？

AI: 主要需要以下技术栈：
1. Node.js - 作为运行时环境
2. TypeScript - 用于类型安全的开发
3. @modelcontextprotocol/sdk - MCP官方SDK
4. Express - 如果需要HTTP传输
5. zod - 用于参数验证

用户: 谢谢，这很有帮助！我现在明白了基本的技术要求。

AI: 不客气！如果在实际搭建过程中遇到问题，随时可以问我。祝你搭建成功！`,
            metadata: {
              title: "MCP服务器搭建指导",
              participants: ["用户", "AI"],
              duration: 5,
            },
            tags: ["技术", "MCP", "服务器", "教程"],
          },
        },
      },
    },
    {
      name: "测试查询最近记录",
      request: {
        method: "tools/call",
        params: {
          name: "conversation_recorder",
          arguments: {
            action: "query",
            conversationContent: "",
          },
        },
      },
    },
    {
      name: "测试获取统计信息",
      request: {
        method: "tools/call",
        params: {
          name: "conversation_recorder",
          arguments: {
            action: "stats",
            conversationContent: "",
          },
        },
      },
    },
  ];

  // 发送测试请求
  for (const test of testRequests) {
    console.log(`📋 ${test.name}:`);
    console.log("请求:", JSON.stringify(test.request, null, 2));

    try {
      const response = await fetch("http://localhost:3001/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "mcp-session-id": sessionId,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: test.request.method,
          params: test.request.params,
          id: Date.now(),
        }),
      });

      const result = await response.json();
      console.log("响应:", JSON.stringify(result, null, 2));
      console.log("✅ 成功\n");
    } catch (error) {
      console.error(`❌ 失败: ${error.message}\n`);
    }
  }

  console.log("🎉 测试完成！");
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testConversationRecording().catch(console.error);
}

export { testConversationRecording };
