import { DialoguePhase } from '@/config/constants';
import { createLogger } from '@/utils/logger';

const logger = createLogger('dialogue:state-machine');

/**
 * 对话状态转移映射
 */
const TRANSITIONS: Record<DialoguePhase, DialoguePhase[]> = {
  [DialoguePhase.GREETING]: [DialoguePhase.COLLECTING_LOCATION],
  [DialoguePhase.COLLECTING_LOCATION]: [DialoguePhase.COLLECTING_TYPE],
  [DialoguePhase.COLLECTING_TYPE]: [DialoguePhase.COLLECTING_DISTANCE],
  [DialoguePhase.COLLECTING_DISTANCE]: [DialoguePhase.COLLECTING_DIFFICULTY, DialoguePhase.QUERYING],
  [DialoguePhase.COLLECTING_DIFFICULTY]: [DialoguePhase.QUERYING],
  [DialoguePhase.QUERYING]: [DialoguePhase.RECOMMENDING],
  [DialoguePhase.RECOMMENDING]: [DialoguePhase.COMPLETED, DialoguePhase.COLLECTING_LOCATION],
  [DialoguePhase.COMPLETED]: [DialoguePhase.GREETING],
};

export class StateMachine {
  private currentState: DialoguePhase;

  constructor(initialState: DialoguePhase = DialoguePhase.GREETING) {
    this.currentState = initialState;
    logger.info('状态机创建', { initialState });
  }

  /**
   * 转移到新状态
   */
  transition(nextState: DialoguePhase): boolean {
    const allowedTransitions = TRANSITIONS[this.currentState];

    if (!allowedTransitions.includes(nextState)) {
      logger.warn('非法状态转移', {
        current: this.currentState,
        next: nextState,
        allowed: allowedTransitions,
      });
      return false;
    }

    const prevState = this.currentState;
    this.currentState = nextState;

    logger.info('状态转移', {
      from: prevState,
      to: nextState,
    });

    return true;
  }

  /**
   * 获取当前状态
   */
  getState(): DialoguePhase {
    return this.currentState;
  }

  /**
   * 检查是否可以转移到指定状态
   */
  canTransitionTo(nextState: DialoguePhase): boolean {
    return TRANSITIONS[this.currentState].includes(nextState);
  }

  /**
   * 获取允许的下一步状态列表
   */
  getAllowedNextStates(): DialoguePhase[] {
    return TRANSITIONS[this.currentState];
  }

  /**
   * 重置状态机
   */
  reset(): void {
    this.currentState = DialoguePhase.GREETING;
    logger.info('状态机重置');
  }
}
