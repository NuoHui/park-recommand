/**
 * 工具注册表
 * 管理所有可以在 Harness 中调用的工具
 */

import { createLogger } from '@/utils/logger';
import { ToolConstraints } from '@/types/harness';

const logger = createLogger('harness:tool-registry');

/**
 * 工具的元数据
 */
export interface ToolMetadata {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具分类 */
  category: 'llm' | 'map' | 'cache' | 'queue' | 'storage' | 'external';
  /** 工具是否安全（是否会修改数据） */
  isSafe: boolean;
  /** 工具的执行函数 */
  executor: (args: any) => Promise<any>;
  /** 工具的版本 */
  version: string;
}

/**
 * 工具注册表
 */
export class ToolRegistry {
  private tools: Map<string, ToolMetadata> = new Map();
  private constraints: ToolConstraints;

  constructor(constraints: ToolConstraints) {
    this.constraints = constraints;
    logger.debug('工具注册表初始化', {
      allowedTools: constraints.allowedTools,
      blockedTools: constraints.blockedTools,
    });
  }

  /**
   * 注册一个工具
   */
  register(metadata: ToolMetadata): void {
    if (this.tools.has(metadata.name)) {
      logger.warn(`工具已存在，覆盖旧版本: ${metadata.name}`);
    }

    this.tools.set(metadata.name, metadata);
    logger.debug(`工具已注册: ${metadata.name}`, {
      category: metadata.category,
      version: metadata.version,
    });
  }

  /**
   * 注册多个工具
   */
  registerBatch(metadataList: ToolMetadata[]): void {
    metadataList.forEach((metadata) => this.register(metadata));
  }

  /**
   * 获取工具元数据
   */
  getTool(toolName: string): ToolMetadata | undefined {
    return this.tools.get(toolName);
  }

  /**
   * 检查工具是否已注册
   */
  isRegistered(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * 检查工具是否被允许调用（通过约束检查）
   */
  isAllowed(toolName: string): boolean {
    const { allowedTools, blockedTools } = this.constraints;

    // 先检查黑名单
    if (blockedTools.includes(toolName)) {
      return false;
    }

    // 再检查白名单
    if (allowedTools.length > 0 && !allowedTools.includes(toolName)) {
      return false;
    }

    return true;
  }

  /**
   * 获取工具的执行器函数
   */
  getExecutor(toolName: string): ((args: any) => Promise<any>) | undefined {
    const tool = this.tools.get(toolName);
    return tool?.executor;
  }

  /**
   * 获取所有已注册的工具
   */
  getAllTools(): ToolMetadata[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有允许的工具
   */
  getAllowedTools(): ToolMetadata[] {
    return this.getAllTools().filter((tool) => this.isAllowed(tool.name));
  }

  /**
   * 获取特定分类的工具
   */
  getToolsByCategory(category: string): ToolMetadata[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }

  /**
   * 检查工具调用是否安全（是否为只读操作）
   */
  isSafe(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    return tool?.isSafe ?? true; // 默认假设为安全
  }

  /**
   * 获取工具的超时时间
   */
  getTimeout(toolName: string): number {
    return this.constraints.toolTimeouts[toolName] || 30000; // 默认 30 秒
  }

  /**
   * 验证工具可以被调用
   * @returns { valid: boolean, reason?: string }
   */
  validate(toolName: string): { valid: boolean; reason?: string } {
    // 检查工具是否已注册
    if (!this.isRegistered(toolName)) {
      return {
        valid: false,
        reason: `工具未注册: ${toolName}`,
      };
    }

    // 检查工具是否被允许
    if (!this.isAllowed(toolName)) {
      return {
        valid: false,
        reason: `工具不被允许: ${toolName}`,
      };
    }

    return { valid: true };
  }

  /**
   * 更新约束
   */
  updateConstraints(constraints: ToolConstraints): void {
    this.constraints = constraints;
    logger.debug('工具约束已更新', {
      allowedTools: constraints.allowedTools,
      blockedTools: constraints.blockedTools,
    });
  }

  /**
   * 获取工具的统计信息
   */
  getStats(): {
    totalTools: number;
    registeredTools: number;
    allowedTools: number;
    blockedTools: string[];
  } {
    return {
      totalTools: this.tools.size,
      registeredTools: this.tools.size,
      allowedTools: this.getAllowedTools().length,
      blockedTools: this.constraints.blockedTools,
    };
  }
}

/**
 * 全局工具注册表实例
 */
let globalRegistry: ToolRegistry | null = null;

/**
 * 获取全局工具注册表
 */
export function getToolRegistry(constraints?: ToolConstraints): ToolRegistry {
  if (!globalRegistry && constraints) {
    globalRegistry = new ToolRegistry(constraints);
  }
  return globalRegistry!;
}

/**
 * 初始化全局工具注册表
 */
export function initializeToolRegistry(constraints: ToolConstraints): ToolRegistry {
  globalRegistry = new ToolRegistry(constraints);
  return globalRegistry;
}

/**
 * 重置全局工具注册表（用于测试）
 */
export function resetToolRegistry(): void {
  globalRegistry = null;
}
