/**
 * 高德地图 API 类型定义
 */

/**
 * 地点详细信息
 */
export interface MapPOI {
  id: string;
  name: string;
  type: string; // 地点类型
  location: string | {
    latitude: number;
    longitude: number;
  }; // 高德 API 返回格式: "经度,纬度" (字符串)
  address: string;
  district: string; // 行政区划
  cityCode: string;
  adCode: string;
  businessArea?: string; // 商圈
  phone?: string;
  website?: string;
  email?: string;
  photos?: string[];
  shopInfo?: {
    rating?: number;
    reviewCount?: number;
    openingHours?: string;
  };
  pcode?: string;
  adname?: string;
  provinceCode?: string;
}

/**
 * 地点搜索参数
 */
export interface MapSearchParams {
  keywords: string;
  region: string; // 城市编码或名称，如 '深圳'
  pageSize?: number; // 默认 10，最大 25
  pageNum?: number; // 默认 1
  types?: string[]; // 地点类型，如 ['公园', '景区']
  city?: string;
  offset?: number;
  limit?: number;
}

/**
 * 地点搜索响应
 */
export interface MapSearchResponse {
  status: string; // '1' 成功，'0' 失败
  count: number; // 返回的 POI 数量
  infocode: string;
  info: string;
  suggestions?: {
    keywords: Array<{
      name: string;
      districts: Array<{
        name: string;
        districtCode?: string;
      }>;
    }>;
  };
  pois: MapPOI[];
}

/**
 * 距离计算请求
 */
export interface MapDistanceParams {
  origins: Array<{
    latitude: number;
    longitude: number;
  }>;
  destination: {
    latitude: number;
    longitude: number;
  };
  type?: 'driving' | 'walking' | 'bicycling'; // 默认 driving
}

/**
 * 距离计算响应
 */
export interface MapDistanceResult {
  distance: number; // 米
  duration?: number; // 秒
  mode: string;
}

/**
 * 地址编码请求
 */
export interface MapGeocodeParams {
  address: string;
  city?: string;
}

/**
 * 地址编码响应
 */
export interface MapGeocodeResponse {
  status: string;
  geocodes?: Array<{
    formatted_address: string;
    province: string;
    city: string;
    district: string;
    township: string;
    neighborhood: {
      name: string;
      type: string;
    };
    building: {
      name: string;
      type: string;
    };
    adcode: string;
    street: string;
    number: string;
    location: string; // "longitude,latitude"
    precise: boolean;
    comprehension: number;
    roadworthiness: boolean;
  }>;
  info: string;
  infocode: string;
}

/**
 * 反向地址编码请求
 */
export interface MapReverseGeocodeParams {
  location: {
    latitude: number;
    longitude: number;
  };
  poiType?: string;
}

/**
 * 反向地址编码响应
 */
export interface MapReverseGeocodeResponse {
  status: string;
  regeocode?: {
    formatted_address: string;
    addressComponent: {
      city: string;
      province: string;
      adcode: string;
      district: string;
      towncode: string;
      township: string;
      neighborhood?: {
        name: string;
        type: string;
      };
      building?: {
        name: string;
        type: string;
      };
      streetNumber?: {
        street: string;
        number: string;
      };
      country?: string;
    };
    pois?: MapPOI[];
    roads?: Array<{
      name: string;
      distance: number;
      direction: string;
      distance_desc: string;
    }>;
    aois?: Array<{
      name: string;
      distance: number;
      direction: string;
      adcode: string;
      type: string;
    }>;
  };
  info: string;
  infocode: string;
}

/**
 * 地图 API 客户端配置
 */
export interface MapClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number; // 毫秒，默认 10000
  retryCount?: number; // 重试次数，默认 3
  retryDelay?: number; // 重试延迟，毫秒，默认 1000
}

/**
 * 地图 API 客户端接口
 */
export interface IMapClient {
  /**
   * POI 文本搜索
   */
  searchPOI(params: MapSearchParams): Promise<MapSearchResponse>;

  /**
   * 计算距离（驾车、步行）
   */
  calculateDistance(params: MapDistanceParams): Promise<MapDistanceResult[]>;

  /**
   * 地址编码（地址转坐标）
   */
  geocode(params: MapGeocodeParams): Promise<MapGeocodeResponse>;

  /**
   * 反向地址编码（坐标转地址）
   */
  reverseGeocode(params: MapReverseGeocodeParams): Promise<MapReverseGeocodeResponse>;

  /**
   * 验证 API 连接
   */
  verifyConnection(): Promise<boolean>;
}

/**
 * 深圳预定义地点类型
 */
export const SHENZHEN_POI_TYPES = {
  PARK: '公园',
  SCENIC_AREA: '景区',
  MOUNTAIN: '山峰',
  NATURE_RESERVE: '自然保护区',
  HIKING_TRAIL: '登山道',
  BOTANICAL_GARDEN: '植物园',
  ZOO: '动物园',
} as const;

/**
 * 深圳常见区域编码
 */
export const SHENZHEN_DISTRICTS = {
  LUOHU: '440303', // 罗湖区
  FUTIAN: '440304', // 福田区
  NANSHAN: '440305', // 南山区
  BAOAN: '440306', // 宝安区
  LONGGANG: '440307', // 龙岗区
  PINGSHAN: '440314', // 坪山区
  DAPENG: '440308', // 大鹏新区
  GUANGMING: '440309', // 光明区
  LONGHUA: '440310', // 龙华区
  YANTIAN: '440311', // 盐田区
} as const;

/**
 * 距离范围常数
 */
export const DISTANCE_CONSTANTS = {
  MIN_DISTANCE_KM: 0.1, // 100 米
  MAX_DISTANCE_KM: 50, // 50 公里
  DEFAULT_SEARCH_RADIUS_KM: 10, // 默认搜索半径
} as const;

/**
 * 高德 API 错误代码
 */
export const AMAP_ERROR_CODES = {
  SUCCESS: '1',
  INVALID_PARAMS: '10000',
  MISSING_PARAMS: '10001',
  SERVICE_UNAVAILABLE: '10002',
  INVALID_APIKEY: '10003',
  IP_DENIED: '10004',
  SERVICE_DISABLED: '10005',
  REQUEST_LIMIT: '10006',
  SERVER_ERROR: '10007',
  NO_RESULTS: '10008',
  INVALID_CITY: '10009',
  COORDINATE_INVALID: '10010',
  ADDRESS_INVALID: '10011',
} as const;
