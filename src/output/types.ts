/**
 * CLI 输出模块类型定义
 */

/**
 * 输出样式选项
 */
export interface OutputStyleOptions {
  width?: number; // 终端宽度
  colorize?: boolean; // 是否使用颜色
  verbose?: boolean; // 详细模式
  compact?: boolean; // 紧凑模式
}

/**
 * 加载状态
 */
export enum LoadingState {
  ANALYZING = 'analyzing',
  QUERYING = 'querying',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
}

/**
 * 消息类型
 */
export enum MessageType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  PROMPT = 'prompt',
  DEBUG = 'debug',
}

/**
 * 表格单元格对齐方式
 */
export enum CellAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

/**
 * 推荐卡片配置
 */
export interface RecommendationCardConfig {
  showRanking?: boolean; // 显示排名
  showTags?: boolean; // 显示标签
  showReasonShort?: boolean; // 显示简短理由
  compact?: boolean; // 紧凑模式
  lineLength?: number; // 每行最大字符数
}

/**
 * 推荐列表配置
 */
export interface RecommendationListConfig {
  cardConfig?: RecommendationCardConfig;
  showSummary?: boolean; // 显示摘要
  showStats?: boolean; // 显示统计
  separateCards?: boolean; // 卡片之间分隔
  limit?: number; // 显示数量限制
}

/**
 * 交互提示配置
 */
export interface InteractivePromptConfig {
  showOptions?: boolean; // 显示选项列表
  showHotkeys?: boolean; // 显示快捷键
  compact?: boolean; // 紧凑显示
}

/**
 * 进度条配置
 */
export interface ProgressBarConfig {
  width?: number;
  showPercentage?: boolean;
  showETA?: boolean;
}

/**
 * 错误显示配置
 */
export interface ErrorDisplayConfig {
  showCode?: boolean;
  showStackTrace?: boolean;
  showSuggestion?: boolean;
}
