import { createLogger } from '@/utils/logger';
import { DialoguePhase, DifficultyLevel, ParkType, DISTANCE_LEVELS } from '@/config/constants';
import { UserPreference } from '@/types/common';
import { ContextManager } from './context';

const logger = createLogger('dialogue:flow-engine');

/**
 * 对话流程引擎
 * 管理对话的流程逻辑和状态转移
 */
export class DialogueFlowEngine {
  private contextManager: ContextManager;
  private currentPhase: DialoguePhase;
  private visitedPhases: Set<DialoguePhase>;
  private preferenceCompleteness: number = 0;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
    this.currentPhase = DialoguePhase.GREETING;
    this.visitedPhases = new Set([DialoguePhase.GREETING]);

    logger.info('对话流程引擎创建', {
      sessionId: contextManager.getSessionId(),
    });
  }

  /**
   * 获取当前阶段
   */
  getCurrentPhase(): DialoguePhase {
    return this.currentPhase;
  }

  /**
   * 进入下一个阶段
   */
  nextPhase(): DialoguePhase | null {
    const nextPhaseMap: Record<DialoguePhase, DialoguePhase | null> = {
      [DialoguePhase.GREETING]: DialoguePhase.COLLECTING_LOCATION,
      [DialoguePhase.COLLECTING_LOCATION]: DialoguePhase.COLLECTING_TYPE,
      [DialoguePhase.COLLECTING_TYPE]: DialoguePhase.COLLECTING_DISTANCE,
      [DialoguePhase.COLLECTING_DISTANCE]: DialoguePhase.COLLECTING_DIFFICULTY,
      [DialoguePhase.COLLECTING_DIFFICULTY]: DialoguePhase.QUERYING,
      [DialoguePhase.QUERYING]: DialoguePhase.RECOMMENDING,
      [DialoguePhase.RECOMMENDING]: DialoguePhase.COMPLETED,
      [DialoguePhase.COMPLETED]: null,
    };

    const next = nextPhaseMap[this.currentPhase];
    if (next) {
      this.currentPhase = next;
      this.visitedPhases.add(next);
      this.updatePreferenceCompleteness();

      logger.debug('进入新阶段', {
        sessionId: this.contextManager.getSessionId(),
        phase: next,
        completeness: this.preferenceCompleteness,
      });
    }

    return next;
  }

  /**
   * 回退到上一个阶段
   */
  previousPhase(): DialoguePhase | null {
    const previousPhaseMap: Record<DialoguePhase, DialoguePhase | null> = {
      [DialoguePhase.GREETING]: null,
      [DialoguePhase.COLLECTING_LOCATION]: DialoguePhase.GREETING,
      [DialoguePhase.COLLECTING_TYPE]: DialoguePhase.COLLECTING_LOCATION,
      [DialoguePhase.COLLECTING_DISTANCE]: DialoguePhase.COLLECTING_TYPE,
      [DialoguePhase.COLLECTING_DIFFICULTY]: DialoguePhase.COLLECTING_DISTANCE,
      [DialoguePhase.QUERYING]: DialoguePhase.COLLECTING_DIFFICULTY,
      [DialoguePhase.RECOMMENDING]: DialoguePhase.QUERYING,
      [DialoguePhase.COMPLETED]: DialoguePhase.RECOMMENDING,
    };

    const prev = previousPhaseMap[this.currentPhase];
    if (prev) {
      this.currentPhase = prev;
      this.updatePreferenceCompleteness();

      logger.debug('返回到上一阶段', {
        sessionId: this.contextManager.getSessionId(),
        phase: prev,
      });
    }

    return prev;
  }

  /**
   * 跳过当前阶段
   */
  skipPhase(): boolean {
    if (this.canSkipCurrentPhase()) {
      this.nextPhase();
      logger.debug('跳过当前阶段', {
        sessionId: this.contextManager.getSessionId(),
        phase: this.currentPhase,
      });
      return true;
    }
    return false;
  }

  /**
   * 检查是否可以跳过当前阶段
   */
  canSkipCurrentPhase(): boolean {
    // 难度等级是可选的
    if (this.currentPhase === DialoguePhase.COLLECTING_DIFFICULTY) {
      return true;
    }
    return false;
  }

  /**
   * 处理位置输入
   */
  handleLocationInput(location: string): {
    success: boolean;
    message?: string;
  } {
    if (!location || location.trim().length === 0) {
      return {
        success: false,
        message: '位置不能为空，请输入有效的地址或地点名称',
      };
    }

    this.contextManager.updatePreference({ location: location.trim() });
    return {
      success: true,
      message: `已记录位置：${location.trim()}`,
    };
  }

  /**
   * 处理景点类型选择
   */
  handleTypeInput(choice: string): {
    success: boolean;
    type?: ParkType;
    message?: string;
  } {
    const typeMap: Record<string, ParkType> = {
      p: ParkType.PARK,
      park: ParkType.PARK,
      h: ParkType.HIKING,
      hiking: ParkType.HIKING,
      b: ParkType.BOTH,
      both: ParkType.BOTH,
    };

    const selectedType = typeMap[choice.toLowerCase().trim()];
    if (!selectedType) {
      return {
        success: false,
        message: '无效选择。请输入 P(公园)、H(爬山) 或 B(都可以)',
      };
    }

    this.contextManager.updatePreference({ parkType: selectedType });
    return {
      success: true,
      type: selectedType,
      message: `已选择：${this.getParkTypeLabel(selectedType)}`,
    };
  }

  /**
   * 处理距离选择
   */
  handleDistanceInput(choice: string): {
    success: boolean;
    distance?: number;
    message?: string;
  } {
    const distanceMap: Record<string, number> = {
      '1': DISTANCE_LEVELS.NEARBY.value,
      '2': DISTANCE_LEVELS.CLOSE.value,
      '3': DISTANCE_LEVELS.MEDIUM.value,
      '4': DISTANCE_LEVELS.FAR.value,
    };

    const maxDistance = distanceMap[choice.trim()];
    if (maxDistance === undefined) {
      return {
        success: false,
        message: '无效选择。请输入 1、2、3 或 4',
      };
    }

    this.contextManager.updatePreference({ maxDistance });
    const label = this.getDistanceLevelLabel(maxDistance);
    return {
      success: true,
      distance: maxDistance,
      message: `已选择距离：${label}`,
    };
  }

  /**
   * 处理难度等级选择
   */
  handleDifficultyInput(choice: string): {
    success: boolean;
    difficulty?: DifficultyLevel;
    message?: string;
  } {
    const difficultyMap: Record<string, DifficultyLevel> = {
      e: DifficultyLevel.EASY,
      easy: DifficultyLevel.EASY,
      m: DifficultyLevel.MEDIUM,
      medium: DifficultyLevel.MEDIUM,
      h: DifficultyLevel.HARD,
      hard: DifficultyLevel.HARD,
    };

    const selectedDifficulty = difficultyMap[choice.toLowerCase().trim()];
    if (!selectedDifficulty) {
      return {
        success: false,
        message: '无效选择。请输入 E(简单)、M(中等) 或 H(困难)',
      };
    }

    // 设置难度范围：简单 = [简单]，中等 = [简单-中等]，困难 = [任何]
    const difficultyRanges: Record<DifficultyLevel, { min: DifficultyLevel; max: DifficultyLevel }> =
      {
        [DifficultyLevel.EASY]: {
          min: DifficultyLevel.EASY,
          max: DifficultyLevel.EASY,
        },
        [DifficultyLevel.MEDIUM]: {
          min: DifficultyLevel.EASY,
          max: DifficultyLevel.MEDIUM,
        },
        [DifficultyLevel.HARD]: {
          min: DifficultyLevel.EASY,
          max: DifficultyLevel.HARD,
        },
      };

    const range = difficultyRanges[selectedDifficulty];
    this.contextManager.updatePreference({
      minDifficulty: range.min,
      maxDifficulty: range.max,
    });

    return {
      success: true,
      difficulty: selectedDifficulty,
      message: `已选择难度：${this.getDifficultyLabel(selectedDifficulty)}`,
    };
  }

  /**
   * 验证偏好是否完整
   */
  isPreferenceComplete(): boolean {
    const pref = this.contextManager.getPreference();
    return !!(pref.location && pref.parkType && pref.maxDistance !== undefined);
  }

  /**
   * 获取缺失的偏好字段
   */
  getMissingPreferenceFields(): string[] {
    const pref = this.contextManager.getPreference();
    const missing: string[] = [];

    if (!pref.location) missing.push('location');
    if (!pref.parkType) missing.push('parkType');
    if (pref.maxDistance === undefined) missing.push('maxDistance');

    return missing;
  }

  /**
   * 更新偏好完整度评分 (0-100)
   */
  private updatePreferenceCompleteness(): void {
    const pref = this.contextManager.getPreference();
    let completeness = 0;

    if (pref.location) completeness += 30;
    if (pref.parkType) completeness += 30;
    if (pref.maxDistance !== undefined) completeness += 20;
    if (pref.minDifficulty || pref.maxDifficulty) completeness += 10;
    if (pref.preferredTags && pref.preferredTags.length > 0) completeness += 10;

    this.preferenceCompleteness = Math.min(100, completeness);
  }

  /**
   * 获取偏好完整度
   */
  getPreferenceCompleteness(): number {
    this.updatePreferenceCompleteness();
    return this.preferenceCompleteness;
  }

  /**
   * 获取对话进度
   */
  getDialogueProgress(): {
    currentPhase: DialoguePhase;
    completeness: number;
    phaseLabel: string;
  } {
    return {
      currentPhase: this.currentPhase,
      completeness: this.getPreferenceCompleteness(),
      phaseLabel: this.getPhaseLabel(this.currentPhase),
    };
  }

  /**
   * 获取对话流程的文本表示
   */
  getFlowVisualization(): string {
    const phases = [
      DialoguePhase.GREETING,
      DialoguePhase.COLLECTING_LOCATION,
      DialoguePhase.COLLECTING_TYPE,
      DialoguePhase.COLLECTING_DISTANCE,
      DialoguePhase.COLLECTING_DIFFICULTY,
      DialoguePhase.QUERYING,
      DialoguePhase.RECOMMENDING,
    ];

    const visualization = phases
      .map((phase) => {
        const isCurrent = phase === this.currentPhase;
        const isVisited = this.visitedPhases.has(phase);
        const marker = isCurrent ? '●' : isVisited ? '✓' : '○';
        const label = this.getPhaseLabel(phase);
        return isCurrent ? `[${marker} ${label}]` : `${marker} ${label}`;
      })
      .join(' → ');

    return visualization;
  }

  // ===== 辅助方法 =====

  private getPhaseLabel(phase: DialoguePhase): string {
    const labels: Record<DialoguePhase, string> = {
      [DialoguePhase.GREETING]: '问候',
      [DialoguePhase.COLLECTING_LOCATION]: '位置',
      [DialoguePhase.COLLECTING_TYPE]: '类型',
      [DialoguePhase.COLLECTING_DISTANCE]: '距离',
      [DialoguePhase.COLLECTING_DIFFICULTY]: '难度',
      [DialoguePhase.QUERYING]: '查询',
      [DialoguePhase.RECOMMENDING]: '推荐',
      [DialoguePhase.COMPLETED]: '完成',
    };
    return labels[phase];
  }

  private getParkTypeLabel(type: ParkType): string {
    const labels: Record<ParkType, string> = {
      [ParkType.PARK]: '公园',
      [ParkType.HIKING]: '爬山',
      [ParkType.BOTH]: '都可以',
    };
    return labels[type];
  }

  private getDistanceLevelLabel(distance: number): string {
    if (distance <= DISTANCE_LEVELS.NEARBY.value) {
      return DISTANCE_LEVELS.NEARBY.name;
    } else if (distance <= DISTANCE_LEVELS.CLOSE.value) {
      return DISTANCE_LEVELS.CLOSE.name;
    } else if (distance <= DISTANCE_LEVELS.MEDIUM.value) {
      return DISTANCE_LEVELS.MEDIUM.name;
    }
    return DISTANCE_LEVELS.FAR.name;
  }

  private getDifficultyLabel(difficulty: DifficultyLevel): string {
    const labels: Record<DifficultyLevel, string> = {
      [DifficultyLevel.EASY]: '简单',
      [DifficultyLevel.MEDIUM]: '中等',
      [DifficultyLevel.HARD]: '困难',
    };
    return labels[difficulty];
  }
}
