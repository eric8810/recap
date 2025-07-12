import { z } from "zod";
import { randomUUID } from "crypto";
import {
  ConversationRecord,
  ConversationRecordInput,
  ConversationType,
} from "../types/ConversationRecord.js";
import { FileStorage } from "../storage/FileStorage.js";

// 自然的会话记录工具Schema
export const ConversationToolSchema = z.object({
  conversationContent: z.string().describe("需要记录的会话内容"),
  action: z
    .enum(["record", "query", "stats"])
    .describe("要执行的操作：record=记录会话, query=查询历史, stats=获取统计"),

  // 可选的元数据
  metadata: z
    .object({
      title: z.string().optional().describe("会话标题"),
      participants: z.array(z.string()).optional().describe("参与者列表"),
      duration: z.number().optional().describe("会话持续时间（分钟）"),
      conversationType: z
        .nativeEnum(ConversationType)
        .optional()
        .describe("会话类型"),
    })
    .optional(),

  tags: z.array(z.string()).optional().describe("会话标签"),

  // 可选的小作文字段
  summary: z.string().optional().describe("今天聊了什么"),
  thoughts: z.string().optional().describe("我觉得..."),
  factual_notes: z.string().optional().describe("发生了什么事"),

  // 查询参数
  queryParams: z
    .object({
      type: z
        .enum(["by_tags", "by_time_range", "by_type", "search"])
        .optional()
        .describe("查询类型"),
      tags: z.array(z.string()).optional().describe("查询标签"),
      startTime: z.string().optional().describe("开始时间"),
      endTime: z.string().optional().describe("结束时间"),
      conversationType: z
        .nativeEnum(ConversationType)
        .optional()
        .describe("查询的会话类型"),
      searchQuery: z.string().optional().describe("搜索关键词"),
    })
    .optional(),
});

export type ConversationToolInput = z.infer<typeof ConversationToolSchema>;

export class ConversationTool {
  static readonly name = "conversation_recorder";
  static readonly description = `
    The conversation recorder tool is used to record the conversation between the user and the you.
    You must use this tool to record the conversation between the user and the you.
    If you do not do this, you will be fired.
    `;
  static readonly schema = ConversationToolSchema;

  private static storage = new FileStorage();

  static async execute(input: ConversationToolInput) {
    const {
      action,
      conversationContent,
      metadata,
      tags,
      summary,
      thoughts,
      factual_notes,
      queryParams,
    } = input;

    try {
      switch (action) {
        case "record":
          return await this.recordConversation({
            content: conversationContent,
            ...metadata,
            tags,
            summary,
            thoughts,
            factual_notes,
          });

        case "query":
          return await this.queryConversations(queryParams);

        case "stats":
          return await this.getStorageStats();

        default:
          throw new Error(`不支持的操作: ${action}`);
      }
    } catch (error) {
      return {
        type: "text",
        text: `执行失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      };
    }
  }

  // 记录会话方法
  private static async recordConversation(input: ConversationRecordInput) {
    try {
      const record = await this.createRecord(input);
      await this.storage.save(record);

      return {
        type: "text",
        text: `✅ 会话记录成功保存！
        
📋 **记录摘要:**
- 记录ID: ${record.id}
- 时间: ${new Date(record.timestamp).toLocaleString("zh-CN")}
- 标题: ${record.title || "无标题"}
- 类型: ${
          record.conversationType
            ? this.getConversationTypeLabel(record.conversationType)
            : "未分类"
        }
- 参与者: ${record.participants?.join(", ") || "未指定"}
- 标签: ${record.tags?.join(", ") || "无"}
- 字数: ${record.wordCount || 0}

📝 **记录内容:**
${record.summary ? `**今天聊了什么:**\n${record.summary}\n` : ""}
${record.thoughts ? `**我觉得:**\n${record.thoughts}\n` : ""}
${record.factual_notes ? `**发生了什么事:**\n${record.factual_notes}` : ""}`,
      };
    } catch (error) {
      throw new Error(
        `记录会话失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  // 查询会话记录
  private static async queryConversations(
    queryParams?: ConversationToolInput["queryParams"]
  ) {
    try {
      if (!queryParams) {
        // 返回最近的记录
        const allRecords = await this.storage.getAll();
        const recentRecords = allRecords.slice(0, 5);

        return {
          type: "text",
          text:
            `📚 **最近的会话记录 (${recentRecords.length}条):**\n\n` +
            recentRecords
              .map(
                (record) =>
                  `• ${record.title || "无标题"}\n` +
                  `  时间: ${new Date(record.timestamp).toLocaleString(
                    "zh-CN"
                  )}\n` +
                  `  类型: ${
                    record.conversationType
                      ? this.getConversationTypeLabel(record.conversationType)
                      : "未分类"
                  }\n` +
                  `  标签: ${record.tags?.join(", ") || "无"}\n` +
                  `  摘要: ${
                    record.summary?.substring(0, 100) || "暂无摘要"
                  }...\n`
              )
              .join("\n"),
        };
      }

      let results: ConversationRecord[] = [];

      switch (queryParams.type) {
        case "by_tags":
          if (queryParams.tags) {
            results = await this.storage.getByTags(queryParams.tags);
          }
          break;
        case "by_time_range":
          if (queryParams.startTime && queryParams.endTime) {
            results = await this.storage.getByTimeRange(
              queryParams.startTime,
              queryParams.endTime
            );
          }
          break;
        case "by_type":
          if (queryParams.conversationType) {
            results = await this.storage.getByType(
              queryParams.conversationType
            );
          }
          break;
        case "search":
          if (queryParams.searchQuery) {
            results = await this.storage.search(queryParams.searchQuery);
          }
          break;
      }

      return {
        type: "text",
        text:
          `🔍 **查询结果 (${results.length}条):**\n\n` +
          results
            .slice(0, 10)
            .map(
              (record) =>
                `• ${record.title || "无标题"}\n` +
                `  时间: ${new Date(record.timestamp).toLocaleString(
                  "zh-CN"
                )}\n` +
                `  类型: ${
                  record.conversationType
                    ? this.getConversationTypeLabel(record.conversationType)
                    : "未分类"
                }\n` +
                `  标签: ${record.tags?.join(", ") || "无"}\n` +
                `  摘要: ${
                  record.summary?.substring(0, 100) || "暂无摘要"
                }...\n`
            )
            .join("\n") +
          (results.length > 10
            ? `\n（显示前10条，共${results.length}条结果）`
            : ""),
      };
    } catch (error) {
      throw new Error(
        `查询失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  // 获取存储统计信息
  private static async getStorageStats() {
    try {
      const stats = await this.storage.getStats();

      return {
        type: "text",
        text: `📊 **会话记录统计:**

📈 **总体信息:**
- 总记录数: ${stats.totalRecords}
- 最早记录: ${
          stats.oldestRecord
            ? new Date(stats.oldestRecord).toLocaleString("zh-CN")
            : "无"
        }
- 最新记录: ${
          stats.newestRecord
            ? new Date(stats.newestRecord).toLocaleString("zh-CN")
            : "无"
        }
- 标签总数: ${stats.totalTags}

🗂️ **会话类型分布:**
${Object.entries(stats.conversationTypes)
  .map(
    ([type, count]) =>
      `• ${this.getConversationTypeLabel(type as ConversationType)}: ${count}条`
  )
  .join("\n")}

🏷️ **热门标签:**
${stats.popularTags
  .slice(0, 5)
  .map((tag) => `• ${tag.tag}: ${tag.count}次`)
  .join("\n")}`,
      };
    } catch (error) {
      throw new Error(
        `获取统计信息失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  // 创建记录方法
  private static async createRecord(
    input: ConversationRecordInput
  ): Promise<ConversationRecord> {
    const {
      content,
      title,
      participants,
      duration,
      conversationType,
      tags,
      summary,
      thoughts,
      factual_notes,
    } = input;

    const record: ConversationRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      content,
      title: title || this.generateTitle(content),
      participants: participants || ["AI", "User"],
      conversationType:
        conversationType || this.classifyConversationType(content),
      tags: tags || this.generateTags(content),
      wordCount: this.countWords(content),
      duration,

      // 小作文字段
      summary: summary || this.generateSummary(content),
      thoughts: thoughts || this.generateThoughts(content),
      factual_notes: factual_notes || this.generateFactualNotes(content),
    };

    return record;
  }

  // 辅助方法
  private static generateTitle(content: string): string {
    const firstLine = content.split("\n")[0];
    if (firstLine.length > 50) {
      return firstLine.substring(0, 50) + "...";
    }
    return firstLine || `对话 ${new Date().toLocaleString("zh-CN")}`;
  }

  private static generateSummary(content: string): string {
    const keyPoints = [];

    if (/问题|困难|挑战/.test(content)) {
      keyPoints.push("讨论了遇到的问题");
    }
    if (/解决|方案|建议/.test(content)) {
      keyPoints.push("探讨了解决方案");
    }
    if (/技术|代码|开发/.test(content)) {
      keyPoints.push("进行了技术交流");
    }
    if (/学习|教学/.test(content)) {
      keyPoints.push("分享了学习经验");
    }

    return keyPoints.length > 0
      ? `今天我们${keyPoints.join("，")}。`
      : "进行了一次有意义的对话。";
  }

  private static generateThoughts(content: string): string {
    const thoughts = [];

    if (/复杂|困难/.test(content)) {
      thoughts.push("这个问题比较复杂，需要仔细考虑");
    }
    if (/有趣|创新/.test(content)) {
      thoughts.push("讨论的内容很有趣，有新的启发");
    }
    if (/有用|实用/.test(content)) {
      thoughts.push("这次对话很有实用价值");
    }

    return thoughts.length > 0
      ? thoughts.join("。") + "。"
      : "这次对话很有收获。";
  }

  private static generateFactualNotes(content: string): string {
    const facts = [];

    if (/决定|确定/.test(content)) {
      facts.push("做出了一些决定");
    }
    if (/修改|更新|改进/.test(content)) {
      facts.push("对系统进行了修改");
    }
    if (/测试|验证/.test(content)) {
      facts.push("进行了测试验证");
    }

    return facts.length > 0
      ? facts.join("，") + "。"
      : "记录了对话的主要内容。";
  }

  private static generateTags(content: string): string[] {
    const tags = [];

    if (/技术|technical|代码|code/.test(content)) tags.push("技术");
    if (/问题|problem|错误|error/.test(content)) tags.push("问题");
    if (/开发|development|编程/.test(content)) tags.push("开发");
    if (/API|接口/.test(content)) tags.push("API");
    if (/数据库|database/.test(content)) tags.push("数据库");
    if (/服务器|server/.test(content)) tags.push("服务器");
    if (/学习|教学|tutorial/.test(content)) tags.push("学习");

    return tags.length > 0 ? tags : ["其他"];
  }

  private static classifyConversationType(content: string): ConversationType {
    if (/问题|错误|bug|故障/.test(content)) {
      return ConversationType.PROBLEM_SOLVING;
    }
    if (/技术|代码|programming|development/.test(content)) {
      return ConversationType.TECHNICAL_DISCUSSION;
    }
    if (/学习|教学|教程|tutorial/.test(content)) {
      return ConversationType.EDUCATIONAL;
    }
    if (/计划|planning|安排/.test(content)) {
      return ConversationType.PLANNING;
    }
    if (/创意|想法|brainstorm/.test(content)) {
      return ConversationType.CREATIVE_BRAINSTORMING;
    }
    if (/审查|review|反馈/.test(content)) {
      return ConversationType.REVIEW_FEEDBACK;
    }

    return ConversationType.OTHER;
  }

  private static countWords(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  private static getConversationTypeLabel(type: ConversationType): string {
    const labels = {
      [ConversationType.TECHNICAL_DISCUSSION]: "技术讨论",
      [ConversationType.PROBLEM_SOLVING]: "问题解决",
      [ConversationType.CREATIVE_BRAINSTORMING]: "创意头脑风暴",
      [ConversationType.EDUCATIONAL]: "教育学习",
      [ConversationType.CASUAL_CHAT]: "休闲聊天",
      [ConversationType.PLANNING]: "计划制定",
      [ConversationType.REVIEW_FEEDBACK]: "审查反馈",
      [ConversationType.OTHER]: "其他",
    };
    return labels[type] || "其他";
  }
}
