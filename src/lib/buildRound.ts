import { getContinent } from './continent';
import { getSeenMap, clearSeenIfExhausted } from './storage';
import type { City, GameQuestion, Difficulty } from './types';

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(
  correct: City,
  pool: City[],
  random: () => number
): [City, City, City] {
  const cont = getContinent(correct.country_en);
  const byCont = shuffle(
    pool.filter((c) => getContinent(c.country_en) === cont),
    random
  );
  const byDiff = shuffle(
    pool.filter((c) => c.difficulty === correct.difficulty),
    random
  );
  const byPool = shuffle([...pool], random);

  const out: City[] = [];
  const has = (c: City) => out.some((o) => o.id === c.id);
  for (const c of byCont) {
    if (!has(c) && out.length < 1) {
      out.push(c);
      break;
    }
  }
  for (const c of byDiff) {
    if (!has(c) && out.length < 2) {
      out.push(c);
    }
  }
  for (const c of byPool) {
    if (!has(c)) {
      out.push(c);
    }
    if (out.length === 3) break;
  }
  for (const c of byPool) {
    if (out.length === 3) break;
    if (!has(c)) out.push(c);
  }
  while (out.length < 3) {
    const c = byPool.find((x) => !out.some((o) => o.id === x.id));
    if (!c) break;
    out.push(c);
  }
  if (out.length < 3) {
    throw new Error('无法生成足够干扰项，请检查题库。');
  }
  return [out[0], out[1], out[2]];
}

function pickImageIndex(
  city: City,
  seen: Record<string, number[]>,
  random: () => number
): number {
  const n = city.images.length;
  const se = new Set(seen[city.id] || []);
  const avail: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!se.has(i)) avail.push(i);
  }
  if (avail.length > 0) {
    return avail[Math.floor(random() * avail.length)];
  }
  return Math.floor(random() * n);
}

function prioritySort(
  list: City[],
  seen: Record<string, number[]>,
  random: () => number
): City[] {
  const withP = list.map((c) => {
    const s = new Set(seen[c.id] || []);
    const p = c.images.length - s.size;
    return { c, p, t: random() };
  });
  withP.sort((a, b) => b.p - a.p || a.t - b.t);
  return withP.map((x) => x.c);
}

const NEED: Record<Difficulty, number> = {
  easy: 8,
  medium: 8,
  hard: 4,
};

export function buildGameRound(all: City[], random: () => number): GameQuestion[] {
  clearSeenIfExhausted(all);
  const seen = getSeenMap();

  const easyPool = prioritySort(
    all.filter((c) => c.difficulty === 'easy'),
    seen,
    random
  ).slice(0, NEED.easy);
  const medPool = prioritySort(
    all.filter((c) => c.difficulty === 'medium'),
    seen,
    random
  ).slice(0, NEED.medium);
  const hardPool = prioritySort(
    all.filter((c) => c.difficulty === 'hard'),
    seen,
    random
  ).slice(0, NEED.hard);

  if (easyPool.length < 8 || medPool.length < 8 || hardPool.length < 4) {
    throw new Error('题库城市数量或难度不足，无法组一局 20 题。');
  }

  const order = shuffle([...easyPool, ...medPool, ...hardPool], random);
  const roundIds = new Set(order.map((c) => c.id));
  const distractorPool = all.filter((c) => !roundIds.has(c.id));

  return order.map((city) => {
    const imageIndex = pickImageIndex(city, seen, random);
    const [a, b, c] = pickDistractors(city, distractorPool, random);
    const options = shuffle([city, a, b, c], random);
    return {
      city,
      imageIndex,
      optionCities: options,
      correctId: city.id,
    };
  });
}

export function scoreForAnswer(correct: boolean, swapsInQuestion: number): number {
  if (!correct) return 0;
  if (swapsInQuestion <= 0) return 10;
  if (swapsInQuestion === 1) return 6;
  return 3;
}
