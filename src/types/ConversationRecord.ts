// 自然的"小作文"式会话记录数据结构

export interface ConversationRecord {
  // 基本信息
  id: string;
  timestamp: string;

  // 原始内容
  content: string;

  // 简单的"小作文"字段
  summary?: string; // "今天聊了什么"
  thoughts?: string; // "我觉得..."
  factual_notes?: string; // "发生了什么事"

  // 基本元数据
  title?: string;
  participants?: string[];
  conversationType?: ConversationType;
  tags?: string[];

  // 简单统计
  wordCount?: number;
  duration?: number;
}

export enum ConversationType {
  TECHNICAL_DISCUSSION = "technical_discussion",
  PROBLEM_SOLVING = "problem_solving",
  CREATIVE_BRAINSTORMING = "creative_brainstorming",
  EDUCATIONAL = "educational",
  CASUAL_CHAT = "casual_chat",
  PLANNING = "planning",
  REVIEW_FEEDBACK = "review_feedback",
  OTHER = "other",
}

// 简化的输入结构
export interface ConversationRecordInput {
  // 必需：会话内容
  content: string;

  // 可选：简单元数据
  title?: string;
  participants?: string[];
  duration?: number;
  conversationType?: ConversationType;
  tags?: string[];

  // 可选：小作文字段
  summary?: string;
  thoughts?: string;
  factual_notes?: string;
}

// 存储接口
export interface ConversationStorage {
  save(record: ConversationRecord): Promise<void>;
  getById(id: string): Promise<ConversationRecord | null>;
  getAll(): Promise<ConversationRecord[]>;
  getByTags(tags: string[]): Promise<ConversationRecord[]>;
  getByTimeRange(start: string, end: string): Promise<ConversationRecord[]>;
  getByType(type: ConversationType): Promise<ConversationRecord[]>;
  search(query: string): Promise<ConversationRecord[]>;

  // 简化的统计信息
  getStats(): Promise<{
    totalRecords: number;
    oldestRecord?: string;
    newestRecord?: string;
    conversationTypes: Record<string, number>;
    totalTags: number;
    popularTags: Array<{ tag: string; count: number }>;
  }>;
}
