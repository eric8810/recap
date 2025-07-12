#!/usr/bin/env node

import { ConversationTool } from "../dist/tools/ConversationTool.js";

// 直接测试ConversationTool类
const testConversationTool = async () => {
  console.log("🧪 开始直接测试ConversationTool类...\n");

  // 测试1：记录会话
  console.log("📋 测试1: 记录会话");
  try {
    const recordResult = await ConversationTool.execute({
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
    });

    console.log("✅ 记录会话成功:");
    console.log(recordResult.text);
    console.log("\n");
  } catch (error) {
    console.error("❌ 记录会话失败:", error.message);
  }

  // 测试2：查询最近记录
  console.log("📋 测试2: 查询最近记录");
  try {
    const queryResult = await ConversationTool.execute({
      action: "query",
      conversationContent: "",
    });

    console.log("✅ 查询记录成功:");
    console.log(queryResult.text);
    console.log("\n");
  } catch (error) {
    console.error("❌ 查询记录失败:", error.message);
  }

  // 测试3：获取统计信息
  console.log("📋 测试3: 获取统计信息");
  try {
    const statsResult = await ConversationTool.execute({
      action: "stats",
      conversationContent: "",
    });

    console.log("✅ 获取统计信息成功:");
    console.log(statsResult.text);
    console.log("\n");
  } catch (error) {
    console.error("❌ 获取统计信息失败:", error.message);
  }

  // 测试4：再记录一个不同类型的会话
  console.log("📋 测试4: 记录问题解决类型的会话");
  try {
    const recordResult2 = await ConversationTool.execute({
      action: "record",
      conversationContent: `用户: 我的代码出现了错误，TypeScript报错说找不到模块。

AI: 这是一个常见的TypeScript模块解析问题。请检查以下几点：
1. 确保导入路径正确
2. 检查tsconfig.json的moduleResolution设置
3. 确认被导入的文件存在

用户: 我检查了，原来是文件扩展名的问题。我使用了.js扩展名，但实际文件是.ts。

AI: 很好！这确实是ES模块中的一个常见问题。在TypeScript中使用ES模块时，需要使用.js扩展名来导入.ts文件。

用户: 现在问题解决了，谢谢！

AI: 不客气！记住这个经验，下次遇到类似问题就知道怎么处理了。`,
      metadata: {
        title: "TypeScript模块解析问题",
        participants: ["用户", "AI"],
        duration: 3,
      },
      tags: ["问题解决", "TypeScript", "模块"],
    });

    console.log("✅ 记录问题解决会话成功:");
    console.log(recordResult2.text);
    console.log("\n");
  } catch (error) {
    console.error("❌ 记录问题解决会话失败:", error.message);
  }

  // 测试5：按标签查询
  console.log("📋 测试5: 按标签查询");
  try {
    const tagQueryResult = await ConversationTool.execute({
      action: "query",
      conversationContent: "",
      queryParams: {
        type: "by_tags",
        tags: ["技术"],
      },
    });

    console.log("✅ 按标签查询成功:");
    console.log(tagQueryResult.text);
    console.log("\n");
  } catch (error) {
    console.error("❌ 按标签查询失败:", error.message);
  }

  // 测试6：搜索功能
  console.log("📋 测试6: 搜索功能");
  try {
    const searchResult = await ConversationTool.execute({
      action: "query",
      conversationContent: "",
      queryParams: {
        type: "search",
        searchQuery: "MCP",
      },
    });

    console.log("✅ 搜索功能成功:");
    console.log(searchResult.text);
    console.log("\n");
  } catch (error) {
    console.error("❌ 搜索功能失败:", error.message);
  }

  console.log("🎉 所有测试完成！");
};

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testConversationTool().catch(console.error);
}

export { testConversationTool };
