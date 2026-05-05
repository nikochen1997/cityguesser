import type { SerializedQuestion } from './roundSerialize';

export interface WipState {
  version: 1;
  gameKey: number;
  /** 本局在整轮回合中的第几局（1..N） */
  tourRound: number;
  qIndex: number;
  serialized: SerializedQuestion[];
  score: number;
  correct: number;
  globalSwaps: number;
  localSwaps: number;
  imgOffset: number;
  startMs: number;
  pauseTotalMs: number;
  answered: boolean;
  picked: string | null;
  streak: number;
}
