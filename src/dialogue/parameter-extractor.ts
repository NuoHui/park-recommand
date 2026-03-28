/**
 * 参数提取器
 * 从用户自然语言输入中提取高德 API 所需的参数（keywords、region 等）
 */

import { getLLMService } from '@/llm/service';
import { MapSearchParams } from '@/types/map';
import { createLogger } from '@/utils/logger';
import { createMapClient } from '@/map/client';
import { env } from '@/config/env';

const logger = createLogger('dialogue:parameter-extractor');

export interface ExtractedParams {
  keywords?: string;
  region?: string;
  // 📍 详细多层级地址字段（国家→楼栋号→房号）
  // 第1-5层：行政级别（用于精准定位）
  country?: string; // 国家，如"中国"（通常可以省略）
  province?: string; // 省/直辖市，如"广东"、"北京"
  city?: string; // 市，如"深圳"
  district?: string; // 区/县，如"宝安"
  street?: string; // 街道/道路，如"西乡街道"、"宝安大道"
  // 第6-8层：具体地点（用于POI级精准定位）
  community?: string; // 小区/建筑名，如"深圳湾1号"
  building?: string; // 楼栋号，如"A栋"、"1栋"
  houseNumber?: string; // 房号，如"101"、"3单元502"
  detailedAddress?: string; // 完整详细地址，用于高德地址编码
  // 高德API返回的坐标和编码
  latitude?: number; // 纬度（通过高德地址编码获取）
  longitude?: number; // 经度（通过高德地址编码获取）
  adcode?: string; // 行政编码（用于精准查询）
  types?: string[];
  extracted: boolean;
  confidence: number; // 0-1
  missingFields: string[]; // 缺失的必需字段
  rawResponse?: string;
}

/**
 * 参数提取器类
 */
export class ParameterExtractor {
  private static readonly REQUIRED_FIELDS = ['keywords', 'region'];
  private static readonly OPTIONAL_FIELDS = ['types', 'pageSize', 'pageNum'];

  /**
   * 从用户输入中提取参数
   */
  async extractParameters(userInput: string): Promise<ExtractedParams> {
    try {
      logger.info('开始参数提取', { userInput: userInput.substring(0, 100) });

      const llmService = getLLMService();
      if (!llmService.isInitialized()) {
        await llmService.initialize();
      }

      const client = llmService.getClient();

      const response = await client.call([
        { role: 'system', content: this.getSystemPrompt() },
        {
          role: 'user',
          content: `用户输入：${userInput}\n\n请精确提取位置的各个层级信息，包括行政级别（province/city/district/street）和具体地点（community/building/houseNumber），无论用户输入多详细都要逐层解析，返回 JSON。`,
        },
      ]);

      logger.debug('LLM 原始响应', { response: response.content?.substring(0, 200) });

      // 解析 LLM 响应
      const parsed = this.parseExtractedResponse(response.content || '');

      // ⭐ 如果成功提取地址，进行地址编码获取精准坐标
      if (parsed.extracted && (parsed.city || parsed.region)) {
        await this.geocodeDetailedAddress(parsed);
      }

      logger.info('参数提取完成', {
        keywords: parsed.keywords,
        country: parsed.country,
        province: parsed.province,
        city: parsed.city,
        district: parsed.district,
        street: parsed.street,
        community: parsed.community,
        building: parsed.building,
        houseNumber: parsed.houseNumber,
        confidence: parsed.confidence,
        hasCoordinates: !!parsed.latitude,
        missingFields: parsed.missingFields,
      });

      return parsed;
    } catch (error) {
      logger.error('参数提取失败:', error);
      return {
        extracted: false,
        confidence: 0,
        missingFields: ['keywords', 'region'],
        rawResponse: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(): string {
    return `你是一个公园推荐助手。从用户的一句话中精确提取以下信息：

1. keywords：用户要搜索的内容（如"公园"、"山"、"景区"、"爬山"等）- 必需
2. 用户位置的多层级详细地址信息（从行政级到具体地点，尽可能详细）：
   📍 行政级别（第1-5层）：
   - country：国家（如"中国"，通常省略）
   - province：省/直辖市（如"广东"、"北京"）
   - city：市（如"深圳"、"北京"）
   - district：区/县（如"宝安"、"朝阳"）
   - street：街道/道路（如"西乡街道"、"宝安大道"）
   
   🏘️ 具体地点（第6-8层）：
   - community：小区/建筑名（如"深圳湾1号"、"东方明珠"）
   - building：楼栋号（如"A栋"、"1栋"、"南栋"）
   - houseNumber：房号（如"101"、"3单元502"）
   
   - detailedAddress：完整详细地址（用于地址编码）

⭐⭐⭐ 关键提取规则 ⭐⭐⭐

【行政后缀识别（重要）】
中文行政地址中，级别信息由后缀指示，识别和去掉后缀是准确解析的关键。

常见行政后缀列表：
- 国家级："中国"
- 省级："省"（如"广东省"）
- 市级："市"（如"深圳市"、"北京市"）
- 区级："区"、"县"、"州"（如"宝安区"、"朝阳区"）
- 街道级："街道"、"镇"、"乡"、"路"、"大道"（如"西乡街道"、"中关村大街"）
- 社区级："社区"、"社"、"小区"、"楼"、"大厦"（如"深圳湾社区"、"国贸大厦"）

识别规则：
1. 从用户输入中找出所有包含这些后缀的词
2. 根据后缀确定该词的层级
3. 去掉后缀，保留纯地名（去掉"市、区、街道"等后缀）
4. 将结果按层级分配到对应的字段

【规则1】标准行政级别格式处理
用户说："深圳市宝安区西乡街道" 或 "广东深圳市宝安区西乡街道"
提取方式：去掉行政后缀（"市、区、街道、路、大道"等）
结果：
  {
    "province": "广东",
    "city": "深圳",
    "district": "宝安",
    "street": "西乡"
  }

【规则2】混合行政和具体地点
用户说："深圳宝安西乡深圳湾1号A栋101"
提取方式：前4层为行政（最细到街道），后3层为具体地点
结果：
  {
    "city": "深圳",
    "district": "宝安",
    "street": "西乡",
    "community": "深圳湾1号",
    "building": "A栋",
    "houseNumber": "101"
  }

【规则3】混合格式（有/无行政后缀、需要识别和分解）

用户可能输入"深圳宝安西乡街道"这样的混合格式。

处理步骤：
1️⃣ 识别行政后缀：市、区、县、街道、路、镇、乡、大道、社、社区
2️⃣ 根据后缀倒推该词的层级，然后去掉后缀保留纯地名
3️⃣ 对无后缀部分，根据地名的位置顺序推断层级（通常：城市>区>街道>社区）
4️⃣ 利用地名知识辅助识别（如"宝安"是深圳的区，"西乡"是宝安的街道）

具体例子：
✓ 用户说"深圳宝安西乡街道"
  - 识别后缀"街道" → "西乡街道"的"西乡"是 street
  - 剩余"深圳宝安" → 根据地名知识：深圳是城市，宝安是深圳的区
  - 结果: city:"深圳", district:"宝安", street:"西乡"

✓ 用户说"深圳宝安西乡"（无后缀）
  - 按位置顺序推断：3个词通常是 city>district>street
  - 结果: city:"深圳", district:"宝安", street:"西乡"

✓ 用户说"北京朝阳三里屯"
  - 无后缀，按位置顺序推断
  - 结果: city:"北京", district:"朝阳", street:"三里屯"

【规则4】包含小区/建筑信息
用户说："我在中关村大街国贸大厦"、"住在深圳湾1号"
提取方式：识别知名地标或小区名
结果：
  {
    "street": "中关村大街" 或 "中关村",
    "community": "国贸大厦" 或 "深圳湾1号"
  }

【规则5】嵌套的行政级别（有重复）
用户说："深圳市深圳市宝安区西乡街道" 或 "深圳深圳宝安"
提取方式：去重，只保留最后一个完整序列
结果：
  {
    "city": "深圳",
    "district": "宝安",
    "street": "西乡"
  }

【提取优先级和判断逻辑】
当用户输入中包含多个地名词汇时，按以下优先级判断层级：

1️⃣ 【最高优先级】识别行政后缀
   - 有"市"后缀的词 → city 层级
   - 有"区、县"后缀的词 → district 层级
   - 有"街道、镇、乡、路"后缀的词 → street 层级
   - 例子："深圳市宝安区西乡街道" → 直接根据后缀提取

2️⃣ 【次高优先级】无后缀但能识别的地名
   - "深圳、北京、上海" 等大城市 → city
   - 深圳的区："宝安、福田、南山、龙岗"等 → district
   - 街道名称 → street
   - 例子："深圳宝安西乡" → city:"深圳", district:"宝安", street:"西乡"

3️⃣ 【位置顺序推断】当无法识别具体地名时
   - 单词位置顺序通常是：city > district > street > community > building > houseNumber
   - 例子："A城市B地区C街道" → 按顺序分配

4️⃣ 【地名知识库】特定城市的深度知识
   - 深圳的主要区：南山、福田、宝安、龙岗、罗湖、光明、龙华、坪山、大鹏
   - 宝安的主要街道：西乡、沙井、松岗、福永、新安、石岩、燕罗
   - 福田的主要街道：中心、天安、沙头、园岭、黄贝

【重要】
- ⭐ 先看是否有行政后缀（最准确）
- ⭐ 再利用已知的地名关系识别（如"宝安"是深圳的区）
- ⭐ 无法确定时，根据位置顺序和常见格式推断

【重要提示】
- ⭐ 不要猜测用户未提及的层级
- ⭐ 用户可能输入完整详细的地址（如"深圳市宝安区西乡街道深圳湾1号A栋101"），请完整解析所有层级！
- ⭐ 行政级别（province/city/district/street）越详细，地址编码结果越精准
- ⭐ 具体地点（community/building/houseNumber）有助于极近范围的推荐准确度
- ⭐ detailedAddress 应该包含用户提及的所有层级，用于高德地址编码

【特殊情况处理】关键测试用例
情况1："深圳宝安西乡街道"
  分析：
  - "街道" 是行政后缀 → "西乡" 是 street 名称
  - 剩余 "深圳宝安" → 根据地名知识，深圳是city，宝安是deep圳的district
  - 必须提取：city:"深圳", district:"宝安", street:"西乡"
  
情况2："深圳宝安西乡"  
  分析：
  - 无后缀，但都是已知地名
  - "深圳" 是城市 → city
  - "宝安" 是深圳的区 → district
  - "西乡" 是宝安的街道 → street
  - 必须提取：city:"深圳", district:"宝安", street:"西乡"

情况3："北京朝阳三里屯"
  分析：
  - 无后缀，按位置顺序推断
  - 3个词通常是 city > district > street 格式
  - "北京" 是城市 → city
  - "朝阳" 是北京的区 → district
  - "三里屯" 是朝阳的街道/社区 → street
  - 必须提取：city:"北京", district:"朝阳", street:"三里屯"

用户可能会用以下方式表达位置和搜索内容：
- "我住在XX地方，帮我推荐XX" - 位置在"住在"之后，搜索内容通常是名词
- "在XX附近有什么XX吗" - 位置是"附近"之前，搜索内容在"有什么"之后
- "推荐我XX附近的XX" - 位置是前者，搜索内容是后者
- "XX这边有没有XX" - 位置在前，搜索内容在后
- "我在XX小区，推荐XX" - 精准到小区级别

请返回 JSON 格式的结果（务必是有效的 JSON）：
{
  "keywords": "提取的搜索关键词，null 表示无法识别",
  "country": "国家，通常为 null",
  "province": "省/直辖市，null 表示无法识别",
  "city": "市，必需字段，null 表示无法提取",
  "district": "区/县，null 表示无法识别",
  "street": "街道/道路，null 表示无法识别",
  "community": "小区/建筑名，null 表示无法识别",
  "building": "楼栋号，null 表示无法识别",
  "houseNumber": "房号，null 表示无法识别",
  "detailedAddress": "完整详细地址，用于地址编码",
  "region": "城市名称（用于高德 API 兼容性）",
  "confidence": 0.95,
  "reasoning": "简要说明提取过程和置信度原因"
}`;
  }

  /**
   * 带上下文的参数提取（用于循环追问）
   * 在每次用户回答后重新提取参数，保留已提取的参数作为上下文
   */
  async extractParametersWithContext(
    userInput: string,
    previousParams: Partial<ExtractedParams>,
    askedFields: string[]
  ): Promise<ExtractedParams> {
    try {
      logger.info('开始带上下文的参数提取', {
        userInput: userInput.substring(0, 100),
        previousParams: {
          keywords: previousParams.keywords,
          city: previousParams.city,
          district: previousParams.district,
        },
        askedFields,
      });

      const llmService = getLLMService();
      if (!llmService.isInitialized()) {
        await llmService.initialize();
      }

      const client = llmService.getClient();

      // 构建已有的参数上下文（多层级地址）
      const contextInfo = [];
      if (previousParams.keywords) {
        contextInfo.push(`- 搜索内容 (keywords): "${previousParams.keywords}"`);
      }
      if (previousParams.city || previousParams.region) {
        const location = [];
        // 行政级别
        if (previousParams.province) location.push(previousParams.province);
        if (previousParams.city) location.push(previousParams.city);
        if (previousParams.district) location.push(previousParams.district);
        if (previousParams.street) location.push(previousParams.street);
        // 具体地点
        if (previousParams.community) location.push(previousParams.community);
        if (previousParams.building) location.push(previousParams.building);
        if (previousParams.houseNumber) location.push(previousParams.houseNumber);
        contextInfo.push(`- 位置 (location): "${location.join('')}"`);
      }

      // 构建缺失的参数说明
      // ⭐ 区分"必需字段"和"可选但应该尝试提取的字段"
      const missingRequiredFields = [];
      if (!previousParams.keywords) {
        missingRequiredFields.push('keywords（搜索内容）');
      }
      if (!previousParams.city && !previousParams.region) {
        missingRequiredFields.push('city（城市）');
      }

      // 即使不主动追问，也应该尝试从用户输入中提取的字段
      const optionalButDesiredFields = [];
      if (!previousParams.district && (previousParams.city || previousParams.region)) {
        optionalButDesiredFields.push('district（区/县）');
      }
      if (!previousParams.street && (previousParams.city || previousParams.region)) {
        optionalButDesiredFields.push('street（街道）');
      }
      if (!previousParams.community) {
        optionalButDesiredFields.push('community（小区/建筑）');
      }

      const systemPrompt = `你是一个公园推荐助手。用户正在补充信息以完成推荐查询。

当前已有的信息：
${contextInfo.length > 0 ? contextInfo.join('\n') : '（暂无已提取的信息）'}

用户需要补充的必需信息：
${missingRequiredFields.length > 0 ? missingRequiredFields.join('、') : '所有必需信息都已获取'}

用户可能提供的补充信息（即使不追问，也应该从输入中提取）：
${optionalButDesiredFields.length > 0 ? optionalButDesiredFields.join('、') : ''}

根据用户的补充回答，更新相应的参数。⭐⭐⭐ 重要 ⭐⭐⭐：

【完整地址一次性解析】
虽然系统只追问到 city 级别，但用户可能输入非常详细的地址！
你需要**完整解析用户提供的所有地址信息**，从行政级别到具体地点：

【多层级地址提取规则】（按优先级）
1️⃣ 【标准行政级别格式】
   - 用户说："宝安区西乡街道深圳湾1号A栋101"
   - 提取：district:"宝安", street:"西乡", community:"深圳湾1号", building:"A栋", houseNumber:"101"
   - 处理：自动去掉"区、街道"等行政后缀

2️⃣ 【简略地址表达】
   - 用户说："宝安西乡"
   - 提取：district:"宝安", street:"西乡"

3️⃣ 【小区/建筑信息】
   - 用户说："我在深圳湾1号" 或 "国贸大厦"
   - 提取：community:"深圳湾1号" 或 community:"国贸大厦"

4️⃣ 【楼栋和房号】
   - 用户说："A栋101" 或 "3单元502"
   - 提取：building:"A栋", houseNumber:"101" 或 building:"3单元", houseNumber:"502"

【关键原则】
- ⭐ 主动追问：只到 city 级别
- ⭐ 被动提取：用户提供的所有信息都要完整解析（即使不追问也要提取）
- ⭐ 不要猜测用户未提及的信息，仅解析用户明确表达的部分
- ⭐ 不同层级可以独立提取（如用户只说"西乡街道"，可以只提 street）
- ⭐ 具体地点信息（小区/楼栋/房号）优先于模糊的行政级别

【特殊场景：用户补充详细地址（最常见的困惑）】
⚠️ 示例 - 这是最重要的场景，请特别注意：
  
  已有：keywords:"公园", city:"深圳"
  系统追问："请问您的城市是？" - 等等，这里 city 已经有了，不会追问这个
  用户补充："宝安西乡街道"
  
分析步骤：
  1️⃣ 用户说了"宝安西乡街道" → 三个地名词 + 一个行政后缀
  2️⃣ 识别后缀"街道" → 决定了"西乡"是街道级名称
  3️⃣ 去掉后缀，保留"西乡" → street:"西乡"
  4️⃣ 剩余"宝安" → 是深圳的区名 → district:"宝安"
  5️⃣ "深圳"已知不变 → city:"深圳"
  
正确返回：
  {
    "city": "深圳",
    "district": "宝安",
    "street": "西乡",
    "keywords": "公园",
    ...
  }

❌ 常见错误（请避免）：
  1. 只返回已知的城市："深圳"，忽视用户提供的 district/street
  2. 因为"系统只追问到 city 级别"就认为不需要提取 district/street
  3. 返回 district:null/street:null，而不是提取用户提供的值
  
✅ 要点：
  - 系统的追问方式 ≠ 提取的完整性
  - 即使系统不追问 district/street，用户提供了也必须提取
  - 如果用户未提及某字段，才设置为 null

请返回 JSON 格式的结果（务必是有效的 JSON）：
{
  "keywords": "更新后的搜索关键词，null 表示未提及",
  "country": "更新后的国家，null 表示未提及",
  "province": "更新后的省/直辖市，null 表示未提及",
  "city": "更新后的市，null 表示未提及",
  "district": "更新后的区/县，null 表示未提及",
  "street": "更新后的街道/道路，null 表示未提及",
  "community": "更新后的小区/建筑名，null 表示未提及",
  "building": "更新后的楼栋号，null 表示未提及",
  "houseNumber": "更新后的房号，null 表示未提及",
  "detailedAddress": "更新后的完整地址，null 表示未提及",
  "confidence": 0.85,
  "reasoning": "简要说明本次提取的内容"
}

重要提示：
- 如果用户的回答不包含某个字段的信息，请将其设置为 null，不要猜测
- keywords 应该提取用户明确表达的搜索内容
- 地址字段应该逐层级提取，不要混淆不同层级
- 就算系统只追问了 city，用户可能会一次性输入完整详细地址，请完整解析所有层级`;

      const userMessage = `用户的补充回答：${userInput}

请精确提取用户本次提供的所有信息，完整解析所有地址层级（如果用户提供了的话），返回 JSON。`;

      const response = await client.call([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      logger.debug('LLM 原始响应（带上下文）', { response: response.content?.substring(0, 200) });

      // 解析 LLM 响应
      const parsed = this.parseExtractedResponse(response.content || '');

      // 将新提取的参数与之前的参数合并（支持多层级地址）
      const merged: ExtractedParams = {
        keywords: parsed.keywords ?? previousParams.keywords,
        country: parsed.country ?? previousParams.country,
        province: parsed.province ?? previousParams.province,
        city: parsed.city ?? previousParams.city,
        district: parsed.district ?? previousParams.district,
        street: parsed.street ?? previousParams.street,
        community: parsed.community ?? previousParams.community,
        building: parsed.building ?? previousParams.building,
        houseNumber: parsed.houseNumber ?? previousParams.houseNumber,
        detailedAddress: parsed.detailedAddress ?? previousParams.detailedAddress,
        region: parsed.region ?? previousParams.region ?? parsed.city ?? previousParams.city,
        types: parsed.types ?? previousParams.types,
        latitude: previousParams.latitude,
        longitude: previousParams.longitude,
        adcode: previousParams.adcode,
        confidence: Math.max(parsed.confidence, previousParams.confidence ?? 0),
        extracted: !!(parsed.keywords ?? previousParams.keywords) && !!(parsed.city ?? previousParams.city ?? parsed.region ?? previousParams.region),
        missingFields: [],
        rawResponse: parsed.rawResponse,
      };

      // ⭐ 如果本次补充了新的地址信息，重新进行地址编码以获取更精准的坐标
      if (
        (parsed.country || parsed.province || parsed.city || parsed.district || parsed.street || parsed.community || parsed.building || parsed.houseNumber) &&
        (merged.city || merged.region)
      ) {
        await this.geocodeDetailedAddress(merged);
      }

      // 检查缺失字段
      if (!merged.keywords) {
        merged.missingFields.push('keywords');
      }
      if (!merged.city && !merged.region) {
        merged.missingFields.push('region');
      }

      logger.info('带上下文的参数提取完成', {
        keywords: merged.keywords,
        country: merged.country,
        province: merged.province,
        city: merged.city,
        district: merged.district,
        street: merged.street,
        community: merged.community,
        building: merged.building,
        houseNumber: merged.houseNumber,
        hasNewCoordinates: !!(parsed.province || parsed.city || parsed.district || parsed.street || parsed.community || parsed.building),
        confidence: merged.confidence,
        missingFields: merged.missingFields,
      });

      return merged;
    } catch (error) {
      logger.error('带上下文的参数提取失败:', error);
      return {
        ...previousParams,
        extracted: false,
        confidence: 0,
        missingFields: [
          ...(previousParams.keywords ? [] : ['keywords']),
          ...(previousParams.city || previousParams.region ? [] : ['region']),
        ],
        rawResponse: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 解析 LLM 响应
   */
  private parseExtractedResponse(content: string): ExtractedParams {
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('无法找到 JSON 响应', { content: content.substring(0, 100) });
        return {
          extracted: false,
          confidence: 0,
          missingFields: ['keywords', 'region'],
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const result: ExtractedParams = {
        keywords: parsed.keywords || undefined,
        country: parsed.country || undefined,
        province: parsed.province || undefined,
        city: parsed.city || parsed.region || undefined,
        district: parsed.district || undefined,
        street: parsed.street || undefined,
        community: parsed.community || undefined,
        building: parsed.building || undefined,
        houseNumber: parsed.houseNumber || undefined,
        detailedAddress: parsed.detailedAddress || undefined,
        region: parsed.region || parsed.city || undefined, // 兼容性：保留 region 为城市级别
        types: parsed.types,
        confidence: parsed.confidence || 0.8,
        extracted: !!(parsed.keywords && (parsed.city || parsed.region)),
        missingFields: [],
        rawResponse: content,
      };

      // 检查缺失字段
      if (!result.keywords) {
        result.missingFields.push('keywords');
      }
      if (!result.region && !result.city) {
        result.missingFields.push('region');
      }

      return result;
    } catch (error) {
      logger.error('JSON 解析失败:', error, { content: content.substring(0, 100) });
      return {
        extracted: false,
        confidence: 0,
        missingFields: ['keywords', 'region'],
        rawResponse: content,
      };
    }
  }

  /**
   * 使用高德地址编码 API 获取精准坐标
   * 将详细地址转换为经纬度和行政编码
   */
  async geocodeDetailedAddress(params: ExtractedParams): Promise<void> {
    try {
      // 构建完整的地址字符串用于地址编码
      // 优先级：detailedAddress > 组合构建
      let fullAddress: string;

      if (params.detailedAddress) {
        fullAddress = params.detailedAddress;
      } else {
        // 从各层级组合构建完整地址
        const addressParts = [];
        if (params.country) addressParts.push(params.country);
        if (params.province) addressParts.push(params.province);
        if (params.city) addressParts.push(params.city);
        if (params.district) addressParts.push(params.district);
        if (params.street) addressParts.push(params.street);
        // 具体地点层级也添加到地址编码，以获得更精准的坐标
        if (params.community) addressParts.push(params.community);
        if (params.building) addressParts.push(params.building);
        if (params.houseNumber) addressParts.push(params.houseNumber);

        fullAddress = addressParts.join('');
      }

      if (!fullAddress) {
        logger.warn('无法构建地址用于编码', { params });
        return;
      }

      logger.info('开始地址编码', { fullAddress });

      if (!env.amapApiKey) {
        logger.warn('高德 API 密钥未配置，跳过地址编码');
        return;
      }

      const client = createMapClient(env.amapApiKey, env.amapBaseUrl);

      // 调用高德地址编码 API
      const response = await client.geocode({
        address: fullAddress,
        city: params.city,
      });

      if (response.status === '1' && response.geocodes && response.geocodes.length > 0) {
        const firstResult = response.geocodes[0];

        // 解析坐标（高德返回格式为 "经度,纬度"）
        const [longitude, latitude] = firstResult.location.split(',').map(Number);

        // 更新参数
        // ⭐ 重要：只在 LLM 未提取到对应信息时，才用高德的结果进行补充
        // 不要用高德的结果覆盖 LLM 已提取的详细地址信息
        params.latitude = latitude;
        params.longitude = longitude;
        params.adcode = firstResult.adcode;
        
        // 仅当 LLM 未提取时，才使用高德返回的行政区划信息进行补充
        if (!params.province) {
          params.province = firstResult.province;
        }
        if (!params.city) {
          params.city = firstResult.city;
        }
        if (!params.district) {
          params.district = firstResult.district;
        }

        logger.info('地址编码成功', {
          fullAddress,
          latitude,
          longitude,
          adcode: params.adcode,
          llmProvince: params.province,
          aMapProvince: firstResult.province,
          llmDistrict: params.district,
          aMapDistrict: firstResult.district,
        });
      } else {
        logger.warn('地址编码返回无结果', { fullAddress, response });
      }
    } catch (error) {
      logger.warn('地址编码失败（非致命错误）', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      // 地址编码失败不中断流程，继续使用已有的地址信息
    }
  }

  /**
   * 将提取的参数转换为 MapSearchParams
   */
  toMapSearchParams(
    params: ExtractedParams,
    pageSize?: number,
    pageNum?: number
  ): MapSearchParams | null {
    if (!params.keywords) {
      return null;
    }

    // ⭐ 智能构建 region 参数：根据解析的详细地址层级
    // 高德 API 的 region 参数可以是：城市名、行政区名、或更细粒度的地址信息
    // 优先级顺序：street > district > city > province > region（保留字段）
    const region =
      params.street || // 街道级最精准
      params.district || // 区级
      params.city || // 市级
      params.province || // 省级
      params.region; // 备用字段

    if (!region) {
      return null;
    }

    return {
      keywords: params.keywords,
      region,
      types: params.types,
      pageSize: pageSize || 10,
      pageNum: pageNum || 1,
    };
  }
}

/**
 * 获取全局参数提取器实例
 */
let extractorInstance: ParameterExtractor | null = null;

export function getParameterExtractor(): ParameterExtractor {
  if (!extractorInstance) {
    extractorInstance = new ParameterExtractor();
  }
  return extractorInstance;
}
