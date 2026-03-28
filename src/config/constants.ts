// 深圳市中心坐标
export const SHENZHEN_CENTER = {
  latitude: 22.5431,
  longitude: 114.0579,
};

// 景点类型
export enum ParkType {
  PARK = 'park',
  HIKING = 'hiking',
  BOTH = 'both',
}

// 难度等级
export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

// 对话阶段
export enum DialoguePhase {
  GREETING = 'greeting',
  COLLECTING_LOCATION = 'collecting_location',
  COLLECTING_TYPE = 'collecting_type',
  COLLECTING_DISTANCE = 'collecting_distance',
  COLLECTING_DIFFICULTY = 'collecting_difficulty',
  QUERYING = 'querying',
  RECOMMENDING = 'recommending',
  COMPLETED = 'completed',
}

// 颜色配置
export const COLORS = {
  primary: '#00B4D8',
  success: '#06A77D',
  warning: '#FFB703',
  error: '#E63946',
  info: '#0077B6',
  neutral: '#6C757D',
};

// CLI 输出符号
export const SYMBOLS = {
  info: '[i]',
  question: '[?]',
  warning: '[!]',
  success: '✓',
  error: '✗',
  arrow: '→',
  bullet: '◆',
  star: '★',
  emptyStar: '☆',
};

// 距离分级
export const DISTANCE_LEVELS = {
  NEARBY: { name: '3 km 以内', value: 3 },
  CLOSE: { name: '5 km 以内', value: 5 },
  MEDIUM: { name: '10 km 以内', value: 10 },
  FAR: { name: '无限制', value: Infinity },
};

// 默认推荐数量
export const DEFAULT_RECOMMENDATION_COUNT = 3;

// API 超时时间（毫秒）
export const API_TIMEOUT = 10000;

// 缓存过期时间（秒）
export const CACHE_EXPIRATION = {
  PARK_DATA: 7 * 24 * 60 * 60, // 7 天
  LLM_RESPONSE: 24 * 60 * 60, // 24 小时
};

// 高德地图 POI 分类
export const AMAP_POI_TYPES = {
  PARK: '120100',
  SCENIC_AREA: '120200',
  MOUNTAIN: '120201',
};
