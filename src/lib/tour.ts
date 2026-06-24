import type { City, Difficulty } from './types';

/** 每局各难度抽取题数（与 buildRound 组局规则保持单一真相源） */
export const PER_ROUND: Record<Difficulty, number> = {
  easy: 8,
  medium: 8,
  hard: 4,
};

/**
 * 一轮 = 让题库每个城市都至少出现一次所需的局数。
 *
 * 由于每局难度配比固定（8 易 + 8 中 + 4 难），覆盖所有城市的速度取决于
 * 最慢的难度桶，因此取各难度 ceil(该难度城市数 / 每局抽数) 的最大值，
 * 而非按总数 ceil(总城数 / 20)。
 *
 * 旧实现按总数计算会少算困难城（如 22 困难城 / 4 = 需 6 局，但 ceil(95/20)=5），
 * 导致用户打完 5 局就被提示"通关"、彩蛋却因仍差 2 个困难城未出现而不触发。
 */
export function totalTourRounds(cities: City[]): number {
  if (!cities || cities.length === 0) return 1;
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const c of cities) counts[c.difficulty]++;
  let rounds = 1;
  (Object.keys(PER_ROUND) as Difficulty[]).forEach((d) => {
    if (counts[d] > 0) {
      rounds = Math.max(rounds, Math.ceil(counts[d] / PER_ROUND[d]));
    }
  });
  return rounds;
}
