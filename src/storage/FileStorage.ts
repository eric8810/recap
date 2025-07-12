import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  ConversationRecord,
  ConversationStorage,
  ConversationType,
} from "../types/ConversationRecord.js";

export class FileStorage implements ConversationStorage {
  private readonly storagePath: string;
  private readonly indexPath: string;

  constructor(storagePath: string = "./data/conversations") {
    this.storagePath = storagePath;
    this.indexPath = path.join(storagePath, "index.json");
  }

  // 初始化存储目录
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });

      // 检查索引文件是否存在，不存在则创建
      try {
        await fs.access(this.indexPath);
      } catch {
        await fs.writeFile(this.indexPath, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      throw error;
    }
  }

  // 保存会话记录
  async save(record: ConversationRecord): Promise<void> {
    try {
      await this.initialize();

      // 如果没有ID，生成一个
      if (!record.id) {
        record.id = randomUUID();
      }

      // 保存单独的记录文件
      const recordPath = path.join(this.storagePath, `${record.id}.json`);
      await fs.writeFile(recordPath, JSON.stringify(record, null, 2));

      // 更新索引
      await this.updateIndex(record);

      console.log(`Conversation record saved: ${record.id}`);
    } catch (error) {
      console.error("Failed to save conversation record:", error);
      throw error;
    }
  }

  // 根据ID获取记录
  async getById(id: string): Promise<ConversationRecord | null> {
    try {
      const recordPath = path.join(this.storagePath, `${id}.json`);
      const data = await fs.readFile(recordPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      console.error("Failed to get conversation record:", error);
      throw error;
    }
  }

  // 获取所有记录
  async getAll(): Promise<ConversationRecord[]> {
    try {
      const index = await this.getIndex();
      const records: ConversationRecord[] = [];

      for (const indexEntry of index) {
        const record = await this.getById(indexEntry.id);
        if (record) {
          records.push(record);
        }
      }

      return records.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error("Failed to get all conversation records:", error);
      throw error;
    }
  }

  // 根据标签查询
  async getByTags(tags: string[]): Promise<ConversationRecord[]> {
    try {
      const allRecords = await this.getAll();
      return allRecords.filter((record) =>
        tags.some((tag) => (record.tags || []).includes(tag))
      );
    } catch (error) {
      console.error("Failed to get conversation records by tags:", error);
      throw error;
    }
  }

  // 根据时间范围查询
  async getByTimeRange(
    start: string,
    end: string
  ): Promise<ConversationRecord[]> {
    try {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();

      const allRecords = await this.getAll();
      return allRecords.filter((record) => {
        const recordTime = new Date(record.timestamp).getTime();
        return recordTime >= startTime && recordTime <= endTime;
      });
    } catch (error) {
      console.error("Failed to get conversation records by time range:", error);
      throw error;
    }
  }

  // 根据对话类型查询
  async getByType(type: ConversationType): Promise<ConversationRecord[]> {
    try {
      const allRecords = await this.getAll();
      return allRecords.filter(
        (record) => (record.conversationType || ConversationType.OTHER) === type
      );
    } catch (error) {
      console.error("Failed to get conversation records by type:", error);
      throw error;
    }
  }

  // 搜索功能
  async search(query: string): Promise<ConversationRecord[]> {
    try {
      const allRecords = await this.getAll();
      const lowerQuery = query.toLowerCase();

      return allRecords.filter((record) => {
        // 搜索各个字段
        const searchFields = [
          record.title || "",
          record.summary || "",
          record.thoughts || "",
          record.factual_notes || "",
          record.content,
          ...(record.tags || []),
        ];

        return searchFields.some((field) =>
          field.toLowerCase().includes(lowerQuery)
        );
      });
    } catch (error) {
      console.error("Failed to search conversation records:", error);
      throw error;
    }
  }

  // 获取索引
  private async getIndex(): Promise<IndexEntry[]> {
    try {
      const data = await fs.readFile(this.indexPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // 更新索引
  private async updateIndex(record: ConversationRecord): Promise<void> {
    try {
      const index = await this.getIndex();

      // 检查是否已存在
      const existingIndex = index.findIndex((entry) => entry.id === record.id);

      const indexEntry: IndexEntry = {
        id: record.id,
        timestamp: record.timestamp,
        title: record.title || `对话 ${record.id.substring(0, 8)}`,
        tags: record.tags || [],
        conversationType: record.conversationType || ConversationType.OTHER,
      };

      if (existingIndex >= 0) {
        index[existingIndex] = indexEntry;
      } else {
        index.push(indexEntry);
      }

      // 按时间排序
      index.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error("Failed to update index:", error);
      throw error;
    }
  }

  // 获取存储统计信息
  async getStats(): Promise<StorageStats> {
    try {
      const allRecords = await this.getAll();
      const totalRecords = allRecords.length;

      if (totalRecords === 0) {
        return {
          totalRecords: 0,
          oldestRecord: undefined,
          newestRecord: undefined,
          conversationTypes: {},
          totalTags: 0,
          popularTags: [],
        };
      }

      // 统计对话类型
      const conversationTypes: Record<string, number> = {};
      const tagCounts = new Map<string, number>();

      for (const record of allRecords) {
        const type = record.conversationType || ConversationType.OTHER;
        conversationTypes[type] = (conversationTypes[type] || 0) + 1;

        const tags = record.tags || [];
        tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }

      // 计算热门标签
      const popularTags = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalRecords,
        oldestRecord: allRecords[allRecords.length - 1]?.timestamp,
        newestRecord: allRecords[0]?.timestamp,
        conversationTypes,
        totalTags: tagCounts.size,
        popularTags,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      throw error;
    }
  }
}

// 索引条目接口
interface IndexEntry {
  id: string;
  timestamp: string;
  title: string;
  tags: string[];
  conversationType: ConversationType;
}

// 存储统计信息接口
interface StorageStats {
  totalRecords: number;
  oldestRecord?: string;
  newestRecord?: string;
  conversationTypes: Record<string, number>;
  totalTags: number;
  popularTags: Array<{ tag: string; count: number }>;
}
