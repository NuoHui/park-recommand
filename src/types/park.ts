import { DifficultyLevel } from '@/config/constants';

/**
 * 高德 API POI 数据
 */
export interface AmapPoi {
  id: string;
  name: string;
  type: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  location?: string; // "lng,lat" format
  tel?: string;
  website?: string;
  pname?: string;
  cityname?: string;
  adname?: string;
  email?: string;
  postcode?: string;
  photo?: string;
}

/**
 * 公园详细信息
 */
export interface ParkInfo {
  id: string;
  name: string;
  type: 'park' | 'hiking';
  latitude: number;
  longitude: number;
  address: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  difficulty?: DifficultyLevel;
  elevation?: number; // 登山景点的海拔
  estimatedTime?: string; // 建议游玩时间
  features?: string[]; // 特色标签
  bestSeason?: string[];
  openingHours?: string;
  contact?: {
    phone?: string;
    website?: string;
    email?: string;
  };
  media?: {
    photos?: string[];
    videos?: string[];
  };
}

/**
 * 高德地理编码响应
 */
export interface AmapGeocodeResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  geocodes?: Array<{
    formatted_address: string;
    province: string;
    city: string;
    district: string;
    township: string;
    neighborhood: string;
    building: string;
    adcode: string;
    street: string;
    number: string;
    location: string;
    level: string;
  }>;
}

/**
 * 高德 POI 搜索响应
 */
export interface AmapPoiSearchResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  pois?: AmapPoi[];
  suggestion?: {
    keywords?: string[];
    cities?: string[];
    districts?: string[];
  };
}

/**
 * 高德距离矩阵响应
 */
export interface AmapDistanceResponse {
  status: string;
  info: string;
  infocode: string;
  results?: Array<{
    origin_id: number;
    dest_id: number;
    distance: number; // 米
    duration: number; // 秒
  }>;
}
