import * as fs from 'fs';
import * as path from 'path';
import { AISettings, AIUsage } from '../types/ai';

/**
 * 简单的文件存储服务
 * 用于持久化 AI 配置和使用记录
 */
class StorageService {
  private dataDir: string;
  private settingsFile: string;
  private usageFile: string;

  constructor() {
    // 使用 /tmp 目录存储数据，重启后保留
    this.dataDir = '/tmp/wordapp-data';
    this.settingsFile = path.join(this.dataDir, 'ai-settings.json');
    this.usageFile = path.join(this.dataDir, 'ai-usage.json');

    // 确保数据目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // ==================== AI Settings ====================

  /**
   * 保存 AI 配置
   */
  saveAISettings(settings: AISettings): void {
    try {
      const data = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.settingsFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Save AI settings error:', error);
      throw error;
    }
  }

  /**
   * 获取 AI 配置
   */
  getAISettings(): AISettings | null {
    try {
      if (!fs.existsSync(this.settingsFile)) {
        return null;
      }
      const data = fs.readFileSync(this.settingsFile, 'utf-8');
      return JSON.parse(data) as AISettings;
    } catch (error) {
      console.error('Get AI settings error:', error);
      return null;
    }
  }

  /**
   * 删除 AI 配置
   */
  deleteAISettings(): void {
    try {
      if (fs.existsSync(this.settingsFile)) {
        fs.unlinkSync(this.settingsFile);
      }
    } catch (error) {
      console.error('Delete AI settings error:', error);
      throw error;
    }
  }

  // ==================== AI Usage ====================

  /**
   * 记录 AI 使用情况
   */
  recordAIUsage(usage: Omit<AIUsage, 'id' | 'createdAt'>): void {
    try {
      let usages: AIUsage[] = [];
      
      if (fs.existsSync(this.usageFile)) {
        const data = fs.readFileSync(this.usageFile, 'utf-8');
        usages = JSON.parse(data) as AIUsage[];
      }

      const newUsage: AIUsage = {
        ...usage,
        id: usages.length + 1,
        createdAt: new Date().toISOString(),
      };

      usages.push(newUsage);

      // 只保留最近 1000 条记录
      if (usages.length > 1000) {
        usages = usages.slice(-1000);
      }

      fs.writeFileSync(this.usageFile, JSON.stringify(usages, null, 2), 'utf-8');
    } catch (error) {
      console.error('Record AI usage error:', error);
      // 不抛出错误，使用记录失败不影响主流程
    }
  }

  /**
   * 获取 AI 使用统计
   */
  getAIUsageStats(days: number = 30): {
    totalTokens: number;
    totalCost: number;
    featureBreakdown: Record<string, { tokens: number; count: number }>;
  } {
    try {
      if (!fs.existsSync(this.usageFile)) {
        return { totalTokens: 0, totalCost: 0, featureBreakdown: {} };
      }

      const data = fs.readFileSync(this.usageFile, 'utf-8');
      const usages = JSON.parse(data) as AIUsage[];

      // 过滤最近 N 天的记录
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentUsages = usages.filter(u => 
        new Date(u.createdAt!) >= cutoffDate
      );

      // 计算统计数据
      let totalTokens = 0;
      let totalCost = 0;
      const featureBreakdown: Record<string, { tokens: number; count: number }> = {};

      for (const usage of recentUsages) {
        totalTokens += usage.tokensUsed;
        totalCost += usage.cost || 0;

        if (!featureBreakdown[usage.feature]) {
          featureBreakdown[usage.feature] = { tokens: 0, count: 0 };
        }
        featureBreakdown[usage.feature].tokens += usage.tokensUsed;
        featureBreakdown[usage.feature].count += 1;
      }

      return { totalTokens, totalCost, featureBreakdown };
    } catch (error) {
      console.error('Get AI usage stats error:', error);
      return { totalTokens: 0, totalCost: 0, featureBreakdown: {} };
    }
  }

  /**
   * 获取最近的使用记录
   */
  getRecentUsage(limit: number = 10): AIUsage[] {
    try {
      if (!fs.existsSync(this.usageFile)) {
        return [];
      }

      const data = fs.readFileSync(this.usageFile, 'utf-8');
      const usages = JSON.parse(data) as AIUsage[];

      return usages.slice(-limit);
    } catch (error) {
      console.error('Get recent usage error:', error);
      return [];
    }
  }
}

// 导出单例
export const storageService = new StorageService();
